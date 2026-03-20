import { useState, useEffect } from 'react'

export default function System() {
  const [stats, setStats] = useState({ cpu: 0, memory: 0, network: { up: 0, down: 0 } })

  useEffect(() => {
    let mounted = true
    async function poll() {
      if (window.shelf) {
        const data = await window.shelf.getSystemStats()
        if (mounted) setStats(data)
      }
    }
    poll()
    const timer = setInterval(poll, 2000)
    return () => { mounted = false; clearInterval(timer) }
  }, [])

  return (
    <div className="system-stats">
      <div className="stat-row">
        <span className="stat-label">CPU</span>
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{ width: `${stats.cpu}%` }} />
        </div>
        <span className="stat-value">{stats.cpu}%</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">RAM</span>
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{ width: `${stats.memory}%` }} />
        </div>
        <span className="stat-value">{stats.memory}%</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">NET</span>
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{ width: '0%' }} />
        </div>
        <span className="stat-value">--</span>
      </div>
    </div>
  )
}
