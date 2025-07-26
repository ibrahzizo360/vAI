"use client"

import { cn } from "@/lib/utils"

interface AudioLevelVisualizerProps {
  level: number
  isRecording: boolean
  className?: string
}

export function AudioLevelVisualizer({ level, isRecording, className }: AudioLevelVisualizerProps) {
  // Create 20 bars for the visualizer
  const bars = Array.from({ length: 20 }, (_, i) => {
    const barThreshold = (i + 1) * 5 // Each bar represents 5% increment
    const isActive = level >= barThreshold
    const intensity = Math.max(0, Math.min(1, (level - barThreshold + 5) / 5))
    
    return {
      id: i,
      isActive,
      intensity,
      height: 20 + (i * 2), // Bars get taller towards the end
    }
  })

  return (
    <div className={cn("flex items-end gap-0.5 h-12", className)}>
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={cn(
            "w-1.5 transition-all duration-150 ease-out rounded-t-sm",
            isRecording && bar.isActive
              ? level > 70
                ? "bg-red-500" // High volume - red
                : level > 40
                ? "bg-yellow-500" // Medium volume - yellow
                : "bg-green-500" // Low volume - green
              : "bg-gray-300" // Inactive
          )}
          style={{
            height: `${bar.height}%`,
            opacity: isRecording && bar.isActive ? 0.7 + (bar.intensity * 0.3) : 0.3,
            transform: isRecording && bar.isActive ? `scaleY(${0.8 + bar.intensity * 0.4})` : 'scaleY(0.5)',
          }}
        />
      ))}
    </div>
  )
}

interface CircularAudioLevelVisualizerProps {
  level: number
  isRecording: boolean
  className?: string
}

export function CircularAudioLevelVisualizer({ level, isRecording, className }: CircularAudioLevelVisualizerProps) {
  const circumference = 2 * Math.PI * 45 // radius of 45
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (level / 100) * circumference

  return (
    <div className={cn("relative", className)}>
      <svg className="w-14 h-14 sm:w-20 sm:h-20 -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-gray-200"
        />
        {/* Level indicator circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "transition-all duration-150 ease-out",
            isRecording
              ? level > 70
                ? "text-red-500"
                : level > 40
                ? "text-yellow-500"
                : "text-green-500"
              : "text-gray-300"
          )}
          strokeLinecap="round"
        />
      </svg>
      {/* Center dot that pulses with audio */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          isRecording && "animate-pulse"
        )}
      >
        <div
          className={cn(
            "w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-150",
            isRecording
              ? level > 70
                ? "bg-red-500"
                : level > 40
                ? "bg-yellow-500"
                : "bg-green-500"
              : "bg-gray-300"
          )}
          style={{
            transform: isRecording ? `scale(${1 + (level / 100) * 0.5})` : 'scale(1)',
          }}
        />
      </div>
    </div>
  )
}