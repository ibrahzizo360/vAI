"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/custom/sidebar";
import { ExportModal } from "@/components/custom/export-modal";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  FileText,
  Bot,
  Calendar,
  Loader2,
  Upload,
  CircleAlert,
  Activity,
  Clock,
  ExternalLink,
  Brain,
  Eye,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { fetchWithoutCache } from "@/lib/utils/cache";
import { EditPatientModal } from "@/components/custom/edit-patient-modal";

interface PatientDetailsPageProps {
  params: {
    id: string;
  };
}

interface Patient {
  _id: string;
  mrn: string;
  name: string;
  dob: string;
  age: number;
  sex: string;
  primary_diagnosis: string;
  secondary_diagnoses: string[];
  admission_date: string;
  status: string;
  current_location: string;
  attending_physician: string;
  resident_physician?: string;
  procedures: Array<{
    name: string;
    date: string;
    surgeon: string;
    notes?: string;
  }>;
  monitoring: {
    icp_monitor: boolean;
    evd: boolean;
    ventilator: boolean;
    other_devices: string[];
  };
  emergency_contacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    is_primary: boolean;
  }>;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    started_date: string;
  }>;
}

interface ClinicalNote {
  _id: string;
  encounter_date: string;
  encounter_type: string;
  encounter_location: string;
  note_sections: Record<string, string>;
  raw_transcript?: string;
  audio_metadata?: {
    duration_seconds?: number;
    transcription_provider?: string;
    transcription_confidence?: number;
  };
  ai_analysis_metadata?: {
    analysis_confidence?: number;
    model_used?: string;
  };
  extracted_content: {
    symptoms: string[];
    vital_signs: Record<string, any>;
    medications_mentioned?: string[];
    procedures_mentioned?: string[];
    diagnoses_mentioned?: string[];
    follow_up_items: Array<{
      item: string;
      priority: string;
      due_date?: string;
    }>;
  };
  status: string;
  primary_provider: string;
  attending_physician: string;
  completeness_score: number;
}

interface PatientResponse {
  patient: Patient;
  clinicalNotes: ClinicalNote[];
  stats: {
    totalNotes: number;
    recentNotes: number;
    avgCompletenessScore: number;
  };
}

export default function PatientDetailsPage({
  params,
}: PatientDetailsPageProps) {
  const patientId = params.id;
  const [patientData, setPatientData] = useState<PatientResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingNotes, setExportingNotes] = useState<ClinicalNote[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  console.log("Patient ID:", patientData);

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const response = await fetchWithoutCache(`/api/patients/${patientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch patient data");
      }
      const data: PatientResponse = await response.json();
      setPatientData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  const formatEncounterType = (type: string) => {
    const formatted = {
      rounds: "Ward Round",
      consult: "Consult",
      family_meeting: "Family Meeting",
      procedure: "Procedure",
      discharge: "Discharge",
      emergency: "Emergency",
    };
    return formatted[type as keyof typeof formatted] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Follow-up":
        return "bg-yellow-100 text-yellow-800";
      case "Discharged":
        return "bg-gray-100 text-gray-800";
      case "Transferred":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
    );
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
    );
  }

  const { patient } = patientData;

  return (
    <div className="relative flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 md:ml-20 p-4 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <Link href="/patients">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Patients
                  </Button>
                </Link>
                <Badge className={getStatusColor(patient.status)}>
                  {patient.status}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {patient.name}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{patient.age}y</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>MRN: {patient.mrn}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Admitted:{" "}
                    {new Date(patient.admission_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    Day{" "}
                    {Math.ceil(
                      (new Date().getTime() -
                        new Date(patient.admission_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Patient
              </Button>
              <Link href={`/patients/${patientId}/chat`}>
                <Button variant="outline" className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  AI Chat
                </Button>
              </Link>
              <Link href={`/patients/${patientId}/clinical-notes`}>
                <Button className="bg-primary hover:bg-primary/90">
                  <FileText className="h-4 w-4 mr-2" />
                  View All Notes
                </Button>
              </Link>
              <Link href={`/patients/${patientId}/documents`}>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Documents & Media
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Latest Assessment */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <Bot className="h-6 w-6 text-primary" />
                Latest Clinical Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patientData.clinicalNotes.length > 0 ? (
                <div className="bg-blue-50 p-6 rounded-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-blue-900">
                        {formatEncounterType(
                          patientData.clinicalNotes[0].encounter_type
                        )}
                      </h4>
                      <p className="text-sm text-blue-700">
                        {new Date(
                          patientData.clinicalNotes[0].encounter_date
                        ).toLocaleDateString()}{" "}
                        •{patientData.clinicalNotes[0].encounter_location}
                      </p>
                    </div>
                    {patientData.clinicalNotes[0].ai_analysis_metadata && (
                      <Badge
                        variant="secondary"
                        className="bg-purple-100 text-purple-800"
                      >
                        AI:{" "}
                        {Math.round(
                          (patientData.clinicalNotes[0].ai_analysis_metadata
                            .analysis_confidence || 0) * 100
                        )}
                        %
                      </Badge>
                    )}
                  </div>
                  <div className="text-blue-900 leading-relaxed">
                    {patientData.clinicalNotes[0].note_sections.assessment_plan?.substring(
                      0,
                      400
                    ) ||
                      patientData.clinicalNotes[0].note_sections.subjective?.substring(
                        0,
                        400
                      ) ||
                      "No assessment available"}
                    {(patientData.clinicalNotes[0].note_sections.assessment_plan
                      ?.length > 400 ||
                      patientData.clinicalNotes[0].note_sections.subjective
                        ?.length > 400) &&
                      "..."}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No clinical assessments available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation to Detailed Pages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mx-auto">
            <Link href={`/patients/${patientId}/clinical-notes`}>
              <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      Clinical Notes
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <div className="space-y-3 h-full">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Notes:</span>
                      <span className="font-semibold">
                        {patientData.stats.totalNotes}
                      </span>
                    </div>
                    {/* Add empty space to match height */}
                    <div className="flex-1"></div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href={`/patients/${patientId}/documents`}>
              <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Upload className="h-5 w-5 text-primary" />
                      Media & Images
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <div className="space-y-3 h-full">
                    <p className="text-gray-600 text-sm">
                      Clinical photos, imaging studies, and documents
                    </p>
                    {/* Add empty space to match height */}
                    <div className="flex-1"></div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setExportingNotes([]);
        }}
        notes={exportingNotes.map((note) => ({ ...note, patient: patient }))}
        title={
          exportingNotes.length === 1
            ? "Export Clinical Note"
            : `Export ${exportingNotes.length} Clinical Notes`
        }
      />

      {/* Edit Patient Modal */}
      <EditPatientModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        patient={patient}
        onPatientUpdated={fetchPatientData}
      />
    </div>
  );
}
