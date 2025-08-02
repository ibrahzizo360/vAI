"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sidebar } from "@/components/custom/sidebar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, FileText, Calendar, Clock, Bot, Search, Filter, Download, Eye, ChevronDown, TrendingUp } from "lucide-react"
import Link from "next/link"
import { fetchWithoutCache } from "@/lib/utils/cache"

interface ClinicalNotesPageProps {
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
}

interface NotesResponse {
  notes: ClinicalNote[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function ClinicalNotesPage({ params }: ClinicalNotesPageProps) {
  const patientId = params.id
  const [patient, setPatient] = useState<Patient | null>(null)
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [selectedNote, setSelectedNote] = useState<ClinicalNote | null>(null)

  useEffect(() => {
    fetchPatientData()
    fetchNotes()
  }, [patientId])

  const fetchPatientData = async () => {
    try {
      const response = await fetchWithoutCache(`/api/patients/${patientId}`)
      if (!response.ok) throw new Error('Failed to fetch patient data')
      const data = await response.json()
      setPatient(data.patient)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient')
    }
  }

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await fetchWithoutCache(`/api/patients/${patientId}/notes?limit=50`)
      if (!response.ok) throw new Error('Failed to fetch notes')
      const data: NotesResponse = await response.json()
      setNotes(data.notes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  const formatEncounterType = (type: string) => {
    const formatted = {
      "rounds": "Ward Round",
      "consult": "Consult",
      "family_meeting": "Family Meeting", 
      "procedure": "Procedure",
      "discharge": "Discharge",
      "emergency": "Emergency"
    }
    return formatted[type as keyof typeof formatted] || type
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'signed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCompletenessColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchTerm || 
      note.note_sections.subjective?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.note_sections.assessment_plan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.encounter_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || note.encounter_type === filterType
    
    return matchesSearch && matchesFilter
  })

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.encounter_date).getTime() - new Date(a.encounter_date).getTime()
      case 'completeness':
        return b.completeness_score - a.completeness_score
      case 'type':
        return a.encounter_type.localeCompare(b.encounter_type)
      default:
        return 0
    }
  })

  if (loading && !patient) {
    return (
      <div className="relative flex min-h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 md:ml-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Loading clinical notes...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="relative flex min-h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 md:ml-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">Error loading data</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <Button onClick={() => { fetchPatientData(); fetchNotes(); }} variant="outline">
              Try Again
            </Button>
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
                <Link href={`/patients/${patientId}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Patient Details
                  </Button>
                </Link>
                <Badge className={`bg-${patient.status === 'Active' ? 'green' : 'gray'}-100 text-${patient.status === 'Active' ? 'green' : 'gray'}-800`}>
                  {patient.status}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Clinical Notes</h1>
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
                  <span>{patient.primary_diagnosis}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Notes</p>
                  <p className="text-2xl font-bold">{notes.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Completeness</p>
                  <p className="text-2xl font-bold">
                    {notes.length > 0 ? Math.round(notes.reduce((sum, note) => sum + note.completeness_score, 0) / notes.length) : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Recent Notes</p>
                  <p className="text-2xl font-bold">
                    {notes.filter(note => 
                      new Date(note.encounter_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Enhanced</p>
                  <p className="text-2xl font-bold">
                    {notes.filter(note => note.ai_analysis_metadata).length}
                  </p>
                </div>
                <Bot className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="rounds">Ward Rounds</SelectItem>
                    <SelectItem value="consult">Consults</SelectItem>
                    <SelectItem value="family_meeting">Family Meetings</SelectItem>
                    <SelectItem value="procedure">Procedures</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <ChevronDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="completeness">By Completeness</SelectItem>
                    <SelectItem value="type">By Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">Loading notes...</p>
              </CardContent>
            </Card>
          ) : sortedNotes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No clinical notes found</p>
                <p className="text-gray-400 text-sm">
                  {notes.length === 0 ? "No notes have been created for this patient yet." : "Try adjusting your search or filter criteria."}
                </p>
              </CardContent>
            </Card>
          ) : (
            sortedNotes.map((note) => (
              <Card key={note._id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {formatEncounterType(note.encounter_type)}
                        </h3>
                        <Badge className={getStatusColor(note.status)}>
                          {note.status}
                        </Badge>
                        {note.ai_analysis_metadata && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            <Bot className="h-3 w-3 mr-1" />
                            AI Enhanced
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(note.encounter_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{note.encounter_location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>Dr. {note.attending_physician}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Completeness</p>
                        <p className={`text-lg font-bold ${getCompletenessColor(note.completeness_score)}`}>
                          {note.completeness_score}%
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Note Preview */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {note.note_sections.assessment_plan?.substring(0, 300) ||
                       note.note_sections.subjective?.substring(0, 300) ||
                       'No content preview available'}
                      {((note.note_sections.assessment_plan?.length || 0) > 300 || 
                        (note.note_sections.subjective?.length || 0) > 300) && '...'}
                    </p>
                  </div>

                  {/* Follow-up Items */}
                  {note.extracted_content.follow_up_items && note.extracted_content.follow_up_items.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Follow-up Items:</p>
                      <div className="flex flex-wrap gap-2">
                        {note.extracted_content.follow_up_items.slice(0, 3).map((item, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className={`text-xs ${
                              item.priority === 'high' ? 'border-red-300 text-red-700' :
                              item.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                              'border-gray-300 text-gray-700'
                            }`}
                          >
                            {item.item}
                          </Badge>
                        ))}
                        {note.extracted_content.follow_up_items.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{note.extracted_content.follow_up_items.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}