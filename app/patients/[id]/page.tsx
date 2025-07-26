"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/custom/sidebar"
import { CaseDetailsSection } from "@/components/custom/case-details-section"
import { MediaUploadCard } from "@/components/custom/media-upload-card"
import { AiInsightsCard } from "@/components/custom/ai-insights-card"
import { FollowUpRemindersCard } from "@/components/custom/follow-up-reminders-card"
import { ArrowLeft, User, FileText, Upload, Bot, Calendar, Loader2 } from "lucide-react"
import Link from "next/link"
import { fetchWithoutCache } from "@/lib/utils/cache"

interface PatientDetailsPageProps {
  params: {
    id: string
  }
}

interface Patient {
  _id: string
  mrn: string
  name: string
  dob: string
  age: number
  sex: string
  primary_diagnosis: string
  secondary_diagnoses: string[]
  admission_date: string
  status: string
  current_location: string
  attending_physician: string
  resident_physician?: string
  procedures: Array<{
    name: string
    date: string
    surgeon: string
    notes?: string
  }>
  monitoring: {
    icp_monitor: boolean
    evd: boolean
    ventilator: boolean
    other_devices: string[]
  }
  emergency_contacts: Array<{
    name: string
    relationship: string
    phone: string
    is_primary: boolean
  }>
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    route: string
    started_date: string
  }>
}

interface ClinicalNote {
  _id: string
  encounter_date: string
  encounter_type: string
  encounter_location: string
  note_sections: Record<string, string>
  extracted_content: {
    symptoms: string[]
    vital_signs: Record<string, any>
    follow_up_items: Array<{
      item: string
      priority: string
      due_date?: string
    }>
  }
  status: string
  completeness_score: number
}

interface PatientResponse {
  patient: Patient
  clinicalNotes: ClinicalNote[]
  stats: {
    totalNotes: number
    recentNotes: number
    avgCompletenessScore: number
  }
}

export default function PatientDetailsPage({ params }: PatientDetailsPageProps) {
  const patientId = params.id
  const [activeTab, setActiveTab] = useState("overview")
  const [patientData, setPatientData] = useState<PatientResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPatientData()
  }, [patientId])

  const fetchPatientData = async () => {
    try {
      setLoading(true)
      const response = await fetchWithoutCache(`/api/patients/${patientId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch patient data')
      }
      const data: PatientResponse = await response.json()
      setPatientData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 md:ml-20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading patient data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !patientData) {
    return (
      <div className="relative flex min-h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 md:ml-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">Error loading patient</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <Button onClick={fetchPatientData} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { patient, clinicalNotes, stats } = patientData

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Follow-up': return 'bg-yellow-100 text-yellow-800'
      case 'Discharged': return 'bg-gray-100 text-gray-800'
      case 'Transferred': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Generate AI summary from clinical notes
  const generateAiSummary = () => {
    const recentNote = clinicalNotes[0]
    if (recentNote) {
      const symptoms = recentNote.extracted_content.symptoms.join(', ')
      return `${patient.name} (${patient.mrn}) with ${patient.primary_diagnosis}. Recent symptoms: ${symptoms}. Total clinical notes: ${stats.totalNotes}. Completeness: ${stats.avgCompletenessScore}%.`
    }
    return `${patient.name} (${patient.mrn}) with ${patient.primary_diagnosis}. Currently ${patient.status.toLowerCase()} at ${patient.current_location}.`
  }

  // Get clinical content from notes
  const getClinicalSummary = () => {
    const summaryNote = clinicalNotes.find(note => note.note_sections.subjective || note.note_sections.assessment_plan)
    return summaryNote?.note_sections.subjective || summaryNote?.note_sections.assessment_plan || 'No clinical summary available.'
  }

  const getIntraopDetails = () => {
    const procNote = clinicalNotes.find(note => note.encounter_type === 'procedure')
    return procNote?.note_sections.objective || procNote?.note_sections.assessment_plan || 'No intraoperative details available.'
  }

  // Generate reminders from follow-up items
  const generateReminders = () => {
    const reminders: Array<{id: string, type: string, description: string, dueDate: string}> = []
    
    clinicalNotes.forEach((note, index) => {
      note.extracted_content.follow_up_items.forEach((item, itemIndex) => {
        reminders.push({
          id: `${note._id}_${itemIndex}`,
          type: item.priority === 'high' ? 'Urgent' : 'Follow-up',
          description: item.item,
          dueDate: item.due_date || 'TBD'
        })
      })
    })
    
    return reminders
  }

  return (
    <div className="relative flex min-h-screen bg-secondary">
      <Sidebar />
      <div className="flex-1 md:ml-20 flex flex-col">
        <header className="flex items-center p-4 bg-primary text-white shadow-md sticky top-0 z-10">
          <div className="flex items-center flex-1 min-w-0">
            <div className="w-12 md:w-0 flex-shrink-0"></div>
            <Link href="/patients" passHref>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-primary/80 mr-3 flex-shrink-0"
                aria-label="Back to Patients List"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-bold truncate">
                {patient.name}
              </h1>
              <p className="text-sm opacity-90 truncate">{patient.mrn}</p>
            </div>
          </div>
        </header>

        {/* Patient Info Banner - Mobile Optimized */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-primary" />
                  <span className="font-medium text-primary">{patient.primary_diagnosis}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>Age: {patient.age}</span>
                  <span>Location: {patient.current_location}</span>
                  <span>Admitted: {new Date(patient.admission_date).toLocaleDateString()}</span>
                  <span>Attending: {patient.attending_physician}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(patient.status)} self-start sm:self-center`}>
                {patient.status}
              </span>
            </div>
          </div>
        </div>

        <main className="flex-1 p-4 pb-28 max-w-6xl mx-auto w-full">
          {/* Mobile Tabs */}
          <div className="block lg:hidden mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200">
                <TabsTrigger value="overview" className="text-xs py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <User className="h-3 w-3 mb-1" />
                  <span className="block">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="clinical" className="text-xs py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <FileText className="h-3 w-3 mb-1" />
                  <span className="block">Clinical</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="text-xs py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Upload className="h-3 w-3 mb-1" />
                  <span className="block">Media</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Bot className="h-3 w-3 mb-1" />
                  <span className="block">AI/Tasks</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <Card className="bg-white shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-primary">Patient Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-800">{generateAiSummary()}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="clinical" className="mt-6 space-y-6">
                <CaseDetailsSection
                  title="Clinical Summary"
                  content={getClinicalSummary()}
                  placeholder="No clinical summary available. Upload notes or transcribe a consult."
                />
                <CaseDetailsSection
                  title="Intraoperative Details"
                  content={getIntraopDetails()}
                  placeholder="No intraoperative details available. Upload notes or transcribe surgical debrief."
                />
              </TabsContent>

              <TabsContent value="media" className="mt-6 space-y-6">
                <MediaUploadCard title="Clinical Pictures" type="image" />
                <MediaUploadCard title="Intra-op Images/Videos" type="video" />
                <MediaUploadCard title="Brief Case Notes" type="text" />
              </TabsContent>

              <TabsContent value="ai" className="mt-6 space-y-6">
                <AiInsightsCard
                  missingFields={['Post-op imaging report', 'Discharge summary']}
                  structuredSynopsis={`**Patient:** ${patient.name}\n**MRN:** ${patient.mrn}\n**Diagnosis:** ${patient.primary_diagnosis}\n**Status:** ${patient.status}\n**Location:** ${patient.current_location}\n**Procedures:** ${patient.procedures.map(p => p.name).join(', ') || 'None'}\n**Clinical Notes:** ${stats.totalNotes}`}
                />
                <FollowUpRemindersCard reminders={generateReminders()} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-6">
            {/* Left Column: Overview, AI Insights, Reminders */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-primary">Patient Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-800">{generateAiSummary()}</p>
                </CardContent>
              </Card>

              <AiInsightsCard
                missingFields={['Post-op imaging report', 'Discharge summary']}
                structuredSynopsis={`**Patient:** ${patient.name}\n**MRN:** ${patient.mrn}\n**Diagnosis:** ${patient.primary_diagnosis}\n**Status:** ${patient.status}\n**Location:** ${patient.current_location}\n**Procedures:** ${patient.procedures.map(p => p.name).join(', ') || 'None'}\n**Clinical Notes:** ${stats.totalNotes}`}
              />

              <FollowUpRemindersCard reminders={generateReminders()} />
            </div>

            {/* Middle Column: Clinical Data Sections */}
            <div className="lg:col-span-1 space-y-6">
              <CaseDetailsSection
                title="Clinical Summary"
                content={getClinicalSummary()}
                placeholder="No clinical summary available. Upload notes or transcribe a consult."
              />
              <CaseDetailsSection
                title="Intraoperative Details"
                content={getIntraopDetails()}
                placeholder="No intraoperative details available. Upload notes or transcribe surgical debrief."
              />
            </div>

            {/* Right Column: Media Uploads */}
            <div className="lg:col-span-1 space-y-6">
              <MediaUploadCard title="Clinical Pictures" type="image" />
              <MediaUploadCard title="Intra-op Images/Videos" type="video" />
              <MediaUploadCard title="Brief Case Notes" type="text" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
