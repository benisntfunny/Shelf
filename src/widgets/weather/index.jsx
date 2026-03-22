import { useState, useEffect } from 'react'

function CityRow({ data, selected, onClick, compact }) {
  if (!data) return null
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: compact ? '0.3vh 1vw' : '0.8vh 1vw',
        cursor: 'pointer', flex: 1, minHeight: 0,
        opacity: selected === null ? 1 : (selected ? 1 : 0.7),
        borderLeft: selected === true ? '2px solid #c9a84c' : '2px solid transparent',
      }}
    >
      <span style={{ fontSize: compact ? '4vh' : '6vh', marginRight: '1vw', flexShrink: 0 }}>{data.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? '3vh' : '4vh', fontWeight: 600, color: '#e0e0e0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.city?.split(',')[0]}
        </div>
        <div style={{ fontSize: compact ? '2vh' : '2.5vh', color: '#6a6a6a' }}>{data.condition}</div>
      </div>
      <div style={{ textAlign: 'right', marginLeft: '1vw', flexShrink: 0 }}>
        <div style={{ fontSize: compact ? '5vh' : '7vh', fontWeight: 700, color: '#e0e0e0', lineHeight: 1 }}>{data.temp}°</div>
        <div style={{ fontSize: compact ? '2vh' : '2.5vh', color: '#6a6a6a' }}>H:{data.hi}° L:{data.lo}°</div>
      </div>
    </div>
  )
}

function ForecastPanel({ data, onClose }) {
  if (!data?.forecast?.length) return null
  return (
    <div
      onClick={onClose}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', padding: '1vh 1vw', cursor: 'pointer', animation: 'fadeSlideIn 0.3s ease' }}
    >
      <div style={{ fontSize: '2.5vh', fontWeight: 600, color: '#8a8a8a', marginBottom: '0.5vh' }}>
        {data.city} — 5 Day
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-evenly' }}>
        {data.forecast.slice(0, 5).map((f, i) => {
          const day = i === 0 ? 'Today' : new Date(f.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '2.8vh' }}>
              <span style={{ color: '#8a8a8a', width: '30%' }}>{day}</span>
              <span>{f.icon}</span>
              <span style={{ color: '#e0e0e0' }}>{f.hi}°</span>
              <span style={{ color: '#6a6a6a' }}>{f.lo}°</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Weather({ config, secrets, size }) {
  const [weatherData, setWeatherData] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showForecast, setShowForecast] = useState(false)

  const cities = config?.cities?.length ? config.cities.slice(0, 3) : ['San Francisco']
  const units = config?.units || 'F'
  const apiKey = secrets?.['openweathermap_key'] || secrets?.['weather.openweathermap_key'] || null

  useEffect(() => {
    let mounted = true
    async function fetchAll() {
      if (!window.shelf?.getWeatherByCity) return
      const results = await Promise.all(
        cities.map((city) => window.shelf.getWeatherByCity({ city, units, apiKey }))
      )
      if (mounted) setWeatherData(results)
    }
    fetchAll()
    const timer = setInterval(fetchAll, 15 * 60 * 1000)
    return () => { mounted = false; clearInterval(timer) }
  }, [cities.join(','), units, apiKey])

  useEffect(() => { setSelectedIdx(0) }, [cities.join(',')])

  if (!weatherData.length) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ color: '#6a6a6a', fontSize: '4vh' }}>Loading...</span>
    </div>
  }

  const [w, h] = (size || '2x2').split('x').map(Number)
  const isWide = w >= 4
  const isTicker = w >= 12 && h <= 1
  const compact = weatherData.length >= 3 || h <= 1
  const primary = weatherData[selectedIdx] || weatherData[0]

  // 12x1: ticker — all cities inline
  if (isTicker) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', height: '100%', width: '100%' }}>
        {weatherData.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8vw' }}>
            <span style={{ fontSize: '5vh' }}>{d.icon}</span>
            <div style={{ fontSize: '4vh', fontWeight: 600, color: '#e0e0e0' }}>{d.temp}°</div>
            <div>
              <div style={{ fontSize: '2.5vh', color: '#8a8a8a' }}>{d.city?.split(',')[0]}</div>
              <div style={{ fontSize: '2vh', color: '#6a6a6a' }}>H:{d.hi}° L:{d.lo}°</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Forecast overlay (compact mode — tap a city to see its forecast)
  if (showForecast !== false && !isWide) {
    const forecastCity = weatherData[showForecast] || weatherData[0]
    return <ForecastPanel data={forecastCity} onClose={() => setShowForecast(false)} />
  }

  // Wide mode: city rows on left, forecast on right
  if (isWide) {
    return (
      <div style={{ display: 'flex', height: '100%', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 45%', justifyContent: 'center' }}>
          {weatherData.map((d, i) => (
            <CityRow key={i} data={d} selected={i === selectedIdx} onClick={() => setSelectedIdx(i)} compact={compact} />
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '1vh 1vw', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '2.2vh', color: '#6a6a6a', marginBottom: '0.3vh' }}>5-Day Forecast</div>
          {primary.forecast?.slice(0, 5).map((f, i) => {
            const day = i === 0 ? 'Today' : new Date(f.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '2.8vh' }}>
                <span style={{ color: '#8a8a8a', minWidth: '3vw' }}>{day}</span>
                <span>{f.icon}</span>
                <span style={{ color: '#e0e0e0' }}>{f.hi}°</span>
                <span style={{ color: '#6a6a6a' }}>{f.lo}°</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Compact mode: city rows stacked, tap any city for its forecast
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', width: '100%', animation: 'fadeSlideIn 0.3s ease' }}>
      {weatherData.map((d, i) => (
        <CityRow key={i} data={d} selected={null} onClick={() => setShowForecast(i)} compact={compact} />
      ))}
    </div>
  )
}
