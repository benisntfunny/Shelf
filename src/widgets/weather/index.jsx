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
    return <div className="widget-content"><span style={{ color: '#6a6a6a' }}>Loading...</span></div>
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',width:'100%',gap:'6px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <span style={{fontSize:'48px'}}>{data.icon}</span>
        <span style={{fontSize:'58px',fontWeight:700,lineHeight:1,color:'#e0e0e0'}}>{data.temp}°{data.units}</span>
      </div>
      <div style={{fontSize:'17px',color:'#8a8a8a'}}>{data.condition}</div>
      <div style={{fontSize:'15px',color:'#6a6a6a'}}>H:{data.hi}° L:{data.lo}°</div>
    </div>
  )
}
