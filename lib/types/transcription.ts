export interface TranscriptionResult {
  text: string
  model: string
  fallback: boolean
  speakers?: string[]
  raw_utterances?: Utterance[]
  metadata?: TranscriptionMetadata
}

export interface TranscriptionMetadata {
  duration?: number
  confidence?: number
  speaker_count?: number
  word_count?: number
}

export interface Utterance {
  speaker: string
  text: string
  start: number
  end: number
  confidence: number
}

export interface TranscriptionConfig {
  model?: string
  temperature?: number
  prompt?: string
  responseFormat?: string
}

export interface TranscriptionService {
  transcribe(audioFile: File, config?: TranscriptionConfig): Promise<TranscriptionResult>
}

export interface SpeakerAnalysis {
  speaker: string
  professionalScore: number
  patientScore: number
  utteranceCount: number
}

export interface SpeakingStats {
  speaker: string
  duration: number
  wordCount: number
  percentage: number
}

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public provider?: string
  ) {
    super(message)
    this.name = 'TranscriptionError'
  }
}