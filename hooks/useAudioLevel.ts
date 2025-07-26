import { useEffect, useRef, useState } from 'react'

export function useAudioLevel(stream: MediaStream | null) {
  const [audioLevel, setAudioLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!stream) {
      // Clean up when stream is null
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      setAudioLevel(0)
      return
    }

    // Create audio context and analyser
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    analyserRef.current = audioContextRef.current.createAnalyser()
    
    // Configure analyser
    analyserRef.current.fftSize = 256
    analyserRef.current.smoothingTimeConstant = 0.8

    // Connect stream to analyser
    const source = audioContextRef.current.createMediaStreamSource(stream)
    source.connect(analyserRef.current)

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

    const updateAudioLevel = () => {
      if (!analyserRef.current) return

      analyserRef.current.getByteFrequencyData(dataArray)
      
      // Calculate RMS (Root Mean Square) for more accurate level detection
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / dataArray.length)
      
      // Normalize to 0-100 range with logarithmic scaling for better visual representation
      const normalizedLevel = Math.min(100, (rms / 255) * 100)
      const logLevel = normalizedLevel > 0 ? Math.log10(normalizedLevel + 1) * 50 : 0
      
      setAudioLevel(Math.round(logLevel))
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
    }

    updateAudioLevel()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stream])

  return audioLevel
}