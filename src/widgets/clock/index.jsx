import { useState, useEffect } from 'react'

export default function Clock({ config }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const use24h = config?.use24h ?? false
  const showSeconds = config?.showSeconds ?? false

  const hours = use24h ? now.getHours() : now.getHours() % 12 || 12
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const period = use24h ? '' : (now.getHours() >= 12 ? ' PM' : ' AM')

  const timeStr = showSeconds ? `${hours}:${minutes}:${seconds}${period}` : `${hours}:${minutes}${period}`

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',width:'100%',gap:'8px'}}>
      <div style={{fontSize:'64px',fontWeight:700,lineHeight:1,letterSpacing:'-0.02em',color:'#e0e0e0'}}>{timeStr}</div>
      <div style={{fontSize:'18px',color:'#6a6a6a',letterSpacing:'0.04em'}}>{dateStr}</div>
    </div>
  )
}
