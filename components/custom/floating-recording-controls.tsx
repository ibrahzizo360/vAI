"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Pause, Play, StopCircle, Mic, Loader2, X } from "lucide-react"
import { useAudioLevel } from "@/hooks/useAudioLevel"
import { CircularAudioLevelVisualizer } from "./audio-level-visualizer"
import { TranscriptionClient } from "@/lib/client/transcription-client"
// Removed usePathname as it's no longer needed for global visibility

interface TranscriptionData {
  text: string
  speakers: string[]
  metadata: {
    duration: number
    confidence: number
    speaker_count: number
    word_count: number
  }
  analysis?: any
}

interface FloatingRecordingControlsProps {
  onRecordingStop: (data: TranscriptionData) => void
}

export function FloatingRecordingControls({ onRecordingStop }: FloatingRecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [time, setTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioLevel = useAudioLevel(streamRef.current)
  const transcriptionClient = useRef(new TranscriptionClient())

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isRecording && !isPaused) {
      timer = setInterval(() => {
        setTime((prevTime) => prevTime + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isRecording, isPaused])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const transcribeAndAnalyze = async (audioBlob: Blob): Promise<TranscriptionData> => {
    try {
      setIsTranscribing(true)
      
      // Step 1: Transcribe audio using the client service
      // Use Groq for fast transcription, let AI analyze the content
      const transcriptionData = await transcriptionClient.current.transcribe(audioBlob, {
        provider: 'groq',
        fallbackEnabled: true
      })
      
      setIsTranscribing(false)
      setIsAnalyzing(true)

      // Step 2: Analyze transcript with AI
      const analysisResponse = await fetch('/api/analyze-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcriptionData.text,
          speakers: transcriptionData.speakers || [],
          metadata: transcriptionData.metadata || {}
        }),
      })

      let analysis = null
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json()
        console.log('Analysis response received:', analysisData)
        // The API returns the analysis directly, not nested under .analysis
        analysis = analysisData
      } else {
        console.error('Analysis API failed:', analysisResponse.status, await analysisResponse.text())
      }

      return {
        text: transcriptionData.text || 'No transcription received',
        speakers: transcriptionData.speakers || [],
        metadata: {
          duration: transcriptionData.metadata?.duration || time,
          confidence: transcriptionData.metadata?.confidence || 0,
          speaker_count: transcriptionData.metadata?.speaker_count || 0,
          word_count: transcriptionData.metadata?.word_count || 0
        },
        analysis
      }
    } catch (error) {
      console.error('Transcription/Analysis error:', error)
      return {
        text: 'Error: Unable to transcribe audio. Please try again.',
        speakers: [],
        metadata: {
          duration: time,
          confidence: 0,
          speaker_count: 0,
          word_count: 0
        }
      }
    } finally {
      setIsTranscribing(false)
      setIsAnalyzing(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }
        
        // Create audio blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        // Transcribe and analyze the audio
        const transcriptionData = await transcribeAndAnalyze(audioBlob)
        console.log("Transcription and analysis result:", transcriptionData)
        onRecordingStop(transcriptionData)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setIsPaused(false)
      setTime(0)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      alert("Could not access microphone. Please ensure permissions are granted.")
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      // onRecordingStop is called in mediaRecorderRef.current.onstop
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Override the onstop handler first to prevent processing
      mediaRecorderRef.current.onstop = () => {
        // Do nothing - recording was cancelled
      }
      
      // Stop the recorder without processing the audio
      mediaRecorderRef.current.stop()
    }
    
    // Stop the media stream first to trigger useAudioLevel cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    
    // Reset state
    setIsRecording(false)
    setIsPaused(false)
    setTime(0)
    
    // Clear the audio chunks to prevent processing
    audioChunksRef.current = []
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 rounded-full shadow-lg border border-gray-200 max-w-[calc(100vw-2rem)] overflow-hidden">
      {!isRecording && !isTranscribing && !isAnalyzing && (
        <Button
          variant="default"
          size="icon"
          className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors duration-200"
          onClick={startRecording}
          aria-label="Start recording"
        >
          <Mic className="h-6 w-6 sm:h-8 sm:w-8" />
        </Button>
      )}

      {(isTranscribing || isAnalyzing) && (
        <div className="flex items-center gap-3 px-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-primary font-medium">
            {isTranscribing ? 'Transcribing audio...' : 'Analyzing conversation...'}
          </span>
        </div>
      )}

      {isRecording && (
        <>
          <div className="flex items-center gap-2 sm:gap-3">
            <CircularAudioLevelVisualizer 
              level={audioLevel} 
              isRecording={isRecording && !isPaused}
              className="flex-shrink-0"
            />
          </div>
          <div className="text-primary text-lg sm:text-2xl font-bold tabular-nums min-w-[4rem] text-center" aria-live="polite">
            {formatTime(time)}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 border-gray-500 text-gray-500 hover:bg-gray-500 hover:text-white transition-colors duration-200 bg-transparent"
            onClick={cancelRecording}
            aria-label="Cancel recording"
            disabled={isTranscribing || isAnalyzing}
          >
            <X className="h-4 w-4 sm:h-6 sm:w-6" />
          </Button>
          {isPaused ? (
            <Button
              variant="default"
              size="icon"
              className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
              onClick={resumeRecording}
              aria-label="Resume recording"
              disabled={isTranscribing || isAnalyzing}
            >
              <Play className="h-6 w-6 sm:h-8 sm:w-8" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-yellow-600 text-white shadow-lg hover:bg-yellow-700 transition-colors duration-200 disabled:opacity-50"
              onClick={pauseRecording}
              aria-label="Pause recording"
              disabled={isTranscribing || isAnalyzing}
            >
              <Pause className="h-6 w-6 sm:h-8 sm:w-8" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors duration-200 bg-transparent disabled:opacity-50"
            onClick={stopRecording}
            aria-label="Stop recording and open review modal"
            disabled={isTranscribing || isAnalyzing}
          >
            <StopCircle className="h-4 w-4 sm:h-6 sm:w-6" />
          </Button>
        </>
      )}
    </div>
  )
}
