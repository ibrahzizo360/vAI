"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface VoiceControlOptions {
  onStartRecording?: () => void
  onShowPatients?: () => void
  enabled?: boolean
}

interface VoiceControlState {
  isListening: boolean
  isProcessingCommand: boolean
  lastCommand: string | null
  error: string | null
  isSupported: boolean
  isActivated: boolean
}

export function useVoiceControl(options: VoiceControlOptions = {}) {
  const { onStartRecording, onShowPatients, enabled = true } = options
  const router = useRouter()
  
  const [state, setState] = useState<VoiceControlState>({
    isListening: false,
    isProcessingCommand: false,
    lastCommand: null,
    error: null,
    isSupported: false,
    isActivated: true // Auto-activate for testing - in production you might want false
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isInitializedRef = useRef(false)

  // Check if Web Speech API is supported
  useEffect(() => {
    const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    console.log('Voice control - Web Speech API supported:', isSupported)
    setState(prev => ({ ...prev, isSupported }))
  }, [])

  // Process voice commands
  const processCommand = useCallback((command: string) => {
    const normalizedCommand = command.toLowerCase().trim()
    console.log('Processing voice command:', normalizedCommand)
    
    setState(prev => ({ 
      ...prev, 
      isProcessingCommand: true, 
      lastCommand: command 
    }))

    // Enhanced wake phrase detection with fuzzy matching
    const wakePhrasesPatterns = [
      // "Hey vAI" variations
      /hey\s*v\s*ai/gi,
      /hey\s*v\s*a\s*i/gi,
      /hey\s*vai/gi,
      /hey\s*vi/gi,
      /hey\s*v\s*i/gi,
      /hey\s*way/gi, // common misinterpretation
      /hey\s*vay/gi,
      /hey\s*bay/gi, // another common mishearing
      
      // Just "vAI" variations
      /^vai\s+/gi,
      /^v\s*ai\s+/gi,
      /^v\s*a\s*i\s+/gi,
      /^vi\s+/gi,
      /^way\s+/gi,
      /^vay\s+/gi,
      
      // "Hey AI" variations
      /hey\s*ai/gi,
      /hey\s*a\s*i/gi,
    ]

    let actualCommand = normalizedCommand
    let wakePhrasFound = false

    // Check if any wake phrase pattern matches
    for (const pattern of wakePhrasesPatterns) {
      if (pattern.test(normalizedCommand)) {
        wakePhrasFound = true
        actualCommand = normalizedCommand.replace(pattern, '').trim()
        console.log('Wake phrase detected, extracted command:', actualCommand)
        break
      }
    }

    // If wake phrase found or direct command, process the command
    if (wakePhrasFound || actualCommand.length > 0) {
      
      // Recording command variations
      const recordingPatterns = [
        /start\s*recording/gi,
        /begin\s*recording/gi,
        /record/gi,
        /start\s*record/gi,
        /recording/gi,
        /record\s*now/gi,
        /start\s*audio/gi,
        /begin\s*audio/gi,
        // Common misheard versions
        /start\s*according/gi, // "recording" -> "according"
        /start\s*recoding/gi,  // "recording" -> "recoding" 
        /start\s*record/gi,
        /record\s*me/gi,
        /make\s*recording/gi,
        /take\s*recording/gi,
      ]

      // Patient navigation variations
      const patientsPatterns = [
        /show\s*patients/gi,
        /go\s*to\s*patients/gi,
        /open\s*patients/gi,
        /view\s*patients/gi,
        /display\s*patients/gi,
        /list\s*patients/gi,
        /patients\s*page/gi,
        /patients\s*list/gi,
        /show\s*patient/gi, // singular
        /go\s*to\s*patient/gi,
        /open\s*patient/gi,
        /view\s*patient/gi,
        // Common misheard versions
        /show\s*patience/gi, // "patients" -> "patience"
        /show\s*patient/gi,
        /go\s*patience/gi,
        /patients/gi, // just "patients"
        /patient/gi,  // just "patient"
      ]

      // Stop/Cancel command variations
      const stopPatterns = [
        /stop\s*recording/gi,
        /end\s*recording/gi,
        /finish\s*recording/gi,
        /cancel\s*recording/gi,
        /stop/gi,
        /cancel/gi,
        /end/gi,
        /finish/gi,
        /done/gi,
      ]

      // Home/Dashboard navigation
      const homePatterns = [
        /go\s*home/gi,
        /home\s*page/gi,
        /dashboard/gi,
        /main\s*page/gi,
        /go\s*back/gi,
        /back\s*home/gi,
        /home/gi,
      ]

      // Help command variations
      const helpPatterns = [
        /help/gi,
        /what\s*can\s*you\s*do/gi,
        /commands/gi,
        /what\s*commands/gi,
        /how\s*to/gi,
        /instructions/gi,
      ]

      // Recent/History commands
      const recentPatterns = [
        /show\s*recent/gi,
        /recent\s*patients/gi,
        /recent\s*notes/gi,
        /recent\s*activity/gi,
        /show\s*history/gi,
        /recent\s*history/gi,
        /last\s*patients/gi,
        /latest\s*patients/gi,
        /recent/gi,
        /history/gi,
      ]

      // Notes/Clinical Notes commands
      const notesPatterns = [
        /show\s*notes/gi,
        /clinical\s*notes/gi,
        /open\s*notes/gi,
        /view\s*notes/gi,
        /notes/gi,
        /show\s*clinical/gi,
        /clinical/gi,
      ]

      // Search commands
      const searchPatterns = [
        /search\s*for/gi,
        /find\s*patient/gi,
        /search\s*patient/gi,
        /look\s*for/gi,
        /find/gi,
        /search/gi,
      ]

      // AI Chat commands
      const chatPatterns = [
        /show\s*ai\s*chat/gi,
        /open\s*ai\s*chat/gi,
        /ai\s*chat/gi,
        /chat\s*with\s*ai/gi,
        /start\s*chat/gi,
        /open\s*chat/gi,
        /show\s*chat/gi,
        /talk\s*to\s*ai/gi,
        /ai\s*assistant/gi,
        /chat/gi,
      ]

      // Check for recording commands
      if (recordingPatterns.some(pattern => pattern.test(actualCommand))) {
        console.log('Voice command: Start recording')
        if (onStartRecording) {
          onStartRecording()
        }
        return 'Recording started'
      }
      
      // Check for patients navigation
      if (patientsPatterns.some(pattern => pattern.test(actualCommand))) {
        console.log('Voice command: Show patients')
        router.push('/patients')
        if (onShowPatients) {
          onShowPatients()
        }
        return 'Navigating to patients'
      }

      // Check for home navigation
      if (homePatterns.some(pattern => pattern.test(actualCommand))) {
        console.log('Voice command: Go home')
        router.push('/')
        return 'Going to dashboard'
      }

      // Check for recent/history commands
      if (recentPatterns.some(pattern => pattern.test(actualCommand))) {
        console.log('Voice command: Show recent')
        // For now, go to patients page (could be enhanced to show recent patients)
        router.push('/patients')
        return 'Showing recent activity'
      }

      // Check for notes commands
      if (notesPatterns.some(pattern => pattern.test(actualCommand))) {
        console.log('Voice command: Show notes')
        // Go to patients page since notes are accessed through patients
        router.push('/patients')
        return 'Navigating to clinical notes'
      }

      // Check for search commands
      if (searchPatterns.some(pattern => pattern.test(actualCommand))) {
        console.log('Voice command: Search')
        router.push('/patients')
        return 'Opening search - use the search bar on patients page'
      }

      // Check for AI chat commands
      if (chatPatterns.some(pattern => pattern.test(actualCommand))) {
        console.log('Voice command: Show AI chat')
        // For now, go to patients page where AI chat is available
        router.push('/patients')
        return 'Opening AI chat - select a patient to chat about them'
      }

      // Check for help commands
      if (helpPatterns.some(pattern => pattern.test(actualCommand))) {
        console.log('Voice command: Help')
        return 'Available commands: "start recording", "show patients", "go home", "show recent", "show notes", "show ai chat"'
      }

      // Check for stop commands (future feature)
      if (stopPatterns.some(pattern => pattern.test(actualCommand))) {
        console.log('Voice command: Stop (not implemented yet)')
        return 'Stop command recognized (coming soon)'
      }

      // If we detected a wake phrase but no recognized command
      if (wakePhrasFound && actualCommand) {
        console.log('Wake phrase detected but command not recognized:', actualCommand)
        return `I heard "${actualCommand}" but didn't understand. Try "start recording", "show patients", or "go home"`
      }
    }

    return null
  }, [onStartRecording, onShowPatients, router])

  // Initialize speech recognition
  useEffect(() => {
    if (!state.isSupported || !enabled || isInitializedRef.current || !state.isActivated) {
      console.log('Voice control - Not initializing:', { 
        isSupported: state.isSupported, 
        enabled, 
        isInitialized: isInitializedRef.current,
        isActivated: state.isActivated
      })
      return
    }

    console.log('Voice control - Initializing speech recognition...')

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      console.log('Voice control - Speech recognition configured')

      recognition.onstart = () => {
        console.log('Voice recognition started')
        setState(prev => ({ ...prev, isListening: true, error: null }))
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1]
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript
          console.log('Voice transcript:', transcript)
          
          const response = processCommand(transcript)
          if (response) {
            console.log('Voice command response:', response)
            // Brief delay to show processing state
            setTimeout(() => {
              setState(prev => ({ 
                ...prev, 
                isProcessingCommand: false 
              }))
            }, 1000)
          } else {
            setState(prev => ({ 
              ...prev, 
              isProcessingCommand: false 
            }))
          }
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error)
        setState(prev => ({ 
          ...prev, 
          error: `Speech recognition error: ${event.error}`,
          isListening: false,
          isProcessingCommand: false
        }))
        
        // Restart after error (except for not-allowed)
        if (event.error !== 'not-allowed') {
          setTimeout(() => {
            try {
              recognition.start()
            } catch (err) {
              console.error('Failed to restart recognition:', err)
            }
          }, 1000)
        }
      }

      recognition.onend = () => {
        console.log('Voice recognition ended')
        setState(prev => ({ ...prev, isListening: false }))
        
        // Restart recognition to keep listening
        if (enabled && state.isSupported) {
          setTimeout(() => {
            try {
              recognition.start()
            } catch (err) {
              console.error('Failed to restart recognition:', err)
            }
          }, 100)
        }
      }

      recognitionRef.current = recognition
      isInitializedRef.current = true

      // Start recognition
      console.log('Voice control - Starting speech recognition...')
      recognition.start()

    } catch (error) {
      console.error('Failed to initialize speech recognition:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize voice control',
        isSupported: false
      }))
    }
  }, [state.isSupported, enabled, processCommand, state.isActivated])

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [])

  const activate = useCallback(() => {
    console.log('Voice control - Activating...')
    setState(prev => ({ ...prev, isActivated: true }))
    // Reset initialization flag so it can initialize
    isInitializedRef.current = false
  }, [])

  const startListening = useCallback(() => {
    if (recognitionRef.current && state.isSupported) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error('Failed to start listening:', error)
      }
    }
  }, [state.isSupported])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  return {
    ...state,
    startListening,
    stopListening,
    activate
  }
}

