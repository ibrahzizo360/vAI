"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/custom/sidebar"
import { MedicalSyntaxHighlighter } from "@/components/custom/medical-syntax-highlighter"
import { 
  ArrowLeft, User, FileText, Calendar, Clock, Bot, Download, 
  Printer, Clipboard, AlertCircle, ChevronDown, Loader2, RefreshCw, Edit, MessageSquare 
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { fetchWithoutCache } from "@/lib/utils/cache"
import { EditNoteModal } from "@/components/custom/edit-note-modal"

interface ClinicalNotePageProps {
  params: {
    id: string
    noteId: string
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
  admission_date: string
  status: string
  current_location: string
  attending_physician: string
}

interface ClinicalNote {
  _id: string
  encounter_date: string
  encounter_type: string
  encounter_location: string
  note_sections: Record<string, string>
  raw_transcript?: string
  audio_metadata?: {
    duration_seconds?: number
    transcription_provider?: string
    transcription_confidence?: number
  }
  ai_analysis_metadata?: {
    analysis_confidence?: number
    model_used?: string
  }
  extracted_content: {
    symptoms: string[]
    vital_signs: Record<string, any>
    medications_mentioned?: string[]
    procedures_mentioned?: string[]
    diagnoses_mentioned?: string[]
    follow_up_items: Array<{
      item: string
      priority: string
      due_date?: string
    }>
  }
  status: string
  primary_provider: string
  attending_physician: string
  completeness_score: number
  created_at: string
  updated_at: string
}

export default function ClinicalNotePage({ params }: ClinicalNotePageProps) {
  const { id: patientId, noteId } = params
  const [patient, setPatient] = useState<Patient | null>(null)
  const [note, setNote] = useState<ClinicalNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [patientId, noteId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      await Promise.all([fetchPatientData(), fetchNoteData()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const fetchPatientData = async () => {
    const response = await fetchWithoutCache(`/api/patients/${patientId}`)
    if (!response.ok) throw new Error('Failed to fetch patient data')
    const data = await response.json()
    setPatient(data.patient)
  }

  const fetchNoteData = async () => {
    const response = await fetchWithoutCache(`/api/patients/${patientId}/notes/${noteId}`)
    if (!response.ok) throw new Error('Failed to fetch note data')
    const data = await response.json()
    setNote(data.note)
  }

  const refreshData = () => {
    setIsRefreshing(true)
    fetchData()
  }

  const formatEncounterType = (type: string) => {
    const typeMap: Record<string, string> = {
      "rounds": "Ward Round",
      "consult": "Consult",
      "family_meeting": "Family Meeting", 
      "procedure": "Procedure",
      "discharge": "Discharge",
      "emergency": "Emergency"
    }
    return typeMap[type] || type
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { className: string, label: string }> = {
      'complete': { className: 'bg-green-100 text-green-800', label: 'Complete' },
      'review': { className: 'bg-yellow-100 text-yellow-800', label: 'Under Review' },
      'draft': { className: 'bg-gray-100 text-gray-800', label: 'Draft' },
      'signed': { className: 'bg-blue-100 text-blue-800', label: 'Signed' }
    }
    return statusMap[status] || { className: 'bg-gray-100 text-gray-800', label: status }
  }

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { className: string, label: string }> = {
      'high': { className: 'bg-red-100 text-red-800', label: 'High' },
      'medium': { className: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      'low': { className: 'bg-green-100 text-green-800', label: 'Low' }
    }
    return priorityMap[priority] || { className: 'bg-gray-100 text-gray-800', label: priority }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const printNote = () => {
    window.print()
  }

  const exportNote = async () => {
    if (!note || !patient) return
    
    try {
      const noteWithPatient = {
        note,
        patient
      }
      
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: [noteWithPatient],
          export_options: {
            format: 'text',
            include_metadata: true,
            include_timestamps: true,
            patient_identifiers: true
          }
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Convert base64 to blob and download
        const binaryString = atob(result.content)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const blob = new Blob([bytes], { type: result.export_info.mime_type })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = result.export_info.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success('Note exported successfully!')
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export note')
    }
  }

  if (loading && (!patient || !note)) {
    return (
      <div className="relative flex min-h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 md:ml-20 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
            <p className="text-gray-600">Loading clinical note...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !patient || !note) {
    return (
      <div className="relative flex min-h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 md:ml-20 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load note</h3>
            <p className="text-gray-500 text-sm mb-6">{error || 'Unknown error occurred'}</p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={refreshData} 
                variant="outline"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Retry
              </Button>
              <Link href={`/patients/${patientId}/notes`}>
                <Button variant="ghost">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Notes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 pb-20 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <Link href={`/patients/${patientId}/notes`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to All Notes
                  </Button>
                </Link>
                <Badge className={getStatusBadge(note.status).className}>
                  {getStatusBadge(note.status).label}
                </Badge>
                {note.ai_analysis_metadata && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    <Bot className="h-3 w-3 mr-1" />
                    AI Enhanced
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {formatEncounterType(note.encounter_type)} Note
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{patient.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>MRN: {patient.mrn}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(note.encounter_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{note.encounter_location}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href={`/patients/${patientId}/chat`}>
                <Button variant="outline" className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  AI Chat
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Note
              </Button>
              <Button variant="outline" onClick={printNote}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={() => copyToClipboard(JSON.stringify(note.note_sections, null, 2))}>
                <Clipboard className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button onClick={exportNote}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">          
          
          {/* Left Column - Note Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="structured" className="w-full">
              <TabsList>
                <TabsTrigger value="structured">Structured Note</TabsTrigger>
                <TabsTrigger value="raw">Raw Transcript</TabsTrigger>
              </TabsList>
              
              <TabsContent value="structured" className="space-y-4">
                {note.note_sections.subjective && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Subjective</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <MedicalSyntaxHighlighter text={note.note_sections.subjective} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {note.note_sections.objective && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Objective</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <MedicalSyntaxHighlighter text={note.note_sections.objective} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {note.note_sections.assessment_plan && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Assessment & Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <MedicalSyntaxHighlighter text={note.note_sections.assessment_plan} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="raw">
                {note.raw_transcript ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Raw Transcript</CardTitle>
                      <CardDescription>
                        Original audio transcription before AI processing
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm leading-relaxed text-gray-700">
                          {note.raw_transcript}
                        </p>
                      </div>
                      {note.audio_metadata && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium mb-2">Audio Metadata</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {note.audio_metadata.duration_seconds && (
                              <div>
                                <span className="text-gray-500">Duration:</span>
                                <span className="ml-2">{Math.round(note.audio_metadata.duration_seconds)}s</span>
                              </div>
                            )}
                            {note.audio_metadata.transcription_provider && (
                              <div>
                                <span className="text-gray-500">Provider:</span>
                                <span className="ml-2">{note.audio_metadata.transcription_provider}</span>
                              </div>
                            )}
                            {note.audio_metadata.transcription_confidence && (
                              <div>
                                <span className="text-gray-500">Confidence:</span>
                                <span className="ml-2">{Math.round(note.audio_metadata.transcription_confidence * 100)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      No raw transcript available for this note.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Metadata and Extracted Data */}
          <div className="space-y-6">
            {/* Note Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Note Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Encounter Type</p>
                  <p className="font-medium">{formatEncounterType(note.encounter_type)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium">{formatDate(note.encounter_date)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Attending Physician</p>
                  <p className="font-medium">Dr. {note.attending_physician}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Completeness Score</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          note.completeness_score >= 80 ? 'bg-green-500' :
                          note.completeness_score >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${note.completeness_score}%` }}
                      />
                    </div>
                    <span className="font-medium text-sm">{note.completeness_score}%</span>
                  </div>
                </div>

                {note.updated_at && (
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-medium">{formatDate(note.updated_at)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vital Signs */}
            {note.extracted_content.vital_signs && Object.keys(note.extracted_content.vital_signs).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Vital Signs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(note.extracted_content.vital_signs).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="font-medium">
                          {typeof value === 'object' ? JSON.stringify(value) : value}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Follow-up Items */}
            {note.extracted_content.follow_up_items?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Follow-up Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {note.extracted_content.follow_up_items.map((item, idx) => {
                      const priorityBadge = getPriorityBadge(item.priority)
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`mt-1.5 w-2 h-2 rounded-full ${priorityBadge.className.replace('bg-', 'bg-opacity-80 bg-')}`} />
                          <div className="flex-1">
                            <p className="font-medium">{item.item}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <Badge variant="outline" className={priorityBadge.className}>
                                {priorityBadge.label} priority
                              </Badge>
                              {item.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(item.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Edit Note Modal */}
      <EditNoteModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        note={note}
        patientId={patientId}
        onNoteUpdated={fetchData}
      />
    </div>
  )
}