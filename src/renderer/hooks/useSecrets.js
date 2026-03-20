import { useState, useEffect, useCallback } from 'react'

export function useSecrets() {
  const [secrets, setSecrets] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (window.shelf) {
      window.shelf.getSecrets().then((s) => {
        setSecrets(s || {})
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
