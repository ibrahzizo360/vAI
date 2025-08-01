"use client" // Make layout a client component

import type React from "react"
import { Montserrat } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { FloatingRecordingControls } from "@/components/custom/floating-recording-controls"
import { TranscriptReviewModal } from "@/components/custom/transcript-review-modal"
import { useState, useEffect } from "react"

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

const montserrat = Montserrat({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [currentTranscriptData, setCurrentTranscriptData] = useState<{
    rawText: string
    analysis: any
    metadata: any
  }>({ 
    rawText: "",
    analysis: null,
    metadata: null
  })

  const handleRecordingStop = (data: TranscriptionData) => {
    console.log("Recording stopped, data:", data)
    setCurrentTranscriptData({ 
      rawText: data.text,
      analysis: data.analysis,
      metadata: data.metadata
    })
    setShowReviewModal(true)
  }

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }

  }, [])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light" // Default to light theme as per design
      enableSystem
      disableTransitionOnChange
    >
      {children} {/* This renders your page content */}
      {/* Floating controls and modal are now global */}
      <FloatingRecordingControls onRecordingStop={handleRecordingStop} />
      <TranscriptReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        transcriptData={currentTranscriptData}
      />
    </ThemeProvider>
  )
}
