import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb/connection'
import Patient from '@/lib/mongodb/models/Patient'
import ClinicalNote from '@/lib/mongodb/models/ClinicalNote'
import { GroqAIService } from '@/lib/services/groq-ai.service'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { message, conversation_history = [] } = await request.json()
    const patientId = params.id

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Connect to database and fetch patient data
    await connectDB()
    
    const patient = await Patient.findById(patientId)
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    // Fetch all clinical notes for this patient
    const clinicalNotes = await ClinicalNote.find({ patient_id: patientId })
      .sort({ encounter_date: -1 })
      .limit(50) // Limit to most recent 50 notes to manage context

    // Prepare patient context for AI
    const patientContext = {
      name: patient.name,
      mrn: patient.mrn,
      age: patient.age,
      sex: patient.sex,
      primary_diagnosis: patient.primary_diagnosis,
      admission_date: patient.admission_date,
      current_location: patient.current_location,
      attending_physician: patient.attending_physician,
      status: patient.status
    }

    // Prepare clinical notes summary
    const notesContext = clinicalNotes.map(note => ({
      date: note.encounter_date,
      type: note.encounter_type,
      provider: note.attending_physician,
      subjective: note.note_sections?.subjective?.substring(0, 500) || '',
      objective: note.note_sections?.objective?.substring(0, 500) || '',
      assessment_plan: note.note_sections?.assessment_plan?.substring(0, 500) || '',
      vital_signs: note.extracted_content?.vital_signs || {},
      medications: note.extracted_content?.medications_mentioned || [],
      diagnoses: note.extracted_content?.diagnoses_mentioned || [],
      follow_up: note.extracted_content?.follow_up_items?.slice(0, 3) || []
    }))

    // Create system prompt with patient context
    const systemPrompt = `You are an AI assistant helping healthcare providers with patient information analysis. You have access to comprehensive patient data and clinical notes.

PATIENT INFORMATION:
${JSON.stringify(patientContext, null, 2)}

RECENT CLINICAL NOTES (${notesContext.length} notes):
${JSON.stringify(notesContext, null, 2)}

Guidelines:
- Provide accurate, evidence-based responses based only on the available patient data
- If information is not available in the patient records, clearly state this
- Highlight relevant patterns, trends, or concerns from the clinical data
- Suggest areas that may need follow-up or attention
- Maintain patient confidentiality and professionalism
- Do not provide specific medical advice - focus on information analysis and organization
- Reference specific dates, encounters, or providers when relevant
- If asked about medication interactions, allergies, or critical clinical decisions, recommend consulting with appropriate specialists

The healthcare provider is asking: "${message}"`

    // Prepare conversation messages for Groq API
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversation_history.map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ]

    // Initialize Groq AI service
    const groqService = new GroqAIService()
    
    // Get AI response
    const aiResponse = await groqService.chatCompletion(
      messages,
      GroqAIService.MODELS.LLAMA3_70B,
      {
        temperature: 0.1,
        max_tokens: 2000
      }
    )

    // Prepare response
    const response = {
      message: aiResponse,
      timestamp: new Date().toISOString(),
      patient_context: {
        name: patient.name,
        mrn: patient.mrn,
        notes_count: clinicalNotes.length
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Patient chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve patient context for chat initialization
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = params.id

    await connectDB()
    
    const patient = await Patient.findById(patientId)
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    const notesCount = await ClinicalNote.countDocuments({ patient_id: patientId })

    const context = {
      patient: {
        name: patient.name,
        mrn: patient.mrn,
        age: patient.age,
        sex: patient.sex,
        primary_diagnosis: patient.primary_diagnosis,
        attending_physician: patient.attending_physician,
        status: patient.status
      },
      clinical_notes_count: notesCount,
      last_updated: new Date().toISOString()
    }

    return NextResponse.json(context)

  } catch (error) {
    console.error('Patient context error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve patient context' },
      { status: 500 }
    )
  }
}