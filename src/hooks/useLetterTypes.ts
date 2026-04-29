import { useState, useEffect } from 'react'

export interface LetterTypeOption {
  value: string
  label: string
}

const CACHE_KEY = 'letter-types-cache'
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

interface CacheData {
  types: LetterTypeOption[]
  timestamp: number
}

export function useLetterTypes() {
  const [types, setTypes] = useState<LetterTypeOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchTypes = async () => {
      try {
        // Проверяем кэш
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as CacheData
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            setTypes(parsed.types)
            setIsLoading(false)
            return
          }
        }

        // Если кэша нет или устарел, идем в сеть
        const response = await fetch('/api/letters/types')
        if (response.ok) {
          const data = await response.json()
          if (mounted && data.types) {
            setTypes(data.types)
            setIsLoading(false)
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ types: data.types, timestamp: Date.now() })
            )
          }
        } else {
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Failed to load letter types', err)
        if (mounted) setIsLoading(false)
      }
    }

    fetchTypes()

    return () => {
      mounted = false
    }
  }, [])

  return { types, isLoading }
}
