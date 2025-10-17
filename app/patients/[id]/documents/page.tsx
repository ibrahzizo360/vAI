"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/custom/sidebar"
import { PatientMediaGallery } from "@/components/custom/patient-media-gallery"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, FileText, Upload, Calendar } from "lucide-react"
import Link from "next/link"
import { fetchWithoutCache } from "@/lib/utils/cache"

interface PatientDocumentsPageProps {
  params: Promise<{
    id: string
  }>
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

export default function PatientDocumentsPage({ params }: PatientDocumentsPageProps) {
  const [patientId, setPatientId] = useState<string>("")
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getPatientId = async () => {
      const resolvedParams = await params
      setPatientId(resolvedParams.id)
    }
    getPatientId()
  }, [params])

  useEffect(() => {
    if (patientId) {
      fetchPatientData()
    }
  }, [patientId])

  const fetchPatientData = async () => {
    try {
      setLoading(true)
      const response = await fetchWithoutCache(`/api/patients/${patientId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch patient data')
      }
      const data = await response.json()
      setPatient(data.patient)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Follow-up': return 'bg-yellow-100 text-yellow-800'
      case 'Discharged': return 'bg-gray-100 text-gray-800'
      case 'Transferred': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 md:ml-24 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Loading patient data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="relative flex min-h-screen bg-secondary">
        <Sidebar />
        <div className="flex-1 md:ml-24 flex items-center justify-center">
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

  return (
    <div className="relative flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 pb-20 max-w-7xl mx-auto w-full md:ml-24">
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
                <Badge className={getStatusColor(patient.status)}>
                  {patient.status}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents & Media</h1>
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
                  <span>Admitted: {new Date(patient.admission_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Info Card */}
        <Card className="border-gray-200 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Diagnosis</p>
                <p className="font-medium">{patient.primary_diagnosis}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Attending</p>
                <p className="font-medium">Dr. {patient.attending_physician}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Age</p>
                <p className="font-medium">{patient.age}y</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Gallery */}
        <PatientMediaGallery 
          patientId={patientId}
          showUpload={true}
          maxHeight="70vh"
        />
      </main>
    </div>
  )
}