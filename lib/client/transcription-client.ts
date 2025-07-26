import { TranscriptionResult } from '../types/transcription'

export type TranscriptionProvider = 'groq' | 'litellm' | 'assemblyai'

export interface TranscriptionClientConfig {
  provider?: TranscriptionProvider
  fallbackEnabled?: boolean
}

export class TranscriptionClient {
  private readonly baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async transcribe(
    audioBlob: Blob,
    config: TranscriptionClientConfig = {}
  ): Promise<TranscriptionResult> {
    const { provider = 'groq', fallbackEnabled = true } = config

    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')

    // Choose endpoint based on provider and fallback preference
    let endpoint = `${this.baseUrl}/api/transcribe-v2`
    
    if (fallbackEnabled) {
      // Use the orchestrated endpoint with automatic fallbacks
      endpoint += `?provider=${provider}`
    } else {
      // Use provider-specific endpoint without fallbacks
      switch (provider) {
        case 'groq':
          endpoint = `${this.baseUrl}/api/transcribe-groq`
          break
        case 'litellm':
          endpoint = `${this.baseUrl}/api/transcribe`
          break
        case 'assemblyai':
          endpoint = `${this.baseUrl}/api/transcribe-v2?provider=assemblyai`
          break
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Transcription failed with ${provider}`)
    }

    return await response.json()
  }

  async getProviderStatus(): Promise<{ [key in TranscriptionProvider]: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/transcribe-v2/status`)
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.warn('Failed to get provider status:', error)
    }

    // Default status if endpoint fails
    return {
      groq: true,
      litellm: true,
      assemblyai: true
    }
  }
}