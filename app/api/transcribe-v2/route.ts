import { NextRequest, NextResponse } from 'next/server'
import { TranscriptionOrchestrator } from '@/lib/services/transcription-orchestrator'
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

    // Validate file size (max 25MB as per Whisper limits)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      )
    }

    // Get provider preference from query params (optional)
    const url = new URL(request.url)
    const preferredProvider = url.searchParams.get('provider') as 'groq' | 'litellm' | 'assemblyai' || 'groq'

    // Initialize orchestrator
    const orchestrator = new TranscriptionOrchestrator()

    // Configure transcription with medical context
    const result = await orchestrator.transcribe(audioFile, {
      primaryProvider: preferredProvider,
      fallbackProviders: preferredProvider === 'groq' 
        ? ['assemblyai'] 
        : preferredProvider === 'litellm' 
        ? ['groq', 'assemblyai'] 
        : ['groq'],
      transcriptionConfig: {
        model: preferredProvider === 'groq' ? 'whisper-large-v3' : 'groq/whisper-large-v3',
        temperature: 0,
        responseFormat: 'json',
        prompt: 'Medical consultation with neurosurgical terminology including GCS, ICP, craniotomy, hydrocephalus, patient assessment, and clinical observations.'
      }
    })

    return NextResponse.json(result)

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