import { useState, useEffect } from 'react'

export default function FelixStatus({ config }) {
  const [status, setStatus] = useState({ up: null, ms: 0 })
  const url = config?.url || 'https://example.com'
  const label = config?.label || 'Felix'
  const interval = (config?.refreshInterval || 30) * 1000

  useEffect(() => {
    let mounted = true
    async function check() {
      if (window.shelf) {
        const start = Date.now()
        try {
          const res = await window.shelf.fetchUrl(url)
          const ms = Date.now() - start
          if (mounted) setStatus({ up: res.status >= 200 && res.status < 400, ms })
        } catch {
          if (mounted) setStatus({ up: false, ms: 0 })
        }
      }
    }
    check()
    const timer = setInterval(check, interval)
    return () => { mounted = false; clearInterval(timer) }
  }, [url, interval])

  const dotClass = status.up === null ? 'unknown' : status.up ? 'up' : 'down'

  return (
    <div className="felix-status">
      <div className={`status-dot ${dotClass}`} />
      <div className="felix-label">{label}</div>
      {status.up !== null && <div className="felix-time">{status.ms}ms</div>}
    </div>
  )
}
