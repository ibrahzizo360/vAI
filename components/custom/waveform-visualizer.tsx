"use client"

import { useRef, useEffect } from "react"

interface WaveformVisualizerProps {
  audioData: Float32Array | null
}

export function WaveformVisualizer({ audioData }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    const width = canvas.width
    const height = canvas.height

    context.clearRect(0, 0, width, height)
    context.fillStyle = "#F3F6F8" // Light Grey background
    context.fillRect(0, 0, width, height)

    if (audioData) {
      context.lineWidth = 2
      context.strokeStyle = "#003366" // Deep Navy waveform
      context.beginPath()

      const sliceWidth = (width * 1.0) / audioData.length
      let x = 0

      for (let i = 0; i < audioData.length; i++) {
        const v = audioData[i] * 0.5 + 0.5 // Normalize to 0-1 range
        const y = v * height

        if (i === 0) {
          context.moveTo(x, y)
        } else {
          context.lineTo(x, y)
        }

        x += sliceWidth
      }

      context.lineTo(width, height / 2)
      context.stroke()
    } else {
      // Draw a flat line if no audio data
      context.lineWidth = 2
      context.strokeStyle = "#003366"
      context.beginPath()
      context.moveTo(0, height / 2)
      context.lineTo(width, height / 2)
      context.stroke()
    }
  }, [audioData])

  return (
    <canvas
      ref={canvasRef}
      width={400} // Fixed width for consistent visualization
      height={160} // Fixed height
      className="w-full h-full rounded-md border border-gray-200"
      aria-label="Audio waveform visualization"
    />
  )
}
