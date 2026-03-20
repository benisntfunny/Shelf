import { useState, useEffect, useCallback } from 'react'

export function useSecrets() {
  const [secrets, setSecrets] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (window.shelf) {
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000))
      Promise.race([window.shelf.getSecrets(), timeout]).then((s) => {
        setSecrets(s || {})
        setLoaded(true)
      }).catch(() => {
        console.error('useSecrets: getSecrets failed, using defaults')
        setSecrets({})
        setLoaded(true)
      })
    } else {
      setLoaded(true)
    }
  }, [])

  const updateSecret = useCallback((key, value) => {
    setSecrets((prev) => {
      const next = { ...prev, [key]: value }
      if (window.shelf) window.shelf.saveSecrets(next)
      return next
    })
  }, [])

  return { secrets, loaded, updateSecret }
}
