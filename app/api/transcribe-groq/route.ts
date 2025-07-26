import { NextRequest, NextResponse } from 'next/server'
import { GroqService } from '@/lib/services/groq.service'
import { AssemblyAIService } from '@/lib/services/assembly-ai.service'
import { TranscriptionError } from '@/lib/types/transcription'

export async function POST(request: NextRequest) {
  try {
    // Get the audio file from the form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 25MB as per Groq Whisper limits)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      )
    }

    // Try Groq service first
    try {
      const groqService = new GroqService()
      const result = await groqService.transcribe(audioFile, {
        model: 'whisper-large-v3',
        temperature: 0,
        responseFormat: 'json',
        prompt: 'Medical consultation with neurosurgical terminology including GCS, ICP, craniotomy, hydrocephalus, patient assessment, and clinical observations.'
      })
      
      return NextResponse.json(result)
    } catch (error) {
      console.error('Groq service failed:', error)
      
      // Try fallback with AssemblyAI if Groq fails
      console.log('Groq failed, trying AssemblyAI fallback...')
      
      try {
        const assemblyAIService = new AssemblyAIService()
        const result = await assemblyAIService.transcribe(audioFile)
        return NextResponse.json(result)
      } catch (assemblyError) {
        console.error('AssemblyAI fallback failed:', assemblyError)
        
        if (assemblyError instanceof TranscriptionError) {
          return NextResponse.json(
            { error: assemblyError.message, provider: assemblyError.provider },
            { status: assemblyError.statusCode }
          )
        }
        
        return NextResponse.json(
          { error: 'Transcription service temporarily unavailable' },
          { status: 503 }
        )
      }
    }

  } catch (error) {
    console.error('Transcription error:', error)
    
    if (error instanceof TranscriptionError) {
      return NextResponse.json(
        { error: error.message, provider: error.provider },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error during transcription' },
      { status: 500 }
    )
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