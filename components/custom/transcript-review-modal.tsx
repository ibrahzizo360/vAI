"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MedicalSyntaxHighlighter } from "@/components/custom/medical-syntax-highlighter"
import { CheckCircle, Calendar, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface TranscriptReviewModalProps {
  isOpen: boolean
  onClose: () => void
  transcriptData: {
    rawText: string
    analysis?: any
    metadata?: any
    patientId?: string
    context?: string
    remarks?: string
  }
}

interface Patient {
  _id: string
  mrn: string
  name: string
  primary_diagnosis: string
  current_location: string
  attending_physician: string
}

export function TranscriptReviewModal({ isOpen, onClose, transcriptData }: TranscriptReviewModalProps) {
  const [selectedPatient, setSelectedPatient] = useState<string>("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [remarks, setRemarks] = useState(transcriptData.remarks || "")

  const sampleTranscript =
    transcriptData.rawText ||
    `
    Patient presented with a GCS 13/15, pupils equal and reactive to light.
    No signs of hydrocephalus. Discussed the posterior fossa tumor with the family.
    Plan for immediate MRI and then craniotomy. EVD placement considered if ICP rises.
    Patient is currently on Dexamethasone 4mg BID.
  `

  const aiSummarySuggestion = `
    Patient with GCS 13/15 and no hydrocephalus. Posterior fossa tumor discussed with family.
    Plan includes MRI and craniotomy, with EVD consideration for ICP. Patient on Dexamethasone.
  `

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const [isSaving, setIsSaving] = useState(false)

  // Fetch patients when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPatients()
    }
  }, [isOpen])

  const fetchPatients = async () => {
    setLoadingPatients(true)
    try {
      const response = await fetch('/api/patients?limit=100&status=Active')
      if (response.ok) {
        const data = await response.json()
        setPatients(data.patients || [])
      } else {
        console.error('Failed to fetch patients')
        toast.error('Failed to load patients', {
          description: 'Unable to fetch patient list. You can still save without selecting a patient.'
        })
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
      toast.error('Error loading patients', {
        description: 'Connection error. You can still save without selecting a patient.'
      })
    } finally {
      setLoadingPatients(false)
    }
  }

  const handleSaveToRegistry = async () => {
    setIsSaving(true)
    const loadingToast = toast.loading('Saving to registry...', {
      description: 'Analyzing transcript and saving clinical data'
    })
    
    try {
      const response = await fetch('/api/analyze-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcriptData.rawText || sampleTranscript,
          metadata: {
            ...transcriptData.metadata,
            recorded_at: new Date().toISOString(),
            additional_notes: remarks || undefined
          },
          patient_info: selectedPatient ? {
            patient_id: selectedPatient,
            mrn: patients.find(p => p._id === selectedPatient)?.mrn,
            name: patients.find(p => p._id === selectedPatient)?.name
          } : {
            mrn: undefined,
            name: undefined // Will be extracted from transcript if available
          },
          save_to_db: true,
          session_info: {
            date: currentDate,
            time: currentTime
          }
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Saved to registry:', result)
        
        // Dismiss loading toast and show success
        toast.dismiss(loadingToast)
        
        if (result.database_info?.note_saved) {
          toast.success('Successfully saved to registry!', {
            description: 'Clinical note has been saved and is ready for review.'
          })
        } else if (result.database_info?.patient_created) {
          toast.success('New patient created!', {
            description: 'Patient record created and clinical note saved to registry.'
          })
        } else {
          toast.success('Analysis completed!', {
            description: 'Clinical analysis saved to registry successfully.'
          })
        }
        
        onClose()
      } else {
        const errorData = await response.json()
        console.error('Failed to save to registry:', errorData)
        toast.dismiss(loadingToast)
        toast.error('Failed to save to registry', {
          description: errorData.error || 'Unknown error occurred. Please try again.'
        })
      }
    } catch (error) {
      console.error('Error saving to registry:', error)
      toast.dismiss(loadingToast)
      toast.error('Connection error', {
        description: 'Unable to save to registry. Please check your connection and try again.'
      })
    } finally {
      setIsSaving(false)
    }
  }



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-2xl lg:max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 bg-white rounded-lg shadow-xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-primary text-xl sm:text-2xl font-bold">
            Review & Tag Transcript
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-sm sm:text-base mt-2">
            Review the auto-generated transcript and add necessary context.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transcript Review Section */}
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-primary mb-3">Transcript</h3>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-md border border-gray-200 text-gray-800 leading-relaxed max-h-64 overflow-y-auto">
              <MedicalSyntaxHighlighter text={sampleTranscript} />
            </div>
            <div className="flex justify-end mt-3">
              <div className="text-xs text-gray-500">
                AI-processed transcription • {sampleTranscript.trim().split(' ').length} words
              </div>
            </div>
          </div>

          {/* AI Analysis Section */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-primary">AI Analysis & Summary</h3>
            
            {/* Results Section with Tabs */}
            <div className="bg-blue-50 p-3 sm:p-4 rounded-md border border-blue-200">
              <h4 className="font-semibold text-sm text-blue-800 mb-2">🧠 Clinical Analysis Results</h4>
              <div className="text-gray-700 text-sm leading-relaxed">
                {(() => {
                  const analysis = transcriptData.analysis
                  const rawText = transcriptData.rawText || sampleTranscript
                  
                  if (!analysis) {
                    // If no analysis yet, show processing state
                    return <div className="text-gray-600 italic text-center py-4">🔄 Processing transcription...</div>
                  }

                  const clinicalDoc = analysis.clinical_documentation
                  const structuredNote = clinicalDoc?.structured_note
                  const sections = structuredNote?.sections
                  const keyFindings = clinicalDoc?.key_findings
                  const encounterInfo = clinicalDoc?.encounter_info
                  const patientInfo = clinicalDoc?.patient_info
                  
                  return (
                    <Tabs defaultValue="structured" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="structured" className="text-xs">Structured Note</TabsTrigger>
                        <TabsTrigger value="findings" className="text-xs">Key Findings</TabsTrigger>
                        <TabsTrigger value="encounter" className="text-xs">Encounter Info</TabsTrigger>
                        <TabsTrigger value="patient" className="text-xs">Patient Info</TabsTrigger>
                      </TabsList>

                      <TabsContent value="structured" className="space-y-3">
                        {sections && Object.keys(sections).length > 0 ? (
                          <div className="space-y-3 font-mono text-xs leading-relaxed">
                            {Object.entries(sections)
                              .filter(([_, content]) => content && typeof content === 'string' && content.trim().length > 0)
                              .map(([sectionId, content]) => (
                                <div key={sectionId} className="border rounded p-3">
                                  <h5 className="font-bold text-gray-900 capitalize mb-2">
                                    {sectionId.replace(/_/g, ' ')}
                                  </h5>
                                  <div className="text-gray-700 bg-gray-50 p-2 rounded whitespace-pre-line">
                                    {String(content)}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-gray-600 italic text-center py-4">
                            📝 No structured note sections available
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="findings" className="space-y-3">
                        {keyFindings ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(keyFindings).map(([category, items]) => (
                              <div key={category} className="border rounded p-3">
                                <h5 className="font-bold text-gray-900 capitalize mb-2">
                                  {category}
                                </h5>
                                <div className="space-y-1">
                                  {Array.isArray(items) && items.length > 0 ? (
                                    items.map((item, idx) => (
                                      <Badge key={idx} variant="secondary" className="mr-1 mb-1 text-xs">
                                        {item}
                                      </Badge>
                                    ))
                                  ) : (
                                    <em className="text-gray-500 text-xs">None found</em>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-600 italic text-center py-4">
                            🔍 No key findings extracted
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="encounter" className="space-y-3">
                        {encounterInfo ? (
                          <div className="bg-gray-50 p-3 rounded border">
                            <div className="space-y-2 text-xs">
                              {encounterInfo.date && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-700">Date:</span>
                                  <span className="text-gray-600">{encounterInfo.date}</span>
                                </div>
                              )}
                              {encounterInfo.time && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-700">Time:</span>
                                  <span className="text-gray-600">{encounterInfo.time}</span>
                                </div>
                              )}
                              {encounterInfo.type && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-700">Type:</span>
                                  <Badge variant="outline" className="text-xs">
                                    {encounterInfo.type.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </div>
                              )}
                              {encounterInfo.location && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-700">Location:</span>
                                  <span className="text-gray-600">{encounterInfo.location}</span>
                                </div>
                              )}
                              {encounterInfo.providers && encounterInfo.providers.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold text-gray-700">Providers:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {encounterInfo.providers.map((provider: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                      {provider}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-600 italic text-center py-4">
                            🏥 No encounter information available
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="patient" className="space-y-3">
                        {patientInfo ? (
                          <div className="bg-gray-50 p-3 rounded border">
                            <div className="space-y-2 text-xs">
                              {patientInfo.name && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-700">Name:</span>
                                  <span className="text-gray-600">{patientInfo.name}</span>
                                </div>
                              )}
                              {patientInfo.mrn && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-700">MRN:</span>
                                  <span className="text-gray-600">{patientInfo.mrn}</span>
                                </div>
                              )}
                              {patientInfo.age && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-700">Age:</span>
                                  <span className="text-gray-600">{patientInfo.age}</span>
                                </div>
                              )}
                              {patientInfo.gender && (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-700">Gender:</span>
                                  <Badge variant="outline" className="text-xs">
                                    {patientInfo.gender === 'M' ? 'Male' : patientInfo.gender === 'F' ? 'Female' : patientInfo.gender}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-600 italic text-center py-4">
                            👤 No patient information available
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )
                })()}
              </div>
            </div>

{/* Missing Data Detection - Commented out for now */}
            {/* <div className="bg-amber-50 p-3 sm:p-4 rounded-md border border-amber-200">
              <h4 className="font-semibold text-sm text-amber-800 mb-2">Data Completeness Check</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Clinical findings documented
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  Patient images pending upload
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Follow-up plan needs specification
                </li>
              </ul>
            </div> */}

{/* Action buttons - temporarily commented out */}
            {/* <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-primary border-primary hover:bg-primary hover:text-white transition-colors text-xs sm:text-sm"
                aria-label="Re-run AI analysis"
              >
                <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Re-analyze
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-primary border-primary hover:bg-primary hover:text-white transition-colors text-xs sm:text-sm"
                aria-label="Export structured summary"
              >
                Export Summary
              </Button>
            </div> */}
          </div>

          {/* Tagging Section */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-primary mb-3">Add Context</h3>
            
            <div>
              <label htmlFor="patient-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Patient
              </label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger 
                  id="patient-select"
                  className="w-full border rounded-md focus:ring-primary focus:border-primary text-sm"
                  disabled={loadingPatients}
                >
                  <SelectValue placeholder={
                    loadingPatients ? "Loading patients..." : 
                    patients.length === 0 ? "No patients found" :
                    "Select a patient (optional)"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {patients.length > 0 ? (
                    patients.map((patient) => (
                      <SelectItem key={patient._id} value={patient._id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{patient.name}</span>
                          <span className="text-xs text-gray-500">
                            {patient.mrn} • {patient.primary_diagnosis}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      {loadingPatients ? "Loading..." : "No active patients found"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {patients.length > 0 
                  ? "Select an existing patient or leave blank to create new patient from transcript" 
                  : "No existing patients found. A new patient will be created from the transcript."
                }
              </p>
            </div>

            <div>
              <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Clinical Notes
              </label>
              <Textarea
                id="remarks"
                placeholder="Add follow-up plans, missing context, or clarifications..."
                rows={3}
                className="w-full p-3 border rounded-md focus:ring-primary focus:border-primary text-sm resize-none"
                aria-label="Additional clinical notes"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use this space for follow-up instructions, missing details, or research notes
              </p>
            </div>

            <div className="bg-gray-50 p-3 sm:p-4 rounded-md border border-gray-200">
              <h4 className="text-sm font-semibold text-primary mb-3">Session Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{currentDate}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span>{currentTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-gray-200 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="order-2 sm:order-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            aria-label="Cancel"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSaveToRegistry}
            disabled={isSaving}
            className="bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm order-1 sm:order-2"
            aria-label="Save to case registry"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save to Registry
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
