import { TranscriptionService, TranscriptionResult, TranscriptionConfig, TranscriptionError } from '../types/transcription'
import { GroqService } from './groq.service'
import { LiteLLMService } from './litellm.service'
import { AssemblyAIService } from './assembly-ai.service'

export type TranscriptionProvider = 'groq' | 'litellm' | 'assemblyai'

export interface TranscriptionOrchestatorConfig {
  primaryProvider: TranscriptionProvider
  fallbackProviders: TranscriptionProvider[]
  transcriptionConfig?: TranscriptionConfig
}

export class TranscriptionOrchestrator {
  private services: Map<TranscriptionProvider, TranscriptionService> = new Map()

  constructor() {
    // Initialize services
    try {
      this.services.set('groq', new GroqService())
    } catch (error) {
      console.warn('Groq service initialization failed:', error)
    }

    try {
      this.services.set('litellm', new LiteLLMService())
    } catch (error) {
      console.warn('LiteLLM service initialization failed:', error)
    }

    try {
      this.services.set('assemblyai', new AssemblyAIService())
    } catch (error) {
      console.warn('AssemblyAI service initialization failed:', error)
    }
  }

  async transcribe(
    audioFile: File,
    config: TranscriptionOrchestatorConfig
  ): Promise<TranscriptionResult> {
    const { primaryProvider, fallbackProviders, transcriptionConfig } = config
    const allProviders = [primaryProvider, ...fallbackProviders]
    
    for (const provider of allProviders) {
      const service = this.services.get(provider)
      
      if (!service) {
        console.warn(`Service for provider ${provider} not available`)
        continue
      }

      try {
        console.log(`Attempting transcription with ${provider}...`)
        const result = await service.transcribe(audioFile, transcriptionConfig)
        
        // Mark as fallback if not the primary provider
        if (provider !== primaryProvider) {
          result.fallback = true
        }
        
        console.log(`Transcription successful with ${provider}`)
        return result
      } catch (error) {
        console.error(`Transcription failed with ${provider}:`, error)
        
        // If this is the last provider, throw the error
        if (provider === allProviders[allProviders.length - 1]) {
          if (error instanceof TranscriptionError) {
            throw error
          }
          throw new TranscriptionError(
            'All transcription services failed',
            503,
            'All providers'
          )
        }
        
        // Continue to next provider
        continue
      }
    }

    throw new TranscriptionError('No transcription services available', 503, 'All providers')
  }

  getAvailableProviders(): TranscriptionProvider[] {
    return Array.from(this.services.keys())
  }

  isProviderAvailable(provider: TranscriptionProvider): boolean {
    return this.services.has(provider)
  }
}