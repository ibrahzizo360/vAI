"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tag, Download, FileText, Calendar, Search, Filter, Loader2, Users } from "lucide-react"
import { Sidebar } from "@/components/custom/sidebar"
import { fetchWithoutCache } from "@/lib/utils/cache"

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
  extracted_content: {
    symptoms: string[]
    diagnoses_mentioned: string[]
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
  const [typeFilter, setTypeFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [visibleTranscriptsCount, setVisibleTranscriptsCount] = useState(TRANSCRIPTS_PER_PAGE)
  const [allTranscripts, setAllTranscripts] = useState<(ClinicalNote & { patient: Patient })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
                         transcript.patient.primary_diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDate = !dateFilter || transcript.encounter_date.startsWith(dateFilter)
    const matchesType = typeFilter === "all" || transcript.encounter_type.toLowerCase().replace(/\s+/g, '-') === typeFilter
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
    const symptoms = note.extracted_content.symptoms.join(', ')
    const diagnoses = note.extracted_content.diagnoses_mentioned.join(', ')
    
    if (note.note_sections.assessment_plan) {
      return note.note_sections.assessment_plan.substring(0, 150) + '...'
    } else if (note.note_sections.subjective) {
      return note.note_sections.subjective.substring(0, 150) + '...'
    } else if (symptoms) {
      return `Symptoms: ${symptoms}. Diagnoses: ${diagnoses}.`
    }
    
    return `${formatEncounterType(note.encounter_type)} for ${note.patient.primary_diagnosis}`
  }

  return (
    <div className="relative flex min-h-screen bg-secondary">
      <Sidebar />
      <div className="flex-1 md:ml-20 flex flex-col">
        <header className="flex items-center justify-between p-4 bg-primary text-white shadow-md sticky top-0 z-10">
          <h1 className="text-xl font-bold ml-12 md:ml-0">Transcript History</h1>
          <span className="text-sm opacity-90">{filteredTranscripts.length} transcripts</span>
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
                  placeholder="Search Patient ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 border rounded-lg focus:ring-primary focus:border-primary"
                  aria-label="Search transcripts"
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
                <Button
                  className="bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 whitespace-nowrap"
                  aria-label="Export transcripts"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <Card className="bg-white shadow-sm border border-gray-200 mb-6">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input 
                        type="date" 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full" 
                        aria-label="Filter by date" 
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter by Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="ward-round">Ward Round</SelectItem>
                        <SelectItem value="consult">Consult</SelectItem>
                        <SelectItem value="family-meeting">Family Meeting</SelectItem>
                        <SelectItem value="surgery-prep">Surgery Prep</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("")
                        setDateFilter("")
                        setTypeFilter("all")
                      }}
                      className="text-sm"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-600">Loading clinical notes...</span>
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
                  <Card key={transcript._id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-primary text-base truncate">{transcript.patient.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{transcript.patient.mrn}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(transcript.encounter_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getContextColor(transcript.encounter_type)}`}>
                            {formatEncounterType(transcript.encounter_type)}
                          </span>
                          <span className="text-xs text-gray-500 text-center">
                            {transcript.completeness_score}% complete
                          </span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-1">
                          {transcript.encounter_location} • {transcript.attending_physician}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 mb-3">{generateSummary(transcript)}</p>
                      <Link href={`/patients/${transcript.patient._id}`} passHref>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-primary hover:underline text-sm font-medium w-full justify-start"
                          aria-label={`View case for ${transcript.patient.name}`}
                        >
                          View Patient <FileText className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
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

            {/* Bulk Export */}
            {filteredTranscripts.length > 0 && (
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-primary">Bulk Export</h3>
                      <p className="text-sm text-gray-600">Export all filtered transcripts as ZIP or PDF</p>
                    </div>
                    <Button
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
    </div>
  )
}
