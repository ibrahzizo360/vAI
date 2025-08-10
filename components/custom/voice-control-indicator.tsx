"use client"

import { useState, useEffect } from 'react'
import { Mic, Volume2, Brain } from 'lucide-react'

interface VoiceControlIndicatorProps {
  isListening: boolean
  isProcessingCommand: boolean
  lastCommand?: string | null
  className?: string
  isSupported?: boolean
  error?: string | null
  onActivate?: () => void
}

export function VoiceControlIndicator({ 
  isListening, 
  isProcessingCommand, 
  lastCommand,
  className = "",
  isSupported = true,
  error = null,
  onActivate
}: VoiceControlIndicatorProps) {
  const [showCommand, setShowCommand] = useState(false)

  // Show command feedback briefly
  useEffect(() => {
    if (lastCommand) {
      setShowCommand(true)
      const timer = setTimeout(() => {
        setShowCommand(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [lastCommand])

  // Show activation button if not supported or has error
  if (!isSupported || error) {
    return (
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-3 max-w-xs">
          <div className="flex items-center gap-3">
            <Mic className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Voice Control</p>
              <p className="text-xs text-yellow-600">
                {error || "Not supported in this browser"}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Don't show the listening indicator unless there's actual activity
  if (!isProcessingCommand && !showCommand) {
    return null
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {isProcessingCommand ? (
              <Brain className="h-5 w-5 text-purple-600 animate-pulse" />
            ) : isListening ? (
              <Mic className="h-5 w-5 text-red-600 animate-pulse" />
            ) : (
              <Volume2 className="h-5 w-5 text-green-600" />
            )}
          </div>

          {/* Status Text */}
          <div className="flex-1 min-w-0">
            {isProcessingCommand ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-purple-700">Processing...</p>
                {lastCommand && (
                  <p className="text-xs text-gray-600 truncate">"{lastCommand}"</p>
                )}
              </div>
            ) : showCommand ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-700">Command executed!</p>
                {lastCommand && (
                  <p className="text-xs text-gray-600 truncate">"{lastCommand}"</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  )
}