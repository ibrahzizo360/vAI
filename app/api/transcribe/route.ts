import { NextRequest, NextResponse } from 'next/server'

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

    // Validate file size (max 25MB as per OpenAI Whisper limits)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      )
    }

    // Create form data for LiteLLM API
    const liteLLMFormData = new FormData()
    liteLLMFormData.append('file', audioFile)
    liteLLMFormData.append('model', 'groq/whisper-large-v3') // Primary model
    liteLLMFormData.append('response_format', 'json')
    liteLLMFormData.append('temperature', '0')
    
    // Add medical context prompt for better accuracy 
    liteLLMFormData.append('prompt', 'Medical consultation with neurosurgical terminology including GCS, ICP, craniotomy, hydrocephalus, patient assessment, and clinical observations.')

    // Make request to LiteLLM endpoint
    const response = await fetch(`${process.env.LITELLM_BASE_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LITELLM_API_KEY}`,
      },
      body: liteLLMFormData,
    })

    console.log('Transcription response:', response)

    if (!response.ok) {
      // Try fallback with AssemblyAI if Groq fails
      console.log('Primary model failed, trying AssemblyAI fallback...')
      
      try {
        // Convert File to Buffer for AssemblyAI
        const audioBuffer = await audioFile.arrayBuffer()
        
        // Upload audio to AssemblyAI
        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: {
            'authorization': process.env.ASSEMBLYAI_API_KEY!,
          },
          body: audioBuffer,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload audio to AssemblyAI')
        }

        const { upload_url } = await uploadResponse.json()

        // Create transcription request
        const transcriptionResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'POST',
          headers: {
            'authorization': process.env.ASSEMBLYAI_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio_url: upload_url,
            speech_model: 'universal',
            speaker_labels: true,
            speakers_expected: 2,
          }),
        })

        if (!transcriptionResponse.ok) {
          throw new Error('Failed to create transcription request')
        }

        const { id } = await transcriptionResponse.json()

        // Poll for transcription completion
        while (true) {
          const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
            headers: {
              'authorization': process.env.ASSEMBLYAI_API_KEY!,
            },
          })

          const transcriptionResult = await pollingResponse.json()

          if (transcriptionResult.status === 'completed') {
            // Format transcript with enhanced speaker labels and professional structure
            let formattedText = transcriptionResult.text
            
            if (transcriptionResult.utterances && transcriptionResult.utterances.length > 0) {
              // Type the utterance interface for better type safety
              interface Utterance {
                speaker: string;
                text: string;
                start: number;
                end: number;
                confidence: number;
              }
              
              const utterances = transcriptionResult.utterances as Utterance[]
              const uniqueSpeakers = [...new Set(utterances.map(u => u.speaker))]
              
              // Intelligently map speakers based on content analysis
              const speakerMapping: { [key: string]: string } = {}
              
              // Analyze utterances to identify medical professional vs patient
              const speakerAnalysis = uniqueSpeakers.map(speaker => {
                const speakerUtterances = utterances.filter(u => u.speaker === speaker)
                const combinedText = speakerUtterances.map(u => u.text.toLowerCase()).join(' ')
                
                // Medical professional indicators
                const professionalIndicators = [
                  'medication', 'condition', 'feeling', 'symptoms', 'treatment',
                  'prescription', 'diagnosis', 'how are you', 'what\'s the',
                  'have you taken', 'do you', 'examination', 'test'
                ]
                
                // Patient indicators  
                const patientIndicators = [
                  'i feel', 'i\'m feeling', 'i don\'t', 'i can\'t', 'i have',
                  'my pain', 'it hurts', 'i\'m not', 'please help', 'i need'
                ]
                
                const professionalScore = professionalIndicators.reduce((score, indicator) => 
                  score + (combinedText.includes(indicator) ? 1 : 0), 0
                )
                
                const patientScore = patientIndicators.reduce((score, indicator) => 
                  score + (combinedText.includes(indicator) ? 1 : 0), 0
                )
                
                return { speaker, professionalScore, patientScore, utteranceCount: speakerUtterances.length }
              })
              
              // Sort by likely medical professional (higher professional score, more questions)
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
              
              // Helper function for clean formatting
              const formatLine = (text: string, width: number = 65, char: string = ' ') => {
                const padding = Math.max(0, width - text.length)
                const leftPad = Math.floor(padding / 2)
                const rightPad = padding - leftPad
                return char.repeat(leftPad) + text + char.repeat(rightPad)
              }
              
              const centerText = (text: string, width: number = 65) => {
                const padding = Math.max(0, width - text.length)
                const leftPad = Math.floor(padding / 2)
                return ' '.repeat(leftPad) + text
              }
              
              // Build clean, professional transcript
              const lines: string[] = []
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
              
              // Clean professional header
              lines.push('='.repeat(70))
              lines.push(centerText('MEDICAL CONSULTATION TRANSCRIPT'))
              lines.push('='.repeat(70))
              lines.push('')
              lines.push(`Session Date: ${currentDate}`)
              lines.push(`Start Time: ${currentTime}`)
              lines.push(`Consultation Type: ${transcriptionResult.audio_duration > 600 ? 'Extended Clinical Interview' : 'Standard Patient Consultation'}`)
              lines.push(`Participants: ${Object.values(speakerMapping).join(', ')}`)
              lines.push(`Transcription Accuracy: ${Math.round((transcriptionResult.confidence || 0) * 100)}% (AssemblyAI)`)
              lines.push('')
              lines.push('-'.repeat(70))
              lines.push(centerText('CONVERSATION TRANSCRIPT'))
              lines.push('-'.repeat(70))
              lines.push('')
              
              // Process each utterance with clean, professional formatting
              utterances.forEach((utterance: Utterance, index: number) => {
                const speakerLabel = speakerMapping[utterance.speaker] || `SPEAKER ${utterance.speaker}`
                
                // Convert milliseconds to mm:ss format
                const totalSeconds = Math.floor(utterance.start / 1000)
                const minutes = Math.floor(totalSeconds / 60)
                const seconds = totalSeconds % 60
                const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                
                // Clean and enhance the text
                let text = utterance.text.trim()
                
                // Medical text enhancement (clean, no emojis)
                text = text
                  .replace(/\bg\.c\.s\.?\s*(\d+)/gi, 'GCS $1')
                  .replace(/\bi\.c\.p\.?/gi, 'ICP')
                  .replace(/\bevd\b/gi, 'EVD')
                  .replace(/\bmri\b/gi, 'MRI')
                  .replace(/\bct\b/gi, 'CT')
                  .replace(/\bbp\b/gi, 'BP')
                  .replace(/\bhr\b/gi, 'HR')
                
                // Confidence indicator (simple)
                const confidence = Math.round(utterance.confidence * 100)
                const confidenceText = confidence > 90 ? 'HIGH' : confidence > 75 ? 'MED' : 'LOW'
                
                // Add visual separation between different speakers
                const prevSpeaker = index > 0 ? utterances[index - 1].speaker : null
                if (prevSpeaker && prevSpeaker !== utterance.speaker) {
                  lines.push('')
                }
                
                // Clean professional format
                lines.push(`[${timestamp}] ${speakerLabel} (${confidenceText}):`)
                
                // Smart text wrapping - simple and clean
                const words = text.split(' ')
                let currentLine = '    '  // 4-space indent
                
                words.forEach(word => {
                  if (currentLine.length + word.length + 1 > 66) {
                    lines.push(currentLine)
                    currentLine = '    ' + word
                  } else {
                    currentLine += (currentLine.length > 4 ? ' ' : '') + word
                  }
                })
                
                if (currentLine.length > 4) {
                  lines.push(currentLine)
                }
                
                lines.push('')
              })
              
              // Clean clinical summary section
              const durationMinutes = Math.ceil((transcriptionResult.audio_duration || 0) / 60)
              const totalWords = utterances.reduce((sum, u) => sum + u.text.split(' ').length, 0)
              const avgConfidence = Math.round((transcriptionResult.confidence || 0) * 100)
              
              // Calculate speaking time per participant
              const speakingStats = uniqueSpeakers.map(speaker => {
                const speakerUtterances = utterances.filter(u => u.speaker === speaker)
                const totalDuration = speakerUtterances.reduce((sum, u) => sum + (u.end - u.start), 0)
                const wordCount = speakerUtterances.reduce((sum, u) => sum + u.text.split(' ').length, 0)
                return {
                  speaker: speakerMapping[speaker],
                  duration: Math.round(totalDuration / 1000),
                  wordCount,
                  percentage: Math.round((totalDuration / (transcriptionResult.audio_duration * 1000)) * 100)
                }
              })
              
              lines.push('-'.repeat(70))
              lines.push(centerText('CONSULTATION SUMMARY'))
              lines.push('-'.repeat(70))
              lines.push('')
              
              lines.push('SESSION METRICS:')
              lines.push(`  Duration: ${durationMinutes} minutes (${Math.floor(transcriptionResult.audio_duration || 0)}s)`)
              lines.push(`  Total Words: ${totalWords}`)
              lines.push(`  Average Confidence: ${avgConfidence}%`)
              lines.push(`  Participants: ${uniqueSpeakers.length}`)
              lines.push('')
              
              lines.push('SPEAKING DISTRIBUTION:')
              speakingStats.forEach(stat => {
                lines.push(`  ${stat.speaker}: ${stat.percentage}% (${stat.wordCount} words)`)
              })
              lines.push('')
              
              lines.push('CONSULTATION DETAILS:')
              lines.push(`  Type: ${transcriptionResult.audio_duration > 600 ? 'Extended Clinical Interview' : 'Standard Patient Consultation'}`)
              lines.push(`  Specialty: Healthcare/Medical`)
              lines.push(`  Quality: ${avgConfidence > 90 ? 'High' : avgConfidence > 75 ? 'Good' : 'Moderate'} accuracy`)
              lines.push('')
              
              lines.push('='.repeat(70))
              lines.push(`Generated: ${new Date().toLocaleString('en-US')} | AssemblyAI Universal Model`)
              lines.push('='.repeat(70))
              
              formattedText = lines.join('\n')
            }
            
            return NextResponse.json({
              text: formattedText,
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
            })
          } else if (transcriptionResult.status === 'error') {
            throw new Error(`AssemblyAI transcription failed: ${transcriptionResult.error}`)
          }

          // Wait 3 seconds before next poll
          await new Promise(resolve => setTimeout(resolve, 3000))
        }

      } catch (assemblyError) {
        console.error('AssemblyAI fallback failed:', assemblyError)
        return NextResponse.json(
          { error: 'Transcription service temporarily unavailable' },
          { status: 503 }
        )
      }
    }

    const data = await response.json()
    return NextResponse.json({
      text: data.text,
      model: 'groq/whisper-large-v3',
      fallback: false
    })

  } catch (error) {
    console.error('Transcription error:', error)
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