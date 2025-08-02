import { NextRequest, NextResponse } from 'next/server'
import { LiteLLMService } from '@/lib/services/litellm.service'

export async function POST(request: NextRequest) {
  try {
    const { prompt, transcript } = await request.json()

    if (!transcript?.trim()) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      )
    }

    // Use your existing LiteLLM service
    const litellmService = new LiteLLMService()
    
    const fullPrompt = `${prompt}\n\nTRANSCRIPT TO ANALYZE:\n${transcript}`
    
    const response = await litellmService.chatCompletion([
      {
        role: 'user',
        content: fullPrompt
      }
    ], {
      model: 'claude-3-sonnet-20240229', // Use Claude for medical analysis
      temperature: 0.1, // Low temperature for consistent medical analysis
      max_tokens: 4000
    })

    // Parse JSON from AI response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI')
    }

    const analysisResult = JSON.parse(jsonMatch[0])
    
    return NextResponse.json(analysisResult)

  } catch (error) {
    console.error('AI Analysis Error:', error)
    
    // Return a fallback response instead of failing completely
    return NextResponse.json({
      encounter_type: 'consult',
      confidence: 0.3,
      patient_info: {},
      encounter_info: { providers: [] },
      clinical_sections: {
        subjective: 'AI analysis temporarily unavailable. Please review transcript manually.',
        objective: '',
        assessment_plan: ''
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
      follow_up_items: [],
      timestamps: [],
      error: 'AI analysis failed, fallback response provided'
    })
  }
}