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

interface SystemStats {
  total_patients: number
  total_notes: number
  recent_notes_count: number
  active_patients: number
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversation_history = [], include_system_context = true } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    let systemContext = ""
    
    if (include_system_context) {
      // Connect to database and gather system-wide statistics
      await connectDB()
      
      // Get system statistics
      const totalPatients = await Patient.countDocuments()
      const activePatients = await Patient.countDocuments({ status: "Active" })
      const totalNotes = await ClinicalNote.countDocuments()
      
      // Get recent notes (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentNotesCount = await ClinicalNote.countDocuments({
        created_at: { $gte: sevenDaysAgo }
      })

      // Get some aggregate insights (without patient identifiers)
      const commonDiagnoses = await Patient.aggregate([
        { $group: { _id: "$primary_diagnosis", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])

      const encounterTypeStats = await ClinicalNote.aggregate([
        { $group: { _id: "$encounter_type", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])

      const systemStats: SystemStats = {
        total_patients: totalPatients,
        total_notes: totalNotes,
        recent_notes_count: recentNotesCount,
        active_patients: activePatients
      }

      systemContext = `
SYSTEM OVERVIEW:
- Total Patients: ${totalPatients}
- Active Patients: ${activePatients}
- Total Clinical Notes: ${totalNotes}
- Recent Notes (Last 7 days): ${recentNotesCount}

COMMON DIAGNOSES:
${commonDiagnoses.map(d => `- ${d._id}: ${d.count} patients`).join('\n')}

ENCOUNTER TYPES DISTRIBUTION:
${encounterTypeStats.map(e => `- ${e._id}: ${e.count} notes`).join('\n')}

Current Date: ${new Date().toISOString().split('T')[0]}
`
    }

    // Create comprehensive system prompt for general medical AI assistant
    const systemPrompt = `You are an advanced AI medical assistant for healthcare providers in a clinical documentation system. You help with medical knowledge, best practices, clinical decision support, and system insights.

${include_system_context ? systemContext : ''}

CAPABILITIES AND GUIDELINES:
- Provide evidence-based medical information and clinical insights
- Help with differential diagnosis considerations and clinical reasoning
- Suggest best practices for patient care and documentation
- Answer questions about medical procedures, medications, and treatments
- Provide insights about system-wide patterns when relevant
- Help with clinical decision support and care optimization
- Discuss medical research, guidelines, and protocols

IMPORTANT LIMITATIONS:
- You are an AI assistant for informational purposes only
- Always recommend consulting with appropriate specialists for complex cases
- Do not provide specific patient medical advice without proper context
- Encourage following institutional protocols and guidelines
- Suggest when additional testing or specialist consultation may be needed
- Maintain professional medical ethics and patient confidentiality principles

RESPONSE STYLE:
- Be professional, accurate, and evidence-based
- Provide detailed explanations when helpful
- Reference relevant medical literature or guidelines when appropriate
- Ask clarifying questions if the query is ambiguous
- Suggest follow-up considerations or related topics
- Use clear medical terminology with explanations when needed

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
        temperature: 0.1, // Lower temperature for medical accuracy
        max_tokens: 3000
      }
    )

    // Prepare response
    const response = {
      message: aiResponse,
      timestamp: new Date().toISOString(),
      system_context_included: include_system_context
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('System chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve system statistics and context
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const includeStats = url.searchParams.get('include_stats') === 'true'

    if (!includeStats) {
      return NextResponse.json({
        service: 'vAI Medical AI Assistant',
        version: '1.0.0',
        capabilities: [
          'Medical knowledge queries',
          'Clinical decision support',
          'Best practices guidance',
          'System insights and analytics',
          'Literature and guideline references',
          'Procedure and medication information'
        ]
      })
    }

    await connectDB()

    // Get comprehensive system statistics
    const [
      totalPatients,
      activePatients,
      totalNotes,
      recentNotesCount,
      commonDiagnoses,
      encounterTypeStats
    ] = await Promise.all([
      Patient.countDocuments(),
      Patient.countDocuments({ status: "Active" }),
      ClinicalNote.countDocuments(),
      ClinicalNote.countDocuments({
        created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      Patient.aggregate([
        { $group: { _id: "$primary_diagnosis", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      ClinicalNote.aggregate([
        { $group: { _id: "$encounter_type", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ])

    const systemStats = {
      patients: {
        total: totalPatients,
        active: activePatients,
        inactive: totalPatients - activePatients
      },
      clinical_notes: {
        total: totalNotes,
        recent_7_days: recentNotesCount
      },
      insights: {
        common_diagnoses: commonDiagnoses,
        encounter_types: encounterTypeStats
      },
      last_updated: new Date().toISOString()
    }

    return NextResponse.json(systemStats)

  } catch (error) {
    console.error('System stats error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve system statistics' },
      { status: 500 }
    )
  }
}