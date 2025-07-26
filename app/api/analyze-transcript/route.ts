import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb/connection'
import Patient from '@/lib/mongodb/models/Patient'
import ClinicalNote from '@/lib/mongodb/models/ClinicalNote'
import { ClinicalDocumentationService } from '@/lib/services/clinical-documentation.service'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { transcript, speakers, metadata, patient_info, encounter_type, save_to_db = true } = await request.json()
    
    // Log incoming data for debugging
    console.log('Clinical documentation request received:')
    console.log('- Transcript length:', transcript?.length || 0)
    console.log('- Patient info:', patient_info)
    console.log('- Encounter type:', encounter_type)
    console.log('- Save to DB:', save_to_db)
    
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
      transcript,
      patient_info,
      encounter_type
    )

    // Find or create patient if patient info is provided
    let patient = null
    let savedNote = null
    
    if (save_to_db && patient_info) {
      try {
        // Try to find existing patient by MRN or name
        if (patient_info.mrn) {
          patient = await Patient.findOne({ mrn: patient_info.mrn })
        } else if (patient_info.name) {
          patient = await Patient.findOne({ name: patient_info.name })
        }
        
        // If patient not found and we have enough info, create new patient
        if (!patient && patient_info.name) {
          const newPatientData = {
            mrn: patient_info.mrn || await generateUniqueMRN(),
            name: patient_info.name,
            dob: patient_info.dob || new Date('1980-01-01'),
            age: patient_info.age || 45,
            sex: patient_info.sex || 'M',
            primary_diagnosis: extractPrimaryDiagnosis(transcript),
            secondary_diagnoses: [],
            admission_date: new Date(),
            admission_source: 'ER',
            gcs_admission: extractGCS(transcript) || 15,
            current_location: clinicalAnalysis.encounter_info.location || 'Neurosurgery Ward',
            attending_physician: clinicalAnalysis.encounter_info.providers[0] || 'Dr. Attending',
            status: 'Active',
            monitoring: {
              icp_monitor: transcript.toLowerCase().includes('icp'),
              evd: transcript.toLowerCase().includes('evd'),
              ventilator: transcript.toLowerCase().includes('ventilator'),
              other_devices: []
            },
            emergency_contacts: [],
            past_medical_history: [],
            allergies: ['NKDA'],
            medications: []
          }
          
          patient = new Patient(newPatientData)
          await patient.save()
          console.log('Created new patient:', patient.mrn)
        }
        
        // Save clinical note if patient exists
        if (patient) {
          const noteData = {
            patient_id: patient._id,
            encounter_date: new Date(clinicalAnalysis.encounter_info.date),
            encounter_time: clinicalAnalysis.encounter_info.time,
            encounter_type: clinicalAnalysis.encounter_info.type,
            encounter_location: clinicalAnalysis.encounter_info.location,
            duration_minutes: clinicalAnalysis.encounter_info.duration_minutes,
            
            template_id: clinicalAnalysis.suggested_template,
            template_name: clinicalAnalysis.structured_note.template_name,
            note_sections: new Map(Object.entries(clinicalAnalysis.structured_note.sections)),
            
            audio_metadata: {
              duration_seconds: metadata?.duration || 0,
              transcription_provider: 'groq',
              transcription_confidence: metadata?.confidence || 0.9,
              speaker_count: metadata?.speaker_count || 0
            },
            
            extracted_content: {
              symptoms: clinicalAnalysis.key_findings.symptoms,
              vital_signs: extractVitalSigns(transcript),
              medications_mentioned: clinicalAnalysis.key_findings.medications,
              procedures_mentioned: clinicalAnalysis.key_findings.procedures,
              diagnoses_mentioned: clinicalAnalysis.key_findings.diagnoses,
              follow_up_items: clinicalAnalysis.follow_up_items
            },
            
            primary_provider: clinicalAnalysis.encounter_info.providers[0] || 'Provider',
            attending_physician: patient.attending_physician,
            other_providers: clinicalAnalysis.encounter_info.providers.slice(1),
            family_present: [],
            
            status: 'draft',
            tags: generateTags(transcript, patient),
            urgency: determineUrgency(transcript),
            completeness_score: 0
          }
          
          savedNote = new ClinicalNote(noteData)
          await savedNote.save()
          await savedNote.populate('patient_id', 'name mrn primary_diagnosis')
          console.log('Saved clinical note:', savedNote._id)
        }
        
      } catch (dbError) {
        console.error('Database operation failed:', dbError)
        // Continue without saving to DB
      }
    }

    // Enhance with AI analysis if LiteLLM is available
    let aiEnhancement = null
    try {
      aiEnhancement = await generateAIEnhancement(transcript, clinicalAnalysis)
    } catch (error) {
      console.warn('AI enhancement failed, using structured analysis only:', error)
    }

    const response = {
      clinical_documentation: clinicalAnalysis,
      ai_enhancement: aiEnhancement,
      database_info: {
        patient_found: !!patient,
        patient_id: patient?._id,
        patient_mrn: patient?.mrn,
        note_saved: !!savedNote,
        note_id: savedNote?._id
      },
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