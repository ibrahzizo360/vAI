"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tag, Download, FileText, Calendar, Search, Filter, Loader2, Users, RefreshCw } from "lucide-react"
import { Sidebar } from "@/components/custom/sidebar"
import { ExportModal } from "@/components/custom/export-modal"
import { fetchWithoutCache } from "@/lib/utils/cache"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

const TRANSCRIPTS_PER_PAGE = 12

interface ClinicalNote {
  _id: string
  patient_id: string
  encounter_date: string
  encounter_type: string
  encounter_location: string
  note_sections: Record<string, string>
  status: string
  primary_provider: string
  attending_physician: string
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
    diagnoses_mentioned: string[]
    medications_mentioned?: string[]
    procedures_mentioned?: string[]
  }
  completeness_score: number
}

interface Patient {
  _id: string
  mrn: string
  name: string
  primary_diagnosis: string
}

interface ClinicalNotesResponse {
  notes: (ClinicalNote & { patient: Patient })[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [dateEndFilter, setDateEndFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [visibleTranscriptsCount, setVisibleTranscriptsCount] = useState(TRANSCRIPTS_PER_PAGE)
  const [allTranscripts, setAllTranscripts] = useState<(ClinicalNote & { patient: Patient })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportingNotes, setExportingNotes] = useState<(ClinicalNote & { patient: Patient })[]>([])

  useEffect(() => {
    fetchClinicalNotes()
  }, [])

  const fetchClinicalNotes = async () => {
    try {
      setLoading(true)
      const response = await fetchWithoutCache('/api/patients/*/notes')
      if (!response.ok) {
        throw new Error('Failed to fetch clinical notes')
      }
      const data: ClinicalNotesResponse = await response.json()
      setAllTranscripts(data.notes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clinical notes')
    } finally {
      setLoading(false)
    }
  }

  const filteredTranscripts = allTranscripts.filter(transcript => {
    const matchesSearch = transcript.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transcript.patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transcript.patient.primary_diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transcript.raw_transcript && transcript.raw_transcript.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         transcript.extracted_content.symptoms.some(symptom => symptom.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         transcript.extracted_content.diagnoses_mentioned.some(diagnosis => diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
    
    let matchesDate = true
    if (dateFilter) {
      const noteDate = new Date(transcript.encounter_date)
      const startDate = new Date(dateFilter)
      const endDate = dateEndFilter ? new Date(dateEndFilter) : startDate
      matchesDate = noteDate >= startDate && noteDate <= endDate
    }
    
    const matchesType = typeFilter === "all" || transcript.encounter_type === typeFilter
    return matchesSearch && matchesDate && matchesType
  })

  const loadMoreTranscripts = () => {
    setVisibleTranscriptsCount((prevCount) => prevCount + TRANSCRIPTS_PER_PAGE)
  }

  const getContextColor = (context: string) => {
    const colors = {
      "rounds": "bg-blue-100 text-blue-800",
      "consult": "bg-green-100 text-green-800", 
      "family_meeting": "bg-purple-100 text-purple-800",
      "procedure": "bg-orange-100 text-orange-800",
      "discharge": "bg-gray-100 text-gray-800",
      "emergency": "bg-red-100 text-red-800"
    }
    return colors[context as keyof typeof colors] || "bg-gray-100 text-gray-800"
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

  const generateSummary = (note: ClinicalNote & { patient: Patient }) => {
    if (note.note_sections.assessment_plan) {
      return note.note_sections.assessment_plan.substring(0, 150) + '...'
    } else if (note.note_sections.subjective) {
      return note.note_sections.subjective.substring(0, 150) + '...'
    } else if (note.raw_transcript) {
      return note.raw_transcript.substring(0, 150) + '...'
    }
    
    const symptoms = note.extracted_content.symptoms.join(', ')
    const diagnoses = note.extracted_content.diagnoses_mentioned.join(', ')
    if (symptoms) {
      return `Symptoms: ${symptoms}. Diagnoses: ${diagnoses}.`.substring(0, 150) + '...'
    }
    
    return `${formatEncounterType(note.encounter_type)} for ${note.patient.primary_diagnosis}`
  }

  const handleSelectNote = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    )
  }

  const handleSelectAll = () => {
    if (selectedNotes.length === filteredTranscripts.length) {
      setSelectedNotes([])
    } else {
      setSelectedNotes(filteredTranscripts.map(note => note._id))
    }
  }

  const handleSingleExport = (note: ClinicalNote & { patient: Patient }) => {
    setExportingNotes([note])
    setShowExportModal(true)
  }

  const handleBulkExport = () => {
    const notesToExport = filteredTranscripts.filter(note => selectedNotes.includes(note._id))
    setExportingNotes(notesToExport)
    setShowExportModal(true)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setDateFilter("")
    setDateEndFilter("")
    setTypeFilter("all")
    toast.success("Filters cleared")
  }

  const refreshData = async () => {
    toast.loading("Refreshing data...")
    await fetchClinicalNotes()
    toast.dismiss()
    toast.success("Data refreshed")
  }

  return (
    <div className="relative flex min-h-screen bg-secondary">
      <Sidebar />
      <div className="flex-1 md:ml-20 flex flex-col pb-24 md:pb-0">
        <header className="flex items-center justify-between p-3 md:p-4 bg-primary text-white shadow-md sticky top-0 z-10">
          <div className="flex items-center gap-2 md:gap-4">
            <h1 className="text-lg md:text-xl font-bold">Transcript History</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm opacity-90">
            {selectedNotes.length > 0 && (
              <span>{selectedNotes.length} selected</span>
            )}
            <span>{filteredTranscripts.length} notes</span>
          </div>
        </header>

        <main className="flex-1 p-4 pb-28">
          <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-2">Browse & Export</h2>
              <p className="text-gray-600 text-base md:text-lg">Filter and manage your past transcriptions.</p>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by patient name, MRN, diagnosis, or transcript content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 border rounded-lg focus:ring-primary focus:border-primary"
                  aria-label="Search clinical notes"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-primary text-primary hover:bg-primary/5 px-4 py-3"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                {selectedNotes.length > 0 && (
                  <Button
                    onClick={handleBulkExport}
                    className="bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 whitespace-nowrap"
                    aria-label="Export selected notes"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export ({selectedNotes.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedNotes.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedNotes.length === filteredTranscripts.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedNotes.length} of {filteredTranscripts.length} notes selected
                  </span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button size="sm" variant="outline" onClick={() => setSelectedNotes([])} className="flex-1 sm:flex-none">
                    Clear
                  </Button>
                  <Button size="sm" onClick={handleBulkExport} className="flex-1 sm:flex-none">
                    <Download className="h-4 w-4 mr-1" />
                    Export ({selectedNotes.length})
                  </Button>
                </div>
              </div>
            )}

            {/* Expanded Filters */}
            {showFilters && (
              <Card className="bg-white shadow-sm border border-gray-200 mb-6">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Start Date</label>
                      <div className="relative">
                        <Input 
                          type="date" 
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          className="pl-10 pr-4 py-2 w-full" 
                          aria-label="Filter start date" 
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">End Date</label>
                      <div className="relative">
                        <Input 
                          type="date" 
                          value={dateEndFilter}
                          onChange={(e) => setDateEndFilter(e.target.value)}
                          className="pl-10 pr-4 py-2 w-full" 
                          aria-label="Filter end date" 
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Encounter Type</label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Filter by Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="rounds">Ward Round</SelectItem>
                          <SelectItem value="consult">Consult</SelectItem>
                          <SelectItem value="family_meeting">Family Meeting</SelectItem>
                          <SelectItem value="procedure">Procedure</SelectItem>
                          <SelectItem value="discharge">Discharge</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-600">
                      {dateFilter && (
                        <span>
                          Showing notes from {new Date(dateFilter).toLocaleDateString()}
                          {dateEndFilter && ` to ${new Date(dateEndFilter).toLocaleDateString()}`}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="text-sm"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="bg-white border border-gray-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-2 flex-1">
                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mt-1"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded animate-pulse w-20 mb-1"></div>
                              <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-12"></div>
                          </div>
                        </div>
                        <div className="flex gap-1 mb-3">
                          <div className="h-5 bg-gray-200 rounded animate-pulse w-16"></div>
                          <div className="h-5 bg-gray-200 rounded animate-pulse w-20"></div>
                        </div>
                        <div className="space-y-2 mb-3">
                          <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                          <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <div className="text-red-600 mb-2">Error loading clinical notes</div>
                <p className="text-gray-500 text-sm mb-4">{error}</p>
                <Button onClick={fetchClinicalNotes} variant="outline">
                  Try Again
                </Button>
              </div>
            )}

            {/* Transcript Cards */}
            {!loading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTranscripts.slice(0, visibleTranscriptsCount).map((transcript) => (
                  <Card key={transcript._id} className={`bg-white border shadow-sm hover:shadow-md transition-shadow ${
                    selectedNotes.includes(transcript._id) ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedNotes.includes(transcript._id)}
                            onCheckedChange={() => handleSelectNote(transcript._id)}
                            className="mt-1 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-primary text-sm sm:text-base truncate">{transcript.patient.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{transcript.patient.mrn}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(transcript.encounter_date).toLocaleDateString()}
                              {transcript.audio_metadata?.duration_seconds && (
                                <span className="ml-2 hidden sm:inline">
                                  • {Math.floor(transcript.audio_metadata.duration_seconds / 60)}:{String(transcript.audio_metadata.duration_seconds % 60).padStart(2, '0')}
                                </span>
                              )}
                            </p>
                            {/* Show duration on mobile as a separate line */}
                            {transcript.audio_metadata?.duration_seconds && (
                              <p className="text-xs text-gray-500 mt-1 sm:hidden">
                                Duration: {Math.floor(transcript.audio_metadata.duration_seconds / 60)}:{String(transcript.audio_metadata.duration_seconds % 60).padStart(2, '0')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getContextColor(transcript.encounter_type)}`}>
                            {formatEncounterType(transcript.encounter_type)}
                          </span>
                          <div className="text-xs text-gray-500 text-center">
                            {transcript.completeness_score}% done
                            {transcript.ai_analysis_metadata?.analysis_confidence && (
                              <div className="text-xs text-blue-600 mt-1">
                                AI: {Math.round(transcript.ai_analysis_metadata.analysis_confidence * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Clinical Findings */}
                      {(transcript.extracted_content.symptoms.length > 0 || transcript.extracted_content.diagnoses_mentioned.length > 0) && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {transcript.extracted_content.symptoms.slice(0, 2).map((symptom, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {symptom}
                              </Badge>
                            ))}
                            {transcript.extracted_content.diagnoses_mentioned.slice(0, 2).map((diagnosis, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {diagnosis}
                              </Badge>
                            ))}
                            {(transcript.extracted_content.symptoms.length + transcript.extracted_content.diagnoses_mentioned.length) > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(transcript.extracted_content.symptoms.length + transcript.extracted_content.diagnoses_mentioned.length) - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-1">
                          {transcript.encounter_location} • {transcript.attending_physician}
                        </p>
                        {transcript.audio_metadata?.transcription_provider && (
                          <p className="text-xs text-gray-500">
                            Transcribed by {transcript.audio_metadata.transcription_provider}
                            {transcript.audio_metadata.transcription_confidence && 
                              ` (${Math.round(transcript.audio_metadata.transcription_confidence * 100)}% confidence)`
                            }
                          </p>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-2 mb-3">{generateSummary(transcript)}</p>
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <Link href={`/patients/${transcript.patient._id}`} passHref>
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary hover:underline text-sm font-medium"
                            aria-label={`View case for ${transcript.patient.name}`}
                          >
                            View Patient <FileText className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSingleExport(transcript)}
                          className="text-xs self-end sm:self-auto"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Load More Button */}
            {visibleTranscriptsCount < filteredTranscripts.length && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={loadMoreTranscripts}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5 px-6 py-3"
                  aria-label="Load more transcripts"
                >
                  Load More ({filteredTranscripts.length - visibleTranscriptsCount} remaining)
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredTranscripts.length === 0 && allTranscripts.length > 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No clinical notes found</p>
                <p className="text-gray-500 text-sm">Try adjusting your search terms or filters</p>
              </div>
            )}

            {/* No Data State */}
            {!loading && !error && allTranscripts.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No clinical notes available</p>
                <p className="text-gray-500 text-sm">Clinical notes will appear here once created</p>
              </div>
            )}

            {/* Quick Export All */}
            {filteredTranscripts.length > 0 && selectedNotes.length === 0 && (
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-primary">Export All Visible</h3>
                      <p className="text-sm text-gray-600">Export all {filteredTranscripts.length} filtered clinical notes</p>
                    </div>
                    <Button
                      onClick={() => {
                        setExportingNotes(filteredTranscripts)
                        setShowExportModal(true)
                      }}
                      className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
                      aria-label="Export all filtered transcripts"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export All ({filteredTranscripts.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false)
          setExportingNotes([])
        }}
        notes={exportingNotes}
        title={exportingNotes.length === 1 ? "Export Clinical Note" : `Export ${exportingNotes.length} Clinical Notes`}
      />
    </div>
  )
}
