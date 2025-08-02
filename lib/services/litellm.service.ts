import { TranscriptionService, TranscriptionResult, TranscriptionConfig, TranscriptionError } from '../types/transcription'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatCompletionConfig {
  model?: string
  temperature?: number
  max_tokens?: number
}

export class LiteLLMService implements TranscriptionService {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.LITELLM_API_KEY!
    this.baseUrl = baseUrl || process.env.LITELLM_BASE_URL!
    
    if (!this.apiKey) {
      throw new TranscriptionError('LiteLLM API key not found', 500, 'LiteLLM')
    }
    if (!this.baseUrl) {
      throw new TranscriptionError('LiteLLM base URL not found', 500, 'LiteLLM')
    }
  }

  async transcribe(audioFile: File, config?: TranscriptionConfig): Promise<TranscriptionResult> {
    try {
      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('model', config?.model || 'groq/whisper-large-v3')
      formData.append('response_format', config?.responseFormat || 'json')
      formData.append('temperature', (config?.temperature || 0).toString())
      
      if (config?.prompt) {
        formData.append('prompt', config.prompt)
      }

      console.log('Making LiteLLM API call...')

      const response = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      console.log('LiteLLM response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('LiteLLM API error:', errorText)
        throw new TranscriptionError(
          `LiteLLM API error: ${response.status} - ${errorText}`,
          response.status,
          'LiteLLM'
        )
      }

      const data = await response.json()
      console.log('LiteLLM response data:', data)

      return {
        text: data.text || 'No transcription received',
        model: config?.model || 'groq/whisper-large-v3',
        fallback: false,
        metadata: {
          word_count: data.text ? data.text.split(' ').length : 0
        }
      }
    } catch (error) {
      if (error instanceof TranscriptionError) {
        throw error
      }
      throw new TranscriptionError(
        `LiteLLM transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'LiteLLM'
      )
    }
  }

  // Add chat completion method for AI analysis
  async chatCompletion(messages: ChatMessage[], config?: ChatCompletionConfig): Promise<string> {
    try {
      console.log('Making LiteLLM chat completion call...')

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config?.model || 'claude-3-sonnet-20240229',
          messages,
          temperature: config?.temperature || 0.1,
          max_tokens: config?.max_tokens || 4000,
        }),
      })

      console.log('LiteLLM chat completion response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('LiteLLM chat completion error:', errorText)
        throw new Error(`LiteLLM API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('LiteLLM chat completion response received')

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in LiteLLM response')
      }

      return content
    } catch (error) {
      console.error('LiteLLM chat completion failed:', error)
      throw new Error(`LiteLLM chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}