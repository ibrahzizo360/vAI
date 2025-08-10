"use client"

interface VoiceControlIndicatorProps {
  isListening: boolean
  isProcessingCommand: boolean
  lastCommand?: string | null
  className?: string
  isSupported?: boolean
  error?: string | null
  onActivate?: () => void
}

export function VoiceControlIndicator(props: VoiceControlIndicatorProps) {
  // Suppress unused parameter warnings by referencing the props
  void props;

  // Don't show any indicators - completely silent operation
  return null
}