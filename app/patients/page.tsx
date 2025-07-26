"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/custom/sidebar"
import { UserPlus, Search, FileText, Filter, Users, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { fetchWithoutCache } from "@/lib/utils/cache"

interface Patient {
  _id: string
  mrn: string
  name: string
  admission_date: string
  status: string
  primary_diagnosis: string
  current_location: string
  attending_physician: string
}

interface PatientsResponse {
  patients: Patient[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  filters: {
    locations: string[]
    attending_physicians: string[]
    diagnoses: string[]
  }
}

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PatientsResponse['filters'] | null>(null)

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const response = await fetchWithoutCache('/api/patients')
      if (!response.ok) {
        throw new Error('Failed to fetch patients')
      }
      const data: PatientsResponse = await response.json()
      setPatients(data.patients)
      setFilters(data.filters)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.primary_diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Follow-up': return 'bg-yellow-100 text-yellow-800'
      case 'Discharged': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="relative flex min-h-screen bg-secondary">
      <Sidebar />
      <div className="flex-1 md:ml-20 flex flex-col">
        <header className="flex items-center justify-between p-4 bg-primary text-white shadow-md sticky top-0 z-10">
          <h1 className="text-xl font-bold ml-12 md:ml-0">Patients</h1>
          <span className="text-sm opacity-90">{filteredPatients.length} patients</span>
        </header>
        <main className="flex-1 p-4 pb-28">
          <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-2">Patient Directory</h2>
              <p className="text-gray-600 text-base md:text-lg">Manage and view patient records.</p>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Input
                  placeholder="Search patients by MRN, name, or diagnosis"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 border rounded-lg focus:ring-primary focus:border-primary"
                  aria-label="Search patients"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-primary text-primary hover:bg-primary/5 px-4 py-3"
                  aria-label="Toggle filters"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <Button
                  className="bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 whitespace-nowrap"
                  aria-label="Add new patient"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Patient
                </Button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && filters && (
              <Card className="bg-white shadow-sm border border-gray-200 mb-6">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Status</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm">All Status</Button>
                        <Button variant="outline" size="sm">Active</Button>
                        <Button variant="outline" size="sm">Discharged</Button>
                        <Button variant="outline" size="sm">Transferred</Button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Location</h4>
                      <div className="flex flex-wrap gap-2">
                        {filters.locations.map((location) => (
                          <Button key={location} variant="outline" size="sm">{location}</Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-600">Loading patients...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <div className="text-red-600 mb-2">Error loading patients</div>
                <p className="text-gray-500 text-sm mb-4">{error}</p>
                <Button onClick={fetchPatients} variant="outline">
                  Try Again
                </Button>
              </div>
            )}

            {/* Patient Cards */}
            {!loading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPatients.map((patient) => (
                  <Card key={patient._id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-primary text-base truncate">{patient.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{patient.mrn}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                          {patient.status}
                        </span>
                      </div>
                      <div className="space-y-1 mb-3">
                        <p className="text-sm text-gray-700 truncate">{patient.primary_diagnosis}</p>
                        <p className="text-xs text-gray-600">{patient.current_location}</p>
                        <p className="text-xs text-gray-500">
                          Admitted: {new Date(patient.admission_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Link href={`/patients/${patient._id}`} passHref>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-primary hover:underline text-sm font-medium w-full justify-start"
                          aria-label={`View details for ${patient.name}`}
                        >
                          View Details <FileText className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredPatients.length === 0 && patients.length > 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No patients found</p>
                <p className="text-gray-500 text-sm">Try adjusting your search terms or filters</p>
              </div>
            )}

            {/* No Data State */}
            {!loading && !error && patients.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No patients in database</p>
                <p className="text-gray-500 text-sm mb-4">Get started by adding your first patient</p>
                <Button className="bg-primary text-white">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Patient
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
