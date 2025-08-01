import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb/connection'
import Patient from '@/lib/mongodb/models/Patient'
import ClinicalNote from '@/lib/mongodb/models/ClinicalNote'
import { ClinicalDocumentationService } from '@/lib/services/clinical-documentation.service'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { transcript } = await request.json()
    
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

    // Find or create patient if patient info is provided
    let patient = null

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