"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setShowInstallButton(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt so it can only be used once
    setDeferredPrompt(null)
    setShowInstallButton(false)
  }

  const handleDismiss = () => {
    setShowInstallButton(false)
  }

  if (!showInstallButton) {
    return null
  }

  return (
    <div className="fixed top-2 left-2 right-2 sm:top-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 sm:p-3 flex items-center gap-2 sm:gap-3 sm:max-w-sm">
      {/* Mobile: Compact layout */}
      <div className="flex-1 sm:block">
        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
          Install vAI App
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
          Get quick access and work offline
        </p>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          size="sm"
          onClick={handleInstallClick}
          className="h-7 px-2 sm:h-8 sm:px-3 text-xs whitespace-nowrap"
        >
          <Download className="h-3 w-3 sm:mr-1" />
          <span className="hidden sm:inline">Install</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}