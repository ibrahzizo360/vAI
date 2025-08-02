interface GroqMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface GroqChatRequest {
  messages: GroqMessage[]
  model: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

interface GroqChatResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
    finish_reason: string
    index: number
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model: string
}

export class GroqAIService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.groq.com/openai/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY!
    
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY not found in environment variables')
    }
  }

  async chatCompletion(
    messages: GroqMessage[], 
    model = 'llama3-70b-8192', // Groq's most capable model for analysis
    options?: {
      temperature?: number
      max_tokens?: number
    }
  ): Promise<string> {
    try {
      console.log('Making Groq API call for AI analysis...')

      const requestBody: GroqChatRequest = {
        messages,
        model,
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.max_tokens ?? 4000,
        stream: false
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('Groq API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Groq API error:', errorText)
        throw new Error(`Groq API error: ${response.status} - ${errorText}`)
      }

      const data: GroqChatResponse = await response.json()
      console.log('Groq API response received successfully')

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in Groq API response')
      }

      return content
    } catch (error) {
      console.error('Groq API call failed:', error)
      throw new Error(`Groq API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Available Groq models for different use cases (current as of 2024)
  static readonly MODELS = {
    // Latest and most capable models
    LLAMA3_70B: 'llama3-70b-8192',        // Most capable for complex analysis
    LLAMA3_8B: 'llama3-8b-8192',          // Fast and efficient
    // Gemma models
    GEMMA_7B: 'gemma-7b-it',              // Google's Gemma model
    GEMMA2_9B: 'gemma2-9b-it',            // Newer Gemma version
    // Mixtral (if still available)
    MIXTRAL_8X22B: 'mixtral-8x22b-32768', // Newer Mixtral if available
  } as const
}