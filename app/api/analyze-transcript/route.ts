import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb/connection'
import Patient from '@/lib/mongodb/models/Patient'
import ClinicalNote from '@/lib/mongodb/models/ClinicalNote'
import { ClinicalDocumentationService } from '@/lib/services/clinical-documentation.service'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { 
      transcript, 
      metadata, 
      patient_info, 
      save_to_db, 
      session_info 
    } = await request.json()
    
    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      )
    }

    if (transcript.trim().length < 10) {
      return NextResponse.json(
        { error: 'Transcript too short for clinical documentation' },
        { status: 400 }
      )
    }

    // Use clinical documentation service for proper medical note generation
    const clinicalAnalysis = await ClinicalDocumentationService.analyzeTranscriptForDocumentation(
      transcript
    )

    // Enhance with AI analysis if LiteLLM is available
    let aiEnhancement = null
    try {
      aiEnhancement = await generateAIEnhancement(transcript, clinicalAnalysis)
    } catch (error) {
      console.warn('AI enhancement failed, using structured analysis only:', error)
    }

    let databaseInfo = null

    // Save to database if requested
    if (save_to_db) {
      try {
        databaseInfo = await saveToDatabase(
          transcript, 
          clinicalAnalysis, 
          patient_info, 
          metadata, 
          session_info,
          aiEnhancement
        )
      } catch (dbError) {
        console.error('Database save failed:', dbError)
        databaseInfo = {
          error: 'Failed to save to database',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        }
      }
    }

    const response = {
      clinical_documentation: clinicalAnalysis,
      ai_enhancement: aiEnhancement,
      database_info: databaseInfo,
      generation_metadata: {
        generated_at: new Date().toISOString(),
        transcript_length: transcript.length,
        template_used: clinicalAnalysis.suggested_template,
        confidence: clinicalAnalysis.confidence
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Clinical documentation error:', error)
    
    // Generate basic fallback documentation
    try {
      const { transcript, patient_info } = await request.json()
      const fallbackNote = generateFallbackDocumentation(transcript, patient_info)
      
      return NextResponse.json({
        clinical_documentation: fallbackNote,
        ai_enhancement: null,
        database_info: {
          patient_found: false,
          note_saved: false,
          error: 'Database operation failed'
        },
        generation_metadata: {
          generated_at: new Date().toISOString(),
          fallback: true,
          error: 'Used fallback documentation due to processing error'
        }
      })
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Failed to generate clinical documentation' },
        { status: 500 }
      )
    }
  }
}

async function generateAIEnhancement(transcript: string, clinicalAnalysis: any) {
  const enhancementPrompt = `You are a neurosurgical AI assistant specializing in clinical documentation enhancement. Review the structured medical note and transcript to provide neurosurgically-focused clinical insights.

STRUCTURED NOTE GENERATED:
Template: ${clinicalAnalysis.suggested_template}
Sections: ${JSON.stringify(clinicalAnalysis.structured_note.sections, null, 2)}

ORIGINAL TRANSCRIPT:
${transcript}

Focus on neurosurgical aspects and provide enhancement suggestions in JSON format:
{
  "neurosurgical_insights": [
    "Specific neurosurgical observations, GCS trends, ICP concerns, neurological deficits"
  ],
  "clinical_risk_assessment": {
    "neurological_deterioration_risk": "LOW/MEDIUM/HIGH with rationale",
    "surgical_intervention_indicators": ["Any indicators for surgical intervention"],
    "monitoring_recommendations": ["Specific monitoring recommendations"]
  },
  "documentation_improvements": [
    "Suggestions for improving neurosurgical documentation"
  ],
  "medical_accuracy_check": {
    "terminology_corrections": ["Any neurosurgical terms that need correction"],
    "missing_neurological_elements": ["Important neurological assessments not documented"],
    "accuracy_score": "1-10 rating of neurosurgical documentation accuracy"
  },
  "follow_up_priorities": [
    "High-priority follow-up items specific to neurosurgical care"
  ]
}`

  try {
    const response = await fetch(`${process.env.LITELLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LITELLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'groq/llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a neurosurgical medical documentation AI assistant with expertise in neurocritical care, brain tumors, trauma, and vascular neurosurgery. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: enhancementPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return JSON.parse(data.choices[0].message.content)
    }
  } catch (error) {
    console.warn('AI enhancement request failed:', error)
  }

  return null
}

// Database save function
async function saveToDatabase(
  transcript: string, 
  clinicalAnalysis: any, 
  patient_info: any, 
  metadata: any, 
  session_info: any,
  aiEnhancement: any
) {
  const result: any = {
    patient_found: false,
    patient_created: false,
    note_saved: false,
    patient_id: null,
    note_id: null
  }

  try {
    let patient = null

    // Find or create patient
    if (patient_info?.patient_id) {
      // Selected existing patient by ID
      patient = await Patient.findById(patient_info.patient_id)
      if (patient) {
        result.patient_found = true
        result.patient_id = patient._id
      }
    } else if (patient_info?.mrn) {
      // Search by MRN (fallback)
      patient = await Patient.findOne({ mrn: patient_info.mrn })
      if (patient) {
        result.patient_found = true
        result.patient_id = patient._id
      }
    }

    // If no patient found and we have patient info from AI analysis, create new patient
    if (!patient) {
      const aiPatientInfo = clinicalAnalysis.patient_info || {}
      const structuredNote = clinicalAnalysis.structured_note || {}
      
      // Generate MRN if not provided
      const mrn = patient_info?.mrn || await generateUniqueMRN()
      
      // Extract patient data from AI analysis or defaults
      const patientData = {
        mrn,
        name: aiPatientInfo.name || structuredNote.patient?.name || 'Unknown Patient',
        dob: new Date(Date.now() - (25 * 365 * 24 * 60 * 60 * 1000)), // Default to 25 years old
        age: aiPatientInfo.age || structuredNote.patient?.age || 25,
        sex: aiPatientInfo.gender || structuredNote.patient?.sex || 'Other',
        primary_diagnosis: extractPrimaryDiagnosis(transcript),
        secondary_diagnoses: clinicalAnalysis.key_findings?.diagnoses || [],
        admission_date: new Date(),
        admission_source: 'Transfer' as const,
        gcs_admission: extractGCS(transcript) || 15,
        current_location: 'Neurosurgery Ward',
        attending_physician: 'Attending Physician',
        status: 'Active' as const,
        monitoring: {
          icp_monitor: transcript.toLowerCase().includes('icp'),
          evd: transcript.toLowerCase().includes('evd'),
          ventilator: transcript.toLowerCase().includes('ventilator'),
          other_devices: []
        },
        emergency_contacts: [],
        past_medical_history: [],
        allergies: [],
        medications: []
      }

      patient = new Patient(patientData)
      await patient.save()
      
      result.patient_created = true
      result.patient_id = patient._id
    }

    // Create clinical note
    const encounterInfo = clinicalAnalysis.encounter_info || {}
    const structuredNote = clinicalAnalysis.structured_note || {}
    const sections = structuredNote.sections || {}

    const clinicalNoteData = {
      patient_id: patient._id,
      encounter_date: session_info?.date ? new Date(session_info.date) : new Date(),
      encounter_time: session_info?.time || new Date().toTimeString().split(' ')[0].substring(0, 5),
      encounter_type: encounterInfo.type || 'rounds',
      encounter_location: encounterInfo.location || 'Clinical setting',
      duration_minutes: encounterInfo.duration_minutes || null,
      
      template_id: structuredNote.template_id || 'progress_note',
      template_name: structuredNote.template_name || 'Progress Note',
      note_sections: new Map(Object.entries(sections)),
      
      raw_transcript: transcript,
      
      audio_metadata: {
        original_filename: metadata?.original_filename || null,
        duration_seconds: metadata?.duration_seconds || null,
        file_size_bytes: metadata?.file_size_bytes || null,
        transcription_provider: 'groq',
        transcription_confidence: clinicalAnalysis.confidence || 0.8,
        speaker_count: metadata?.speaker_count || 1
      },
      
      ai_analysis_metadata: {
        model_used: 'groq/llama3-70b-8192',
        analysis_confidence: clinicalAnalysis.confidence || 0.8,
        analysis_timestamp: new Date(),
        enhancement_applied: !!aiEnhancement
      },
      
      extracted_content: {
        symptoms: clinicalAnalysis.key_findings?.symptoms || [],
        vital_signs: extractVitalSigns(transcript),
        medications_mentioned: clinicalAnalysis.key_findings?.medications || [],
        procedures_mentioned: clinicalAnalysis.key_findings?.procedures || [],
        diagnoses_mentioned: clinicalAnalysis.key_findings?.diagnoses || [],
        follow_up_items: (clinicalAnalysis.follow_up_items || []).map((item: any) => ({
          item: item.item || item,
          priority: item.priority || 'medium',
          due_date: item.due_date ? new Date(item.due_date) : undefined,
          assigned_to: item.assigned_to || undefined
        }))
      },
      
      primary_provider: 'Primary Provider',
      attending_physician: patient.attending_physician,
      other_providers: encounterInfo.providers || [],
      family_present: [],
      
      status: 'draft',
      tags: generateTags(transcript, patient),
      urgency: determineUrgency(transcript),
      
      completeness_score: 0, // Will be calculated by pre-save middleware
      requires_followup: false, // Will be calculated by pre-save middleware
      
      exported_formats: []
    }

    const clinicalNote = new ClinicalNote(clinicalNoteData)
    await clinicalNote.save()
    
    result.note_saved = true
    result.note_id = clinicalNote._id

    return result

  } catch (error) {
    console.error('Database save error:', error)
    throw error
  }
}

// Utility functions
async function generateUniqueMRN(): Promise<string> {
  let mrn: string
  let exists = true
  
  while (exists) {
    const randomNum = Math.floor(Math.random() * 9000) + 1000
    mrn = `NSG${randomNum}`
    
    const existingPatient = await Patient.findOne({ mrn })
    exists = !!existingPatient
  }
  
  return mrn!
}

function extractPrimaryDiagnosis(transcript: string): string {
  const lowerTranscript = transcript.toLowerCase()
  
  const neurosurgicalTerms = [
    'glioblastoma', 'glioma', 'meningioma', 'brain tumor',
    'traumatic brain injury', 'tbi', 'subdural hematoma', 'epidural hematoma',
    'subarachnoid hemorrhage', 'sah', 'intracerebral hemorrhage',
    'hydrocephalus', 'brain aneurysm', 'arteriovenous malformation', 'avm',
    'spinal cord injury', 'spinal tumor', 'chiari malformation'
  ]
  
  for (const term of neurosurgicalTerms) {
    if (lowerTranscript.includes(term)) {
      return term.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }
  }
  
  return 'Neurosurgical condition'
}

function extractGCS(transcript: string): number | null {
  const gcsMatch = transcript.match(/gcs\s*(\d+)/i)
  if (gcsMatch) {
    const gcs = parseInt(gcsMatch[1])
    return gcs >= 3 && gcs <= 15 ? gcs : null
  }
  return null
}

function extractVitalSigns(transcript: string) {
  const vitalSigns: any = {}
  
  // GCS
  const gcsMatch = transcript.match(/gcs\s*(\d+)/i)
  if (gcsMatch) {
    vitalSigns.gcs = parseInt(gcsMatch[1])
  }
  
  // Blood pressure
  const bpMatch = transcript.match(/(\d{2,3})\/(\d{2,3})/g)
  if (bpMatch) {
    vitalSigns.blood_pressure = bpMatch[0]
  }
  
  // Heart rate
  const hrMatch = transcript.match(/hr\s*(\d{2,3})|heart rate\s*(\d{2,3})/i)
  if (hrMatch) {
    vitalSigns.heart_rate = parseInt(hrMatch[1] || hrMatch[2])
  }
  
  // ICP
  const icpMatch = transcript.match(/icp\s*(\d+)/i)
  if (icpMatch) {
    vitalSigns.icp_reading = parseInt(icpMatch[1])
  }
  
  return vitalSigns
}

function generateTags(transcript: string, patient: any): string[] {
  const tags = ['neurosurgery']
  
  if (patient?.primary_diagnosis) {
    tags.push(patient.primary_diagnosis.toLowerCase().replace(/\s+/g, '-'))
  }
  
  const lowerTranscript = transcript.toLowerCase()
  
  if (lowerTranscript.includes('icp')) tags.push('icp-monitoring')
  if (lowerTranscript.includes('evd')) tags.push('evd')
  if (lowerTranscript.includes('craniotomy')) tags.push('post-craniotomy')
  if (lowerTranscript.includes('family')) tags.push('family-meeting')
  if (lowerTranscript.includes('urgent') || lowerTranscript.includes('emergency')) tags.push('urgent')
  
  return tags
}

function determineUrgency(transcript: string): 'routine' | 'urgent' | 'emergent' {
  const lowerTranscript = transcript.toLowerCase()
  
  if (lowerTranscript.includes('emergency') || lowerTranscript.includes('stat') || lowerTranscript.includes('emergent')) {
    return 'emergent'
  }
  
  if (lowerTranscript.includes('urgent') || lowerTranscript.includes('asap') || lowerTranscript.includes('deteriorat')) {
    return 'urgent'
  }
  
  return 'routine'
}

function generateFallbackDocumentation(transcript: string, patientInfo: any) {
  const now = new Date()
  
  return {
    suggested_template: 'progress_note',
    confidence: 0.5,
    patient_info: patientInfo || {},
    encounter_info: {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5),
      type: 'rounds',
      location: 'Clinical setting',
      providers: ['Provider']
    },
    structured_note: {
      template_id: 'progress_note',
      template_name: 'Progress Note',
      patient: patientInfo || {},
      sections: {
        subjective: transcript.length > 200 ? transcript.substring(0, 200) + '...' : transcript,
        objective: 'Physical examination and clinical findings documented.',
        assessment_plan: 'Clinical assessment and management plan documented during encounter.'
      },
      created_at: now.toISOString(),
      last_modified: now.toISOString(),
      status: 'draft'
    },
    key_findings: {
      symptoms: [],
      examinations: [],
      medications: [],
      procedures: [],
      diagnoses: [],
      plans: []
    },
    medical_terminology: [],
    timestamps: [],
    follow_up_items: []
  }
}

// Handle CORS for development
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}