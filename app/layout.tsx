import type React from "react"
import type { Metadata, Viewport } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"
import ClientLayout from "./client-layout"

const montserrat = Montserrat({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "vAI - Voice-to-Text for Neurosurgery",
  description: "AI-powered voice-to-text transcription tool for neurosurgical environments.",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192x192.png",
  },
  generator: 'v0.dev',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'vAI',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#3B82F6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={montserrat.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
