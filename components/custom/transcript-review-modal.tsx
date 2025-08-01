"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MedicalSyntaxHighlighter } from "@/components/custom/medical-syntax-highlighter"
import { Edit, RefreshCcw, CheckCircle, QrCode, User, Calendar, Clock, Tag, X, Loader2 } from "lucide-react"
import Link from "next/link"

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

export function TranscriptReviewModal({ isOpen, onClose, transcriptData }: TranscriptReviewModalProps) {
  const [patientId, setPatientId] = useState(transcriptData.patientId || "")
  const [context, setContext] = useState(transcriptData.context || "")
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
  const recorderIdentity = "Dr. John Doe" // Placeholder for recorder identity

  const [isSaving, setIsSaving] = useState(false)

  const handleSaveToRegistry = async () => {
    if (!context) return
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/analyze-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcriptData.rawText || sampleTranscript,
          metadata: transcriptData.metadata || {},
          patient_info: {
            mrn: patientId || undefined,
            name: undefined // Will be extracted from transcript if available
          },
          encounter_type: mapContextToEncounterType(context),
          save_to_db: true
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Saved to registry:', result)
        // Show success message or redirect
        onClose()
      } else {
        console.error('Failed to save to registry')
        alert('Failed to save to registry. Please try again.')
      }
    } catch (error) {
      console.error('Error saving to registry:', error)
      alert('Error saving to registry. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleApproveAndExport = async () => {
    if (!context) return
    
    setIsSaving(true)
    try {
      // First save to database
      const response = await fetch('/api/analyze-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcriptData.rawText || sampleTranscript,
          metadata: transcriptData.metadata || {},
          patient_info: {
            mrn: patientId || undefined,
            name: undefined
          },
          encounter_type: mapContextToEncounterType(context),
          save_to_db: true
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Saved and exported:', result)
        
        // TODO: In the future, add EMR export functionality here
        // await exportToEMR(result)
        
        onClose()
      } else {
        console.error('Failed to save transcript')
        alert('Failed to save transcript. Please try again.')
      }
    } catch (error) {
      console.error('Error saving transcript:', error)
      alert('Error saving transcript. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const mapContextToEncounterType = (contextType: string): string => {
    const mapping: { [key: string]: string } = {
      'preoperative-consult': 'consult',
      'ward-round': 'rounds',
      'family-counseling': 'family_meeting',
      'intraoperative-findings': 'procedure',
      'postoperative-review': 'rounds',
      'multidisciplinary-meeting': 'family_meeting',
      'follow-up-visit': 'consult',
      'complication-discussion': 'consult',
      'discharge-planning': 'discharge',
      'research-case-review': 'rounds'
    }
    return mapping[contextType] || 'rounds'
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
            
            {/* AI Summary */}
            <div className="bg-blue-50 p-3 sm:p-4 rounded-md border border-blue-200">
              <h4 className="font-semibold text-sm text-blue-800 mb-2">🧠 Clinical Summary</h4>
              <div className="text-gray-700 text-sm leading-relaxed">
                {(() => {
                  const analysis = transcriptData.analysis
                  const rawText = transcriptData.rawText || sampleTranscript
                  
                  if (!analysis) {
                    // If no analysis yet, just show the raw transcript if available
                    if (rawText && rawText.trim().length > 20) {
                      return (
                        <div className="text-gray-700 leading-relaxed">
                          {rawText}
                        </div>
                      )
                    }
                    return <div className="text-gray-600 italic">🔄 Processing transcription...</div>
                  }

                  // Check different possible locations for clinical content
                  const clinicalDoc = analysis.clinical_documentation
                  const structuredNote = clinicalDoc?.structured_note
                  const sections = structuredNote?.sections

                  if (sections && Object.keys(sections).length > 0) {
                    // Check if we have any actual content (non-empty sections)
                    const hasActualContent = Object.values(sections).some(content => 
                      content && typeof content === 'string' && content.trim().length > 0
                    ) || (clinicalDoc.key_findings && (
                      clinicalDoc.key_findings.symptoms?.length > 0 ||
                      clinicalDoc.key_findings.examinations?.length > 0 ||
                      clinicalDoc.key_findings.medications?.length > 0 ||
                      clinicalDoc.key_findings.procedures?.length > 0 ||
                      clinicalDoc.key_findings.diagnoses?.length > 0 ||
                      clinicalDoc.key_findings.plans?.length > 0
                    ))

                    if (!hasActualContent) {
                      // If no actual clinical content, fall through to the transcript-only display
                      return null
                    }

                    return (
                      <div className="space-y-4 font-mono text-xs leading-relaxed">
                        {/* Header - only show if we have header data */}
                        {((sections.patient_name || clinicalDoc.patient_info?.name || clinicalDoc.patient_info?.mrn) ||
                          (clinicalDoc.encounter_info?.date || clinicalDoc.encounter_info?.time) ||
                          clinicalDoc.encounter_info?.type) && (
                          <div className="bg-blue-100 p-2 rounded border-l-4 border-blue-500">
                            {(sections.patient_name || clinicalDoc.patient_info?.name || clinicalDoc.patient_info?.mrn) && (
                              <div className="font-bold text-blue-900">
                                📌 Patient: {sections.patient_name || clinicalDoc.patient_info?.name || clinicalDoc.patient_info?.mrn}
                              </div>
                            )}
                            {(clinicalDoc.encounter_info?.date || clinicalDoc.encounter_info?.time) && (
                              <div className="text-blue-800">
                                🕒 {clinicalDoc.encounter_info?.date && clinicalDoc.encounter_info.date}{clinicalDoc.encounter_info?.time && ` – ${clinicalDoc.encounter_info.time}`}
                              </div>
                            )}
                            {clinicalDoc.encounter_info?.type && (
                              <div className="text-blue-800">
                                🏥 {(() => {
                                  const typeMap: { [key: string]: string } = {
                                    'consult': 'CONSULTATION',
                                    'rounds': 'ROUNDS',
                                    'family_meeting': 'FAMILY MEETING',
                                    'procedure': 'PROCEDURE',
                                    'discharge': 'DISCHARGE'
                                  }
                                  return typeMap[clinicalDoc.encounter_info.type] || clinicalDoc.encounter_info.type.replace('_', ' ').toUpperCase()
                                })()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Current Status */}
                        {(sections.current_status || sections.subjective) && (
                          <div>
                            <div className="font-bold text-gray-900">🩺 Current Status:</div>
                            <div className="ml-4 text-gray-700 bg-gray-50 p-2 rounded">
                              {sections.current_status || sections.subjective}
                            </div>
                          </div>
                        )}

                        {/* Neuro Exam */}
                        {(sections.neuro_exam || sections.objective) && (
                          <div>
                            <div className="font-bold text-gray-900">🧠 Neuro Exam:</div>
                            <div className="ml-4 text-gray-700 bg-gray-50 p-2 rounded">
                              {sections.neuro_exam || sections.objective}
                            </div>
                          </div>
                        )}

                        {/* Investigations */}
                        {(sections.investigations || (clinicalDoc.key_findings?.examinations?.length > 0)) && (
                          <div>
                            <div className="font-bold text-gray-900">🧪 Investigations:</div>
                            <div className="ml-4 text-gray-700 bg-gray-50 p-2 rounded">
                              {sections.investigations || clinicalDoc.key_findings.examinations.join('; ')}
                            </div>
                          </div>
                        )}

                        {/* Clinical Insights */}
                        {sections.clinical_insights && (
                          <div>
                            <div className="font-bold text-gray-900">🧰 Clinical Insights:</div>
                            <div className="ml-4 text-gray-700 bg-gray-50 p-2 rounded">
                              {sections.clinical_insights}
                            </div>
                          </div>
                        )}

                        {/* Management Plan */}
                        {(sections.management_plan || sections.assessment_plan) && (
                          <div>
                            <div className="font-bold text-gray-900">📝 Management Plan:</div>
                            <div className="ml-4 text-gray-700 bg-gray-50 p-2 rounded whitespace-pre-line">
                              {sections.management_plan || sections.assessment_plan}
                            </div>
                          </div>
                        )}

                        {/* Patient/Family Communication */}
                        {sections.patient_family_communication && (
                          <div>
                            <div className="font-bold text-gray-900">🗣️ Patient/Family Communication:</div>
                            <div className="ml-4 text-gray-700 bg-gray-50 p-2 rounded">
                              {sections.patient_family_communication}
                            </div>
                          </div>
                        )}

                        {/* Follow-Up Plan */}
                        {(sections.follow_up_plan || clinicalDoc.follow_up_items?.length > 0) && (
                          <div>
                            <div className="font-bold text-gray-900">📆 Follow-Up Plan:</div>
                            <div className="ml-4 text-gray-700 bg-gray-50 p-2 rounded">
                              {sections.follow_up_plan || 
                               (clinicalDoc.follow_up_items?.map((item: any) => `• ${item.item}`).join('\n') || '')}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Fallback - only show what's actually in the transcript
                  if (rawText && rawText.trim().length > 20) {
                    return (
                      <div className="space-y-4 font-mono text-xs leading-relaxed">
                        {/* Header - only show if we have data */}
                        <div className="bg-blue-100 p-2 rounded border-l-4 border-blue-500">
                          {patientId && (
                            <div className="font-bold text-blue-900">
                              📌 Patient: {patientId}
                            </div>
                          )}
                          {context && (
                            <div className="text-blue-800">
                              🏥 {mapContextToEncounterType(context).replace('_', ' ').toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Raw transcript content only */}
                        <div>
                          <div className="font-bold text-gray-900">🧰 Clinical Discussion:</div>
                          <div className="ml-4 text-gray-700 bg-gray-50 p-2 rounded">
                            {rawText.length > 300 ? rawText.substring(0, 300) + '...' : rawText}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="text-gray-600 italic text-center py-4">
                      ⚠️ No transcript content available for clinical analysis
                    </div>
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

            <div className="flex gap-2">
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
            </div>
          </div>

          {/* Tagging Section */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-primary mb-3">Add Context</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="patient-id" className="block text-sm font-medium text-gray-700 mb-2">
                  Patient ID
                </label>
                <div className="relative">
                  <Input
                    id="patient-id"
                    placeholder="Enter Patient ID (optional)"
                    className="pl-10 pr-4 py-2 border rounded-md focus:ring-primary focus:border-primary text-sm"
                    aria-label="Patient ID"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                  />
                  <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Can be added later if not available now</p>
              </div>

              <div>
                <label htmlFor="context-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Context Type <span className="text-red-500">*</span>
                </label>
                <Select value={context} onValueChange={setContext}>
                  <SelectTrigger
                    id="context-select"
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-primary focus:border-primary text-sm"
                  >
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Select context" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preoperative-consult">Preoperative Consult</SelectItem>
                    <SelectItem value="ward-round">Ward Round Discussion</SelectItem>
                    <SelectItem value="family-counseling">Family Counseling/Consent</SelectItem>
                    <SelectItem value="intraoperative-findings">Intraoperative Findings</SelectItem>
                    <SelectItem value="postoperative-review">Postoperative Review</SelectItem>
                    <SelectItem value="multidisciplinary-meeting">Multidisciplinary Team Meeting</SelectItem>
                    <SelectItem value="follow-up-visit">Follow-up Visit</SelectItem>
                    <SelectItem value="complication-discussion">Complication Discussion</SelectItem>
                    <SelectItem value="discharge-planning">Discharge Planning</SelectItem>
                    <SelectItem value="research-case-review">Research/Case Review</SelectItem>
                  </SelectContent>
                </Select>
                {!context && (
                  <p className="text-xs text-red-500 mt-1">Context type is required</p>
                )}
              </div>
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
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{recorderIdentity}</span>
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
          
          <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              onClick={handleSaveToRegistry}
              disabled={!context || isSaving}
              className="text-primary border-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              aria-label="Save to case registry"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save to Registry'
              )}
            </Button>
            <Button
              onClick={handleApproveAndExport}
              disabled={!context || isSaving}
              className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600 transition-colors text-sm"
              aria-label="Add to EMR and case registry"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add to EMR & Registry
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
