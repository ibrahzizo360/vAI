import { Utterance, SpeakerAnalysis, SpeakingStats } from '../types/transcription'

export class TranscriptFormatter {
  private static readonly MEDICAL_PROFESSIONAL_INDICATORS = [
    'medication', 'condition', 'feeling', 'symptoms', 'treatment',
    'prescription', 'diagnosis', 'how are you', 'what\'s the',
    'have you taken', 'do you', 'examination', 'test'
  ]

  private static readonly PATIENT_INDICATORS = [
    'i feel', 'i\'m feeling', 'i don\'t', 'i can\'t', 'i have',
    'my pain', 'it hurts', 'i\'m not', 'please help', 'i need'
  ]

  private static readonly MEDICAL_ABBREVIATIONS = [
    { pattern: /\bg\.c\.s\.?\s*(\d+)/gi, replacement: 'GCS $1' },
    { pattern: /\bi\.c\.p\.?/gi, replacement: 'ICP' },
    { pattern: /\bevd\b/gi, replacement: 'EVD' },
    { pattern: /\bmri\b/gi, replacement: 'MRI' },
    { pattern: /\bct\b/gi, replacement: 'CT' },
    { pattern: /\bbp\b/gi, replacement: 'BP' },
    { pattern: /\bhr\b/gi, replacement: 'HR' }
  ]

  static analyzeSpeakers(utterances: Utterance[]): { [key: string]: string } {
    const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))]
    const speakerMapping: { [key: string]: string } = {}

    const speakerAnalysis = uniqueSpeakers.map(speaker => {
      const speakerUtterances = utterances.filter(u => u.speaker === speaker)
      const combinedText = speakerUtterances.map(u => u.text.toLowerCase()).join(' ')

      const professionalScore = this.MEDICAL_PROFESSIONAL_INDICATORS.reduce((score, indicator) =>
        score + (combinedText.includes(indicator) ? 1 : 0), 0
      )

      const patientScore = this.PATIENT_INDICATORS.reduce((score, indicator) =>
        score + (combinedText.includes(indicator) ? 1 : 0), 0
      )

      return { 
        speaker, 
        professionalScore, 
        patientScore, 
        utteranceCount: speakerUtterances.length 
      }
    })

    // Sort by likely medical professional (higher professional score)
    speakerAnalysis.sort((a, b) => b.professionalScore - a.professionalScore)

    speakerAnalysis.forEach((analysis, index) => {
      if (index === 0 && analysis.professionalScore > 0) {
        speakerMapping[analysis.speaker] = '👨‍⚕️ HEALTHCARE PROVIDER'
      } else if (analysis.patientScore > analysis.professionalScore) {
        speakerMapping[analysis.speaker] = '🤒 PATIENT'
      } else {
        speakerMapping[analysis.speaker] = index === 1 ? '👤 PATIENT/FAMILY' : `👥 PARTICIPANT ${index + 1}`
      }
    })

    return speakerMapping
  }

  static enhanceMedicalText(text: string): string {
    let enhancedText = text.trim()

    this.MEDICAL_ABBREVIATIONS.forEach(({ pattern, replacement }) => {
      enhancedText = enhancedText.replace(pattern, replacement)
    })

    return enhancedText
  }

  static formatTimestamp(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  static getConfidenceLevel(confidence: number): string {
    const confidencePercent = Math.round(confidence * 100)
    return confidencePercent > 90 ? 'HIGH' : confidencePercent > 75 ? 'MED' : 'LOW'
  }

  static centerText(text: string, width: number = 65): string {
    const padding = Math.max(0, width - text.length)
    const leftPad = Math.floor(padding / 2)
    return ' '.repeat(leftPad) + text
  }

  static wrapText(text: string, width: number = 66, indent: string = '    '): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = indent

    words.forEach(word => {
      if (currentLine.length + word.length + 1 > width) {
        lines.push(currentLine)
        currentLine = indent + word
      } else {
        currentLine += (currentLine.length > indent.length ? ' ' : '') + word
      }
    })

    if (currentLine.length > indent.length) {
      lines.push(currentLine)
    }

    return lines
  }

  static calculateSpeakingStats(utterances: Utterance[], speakerMapping: { [key: string]: string }, totalDuration: number): SpeakingStats[] {
    const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))]

    return uniqueSpeakers.map(speaker => {
      const speakerUtterances = utterances.filter(u => u.speaker === speaker)
      const totalSpeakerDuration = speakerUtterances.reduce((sum, u) => sum + (u.end - u.start), 0)
      const wordCount = speakerUtterances.reduce((sum, u) => sum + u.text.split(' ').length, 0)

      return {
        speaker: speakerMapping[speaker],
        duration: Math.round(totalSpeakerDuration / 1000),
        wordCount,
        percentage: Math.round((totalSpeakerDuration / (totalDuration * 1000)) * 100)
      }
    })
  }

  static formatProfessionalTranscript(
    utterances: Utterance[],
    metadata: { duration?: number; confidence?: number }
  ): string {
    // Handle case where there are no utterances (e.g., Groq response)
    if (!utterances || utterances.length === 0) {
      return this.formatSimpleTranscript(metadata)
    }

    const speakerMapping = this.analyzeSpeakers(utterances)
    const lines: string[] = []

    // Header
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    lines.push('='.repeat(70))
    lines.push(this.centerText('MEDICAL CONSULTATION TRANSCRIPT'))
    lines.push('='.repeat(70))
    lines.push('')
    lines.push(`Session Date: ${currentDate}`)
    lines.push(`Start Time: ${currentTime}`)
    lines.push(`Consultation Type: ${(metadata.duration || 0) > 600 ? 'Extended Clinical Interview' : 'Standard Patient Consultation'}`)
    lines.push(`Participants: ${Object.values(speakerMapping).join(', ')}`)
    lines.push(`Transcription Accuracy: ${Math.round((metadata.confidence || 0) * 100)}% (AssemblyAI)`)
    lines.push('')
    lines.push('-'.repeat(70))
    lines.push(this.centerText('CONVERSATION TRANSCRIPT'))
    lines.push('-'.repeat(70))
    lines.push('')

    // Process utterances
    utterances.forEach((utterance, index) => {
      const speakerLabel = speakerMapping[utterance.speaker] || `SPEAKER ${utterance.speaker}`
      const timestamp = this.formatTimestamp(utterance.start)
      const enhancedText = this.enhanceMedicalText(utterance.text)
      const confidenceText = this.getConfidenceLevel(utterance.confidence)

      // Add visual separation between different speakers
      const prevSpeaker = index > 0 ? utterances[index - 1].speaker : null
      if (prevSpeaker && prevSpeaker !== utterance.speaker) {
        lines.push('')
      }

      lines.push(`[${timestamp}] ${speakerLabel} (${confidenceText}):`)
      lines.push(...this.wrapText(enhancedText))
      lines.push('')
    })

    // Summary section
    const durationMinutes = Math.ceil((metadata.duration || 0) / 60)
    const totalWords = utterances.reduce((sum, u) => sum + u.text.split(' ').length, 0)
    const avgConfidence = Math.round((metadata.confidence || 0) * 100)
    const speakingStats = this.calculateSpeakingStats(utterances, speakerMapping, metadata.duration || 0)

    lines.push('-'.repeat(70))
    lines.push(this.centerText('CONSULTATION SUMMARY'))
    lines.push('-'.repeat(70))
    lines.push('')

    lines.push('SESSION METRICS:')
    lines.push(`  Duration: ${durationMinutes} minutes (${Math.floor(metadata.duration || 0)}s)`)
    lines.push(`  Total Words: ${totalWords}`)
    lines.push(`  Average Confidence: ${avgConfidence}%`)
    lines.push(`  Participants: ${Object.keys(speakerMapping).length}`)
    lines.push('')

    lines.push('SPEAKING DISTRIBUTION:')
    speakingStats.forEach(stat => {
      lines.push(`  ${stat.speaker}: ${stat.percentage}% (${stat.wordCount} words)`)
    })
    lines.push('')

    lines.push('CONSULTATION DETAILS:')
    lines.push(`  Type: ${(metadata.duration || 0) > 600 ? 'Extended Clinical Interview' : 'Standard Patient Consultation'}`)
    lines.push(`  Specialty: Healthcare/Medical`)
    lines.push(`  Quality: ${avgConfidence > 90 ? 'High' : avgConfidence > 75 ? 'Good' : 'Moderate'} accuracy`)
    lines.push('')

    lines.push('='.repeat(70))
    lines.push(`Generated: ${new Date().toLocaleString('en-US')} | AssemblyAI Universal Model`)
    lines.push('='.repeat(70))

    return lines.join('\n')
  }

  static formatSimpleTranscript(metadata: { duration?: number; confidence?: number }): string {
    const lines: string[] = []
    
    // Header
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    lines.push('='.repeat(70))
    lines.push(this.centerText('MEDICAL CONSULTATION TRANSCRIPT'))
    lines.push('='.repeat(70))
    lines.push('')
    lines.push(`Session Date: ${currentDate}`)
    lines.push(`Start Time: ${currentTime}`)
    lines.push(`Consultation Type: ${(metadata.duration || 0) > 600 ? 'Extended Clinical Interview' : 'Standard Patient Consultation'}`)
    lines.push(`Transcription Provider: Groq Whisper`)
    lines.push('')
    lines.push('-'.repeat(70))
    lines.push(this.centerText('CONVERSATION TRANSCRIPT'))
    lines.push('-'.repeat(70))
    lines.push('')
    lines.push('NOTE: This transcription does not include speaker identification.')
    lines.push('For speaker diarization, please use AssemblyAI service.')
    lines.push('')
    
    return lines.join('\n')
  }

  static formatTextWithSpeakers(text: string, hasSpeakers: boolean = false): string {
    if (!hasSpeakers) {
      // For Groq responses, just return enhanced text
      return this.enhanceMedicalText(text)
    }
    return text
  }
}