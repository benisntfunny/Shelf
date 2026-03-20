import { useState, useEffect } from 'react'

export default function Weather({ config }) {
  const [data, setData] = useState(null)

  const lat = config?.latitude || '37.7749'
  const lon = config?.longitude || '-122.4194'
  const units = config?.units || 'F'

  useEffect(() => {
    let mounted = true
    async function fetchWeather() {
      if (window.shelf) {
        const result = await window.shelf.getWeather({ lat, lon, units })
        if (mounted) setData(result)
      }
    }
    fetchWeather()
    const timer = setInterval(fetchWeather, 15 * 60 * 1000)
    return () => { mounted = false; clearInterval(timer) }
  }, [lat, lon, units])

  if (!data) {
    return <div className="widget-content"><span style={{ color: 'var(--muted)' }}>Loading...</span></div>
  }

  return (
    <div className="widget-content">
      <div className="weather-main">
        <span className="weather-icon">{data.icon}</span>
        <span className="weather-temp">{data.temp}°{data.units}</span>
      </div>
      <div className="weather-desc">{data.condition}</div>
      <div className="weather-hilo">H:{data.hi}° L:{data.lo}°</div>
    </div>
  )
}
