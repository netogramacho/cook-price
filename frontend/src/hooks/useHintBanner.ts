import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useHintBanner() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    const h = searchParams.get('hint')
    if (!h) return
    setHint(h)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('hint')
      return next
    }, { replace: true })
  }, [])

  return hint
}
