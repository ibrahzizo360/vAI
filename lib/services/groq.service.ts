import { TranscriptionService, TranscriptionResult, TranscriptionConfig, TranscriptionError } from '../types/transcription'
import { TranscriptFormatter } from '../utils/transcript-formatter'

export class GroqService implements TranscriptionService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.groq.com/openai/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY!
    if (!this.apiKey) {
      throw new TranscriptionError('Groq API key not found', 500, 'Groq')
    }
  }

  async transcribe(audioFile: File, config?: TranscriptionConfig): Promise<TranscriptionResult> {
    try {
      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('model', config?.model || 'whisper-large-v3')
      formData.append('response_format', config?.responseFormat || 'json')
      formData.append('temperature', (config?.temperature || 0).toString())
      
      if (config?.prompt) {
        formData.append('prompt', config.prompt)
      }

      console.log('Making direct Groq API call...')

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      console.log('Groq response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Groq API error:', errorText)
        throw new TranscriptionError(
          `Groq API error: ${response.status} - ${errorText}`,
          response.status,
          'Groq'
        )
      }

      const data = await response.json()
      console.log('Groq response data:', data)

      const rawText = data.text || 'No transcription received'
      
      // Just enhance medical terminology, keep it simple for AI analysis
      const enhancedText = TranscriptFormatter.enhanceMedicalText(rawText)

      return {
        text: enhancedText,
        model: `groq/${config?.model || 'whisper-large-v3'}`,
        fallback: false,
        speakers: [],
        raw_utterances: [],
        metadata: {
          word_count: rawText.split(' ').length,
          speaker_count: 0,
          confidence: 1.0
        }
      }
    } catch (error) {
      if (error instanceof TranscriptionError) {
        throw error
      }
      throw new TranscriptionError(
        `Groq transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'Groq'
      )
    }
  }
}