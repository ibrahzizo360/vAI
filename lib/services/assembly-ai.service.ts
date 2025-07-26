import { TranscriptionService, TranscriptionResult, TranscriptionConfig, TranscriptionError, Utterance } from '../types/transcription'
import { TranscriptFormatter } from '../utils/transcript-formatter'

export class AssemblyAIService implements TranscriptionService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.assemblyai.com/v2'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ASSEMBLYAI_API_KEY!
    if (!this.apiKey) {
      throw new TranscriptionError('AssemblyAI API key not found', 500, 'AssemblyAI')
    }
  }

  async transcribe(audioFile: File, config?: TranscriptionConfig): Promise<TranscriptionResult> {
    try {
      // Step 1: Upload audio file
      const uploadUrl = await this.uploadAudio(audioFile)

      // Step 2: Create transcription request
      const transcriptId = await this.createTranscriptionRequest(uploadUrl, config)

      // Step 3: Poll for completion
      const transcriptionResult = await this.pollForCompletion(transcriptId)

      // Step 4: Format the result
      return this.formatResult(transcriptionResult)
    } catch (error) {
      if (error instanceof TranscriptionError) {
        throw error
      }
      throw new TranscriptionError(
        `AssemblyAI transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'AssemblyAI'
      )
    }
  }

  private async uploadAudio(audioFile: File): Promise<string> {
    const audioBuffer = await audioFile.arrayBuffer()

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'authorization': this.apiKey,
      },
      body: audioBuffer,
    })

    if (!response.ok) {
      throw new TranscriptionError('Failed to upload audio to AssemblyAI', response.status, 'AssemblyAI')
    }

    const { upload_url } = await response.json()
    return upload_url
  }

  private async createTranscriptionRequest(uploadUrl: string, config?: TranscriptionConfig): Promise<string> {
    const requestBody = {
      audio_url: uploadUrl,
      speech_model: 'universal',
      speaker_labels: true,
      speakers_expected: 2,
      ...(config?.prompt && { boost_param: 'high' }), // Use boost for medical terminology
    }

    const response = await fetch(`${this.baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new TranscriptionError('Failed to create transcription request', response.status, 'AssemblyAI')
    }

    const { id } = await response.json()
    return id
  }

  private async pollForCompletion(transcriptId: string): Promise<any> {
    const maxAttempts = 60 // 3 minutes max (60 * 3 seconds)
    let attempts = 0

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
        headers: {
          'authorization': this.apiKey,
        },
      })

      if (!response.ok) {
        throw new TranscriptionError('Failed to poll transcription status', response.status, 'AssemblyAI')
      }

      const result = await response.json()

      if (result.status === 'completed') {
        return result
      } else if (result.status === 'error') {
        throw new TranscriptionError(`AssemblyAI transcription failed: ${result.error}`, 500, 'AssemblyAI')
      }

      // Wait 3 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 3000))
      attempts++
    }

    throw new TranscriptionError('Transcription polling timeout', 408, 'AssemblyAI')
  }

  private formatResult(transcriptionResult: any): TranscriptionResult {
    // Just return the enhanced text, let AI analyze the content
    const rawText = transcriptionResult.text || 'No transcription received'
    const enhancedText = TranscriptFormatter.enhanceMedicalText(rawText)

    return {
      text: enhancedText,
      model: 'AssemblyAI',
      fallback: true,
      speakers: transcriptionResult.utterances?.map((u: any) => u.speaker) || [],
      raw_utterances: transcriptionResult.utterances || [],
      metadata: {
        duration: transcriptionResult.audio_duration,
        confidence: transcriptionResult.confidence,
        speaker_count: [...new Set(transcriptionResult.utterances?.map((u: any) => u.speaker) || [])].length,
        word_count: transcriptionResult.utterances?.reduce((sum: number, u: any) => sum + u.text.split(' ').length, 0) || 0
      }
    }
  }
}