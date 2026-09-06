'use client'

import { useEffect, useState } from 'react'

export function useFetch<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!url)

  useEffect(() => {
    let active = true
    if (!url) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetch(url)
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text().catch(() => r.statusText)
          throw new Error(`${r.status}: ${text || r.statusText}`)
        }
        return r.json() as Promise<T>
      })
      .then((json) => {
        if (!active) return
        setData(json)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (!active) return
        setError(e.message)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [url, ...deps])

  return { data, error, loading, setData }
}
