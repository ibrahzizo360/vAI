import { useEffect } from 'react'
import { clearServiceWorkerCaches, forceCacheRefresh } from '@/lib/utils/cache'

export function useCacheInvalidation() {
  const invalidateCache = () => {
    clearServiceWorkerCaches()
  }

  const forceRefresh = () => {
    forceCacheRefresh()
  }

  // Force refresh on mount in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Add a small delay to ensure service worker is ready
      setTimeout(invalidateCache, 1000)
    }
  }, [])

  return { invalidateCache, forceRefresh }
}

export function useAutoRefresh(interval: number = 30000) {
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Check if there are updates available
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update()
        })
      }
    }, interval)

    return () => clearInterval(intervalId)
  }, [interval])
}