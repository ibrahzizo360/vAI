// Cache busting utilities

export function generateCacheKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function addNoCacheHeaders(response: Response): Response {
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}

export function clearServiceWorkerCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.ready.then((registration) => {
      return registration.active?.postMessage({ type: 'CLEAR_CACHE' })
    })
  }
  return Promise.resolve()
}

export function forceCacheRefresh(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    })
  } else {
    window.location.reload()
  }
}

// Client-side cache busting for fetch requests
export function fetchWithoutCache(url: string, options: RequestInit = {}): Promise<Response> {
  const cacheBustedUrl = new URL(url, window.location.origin)
  cacheBustedUrl.searchParams.set('_t', Date.now().toString())
  
  return fetch(cacheBustedUrl.toString(), {
    ...options,
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...options.headers,
    },
  })
}