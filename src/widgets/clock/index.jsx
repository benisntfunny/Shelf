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
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',width:'100%',gap:'1vh'}}>
      <div style={{fontSize:'18vh',fontWeight:700,lineHeight:1,letterSpacing:'-0.03em',color:'#e0e0e0'}}>{hours}:{minutes}</div>
      {showSeconds && <div style={{fontSize:'6vh',fontWeight:400,color:'#8a8a8a',lineHeight:1}}>{seconds}</div>}
      {!use24h && <div style={{fontSize:'5vh',fontWeight:500,color:'#6a6a6a',lineHeight:1}}>{now.getHours() >= 12 ? 'PM' : 'AM'}</div>}
      <div style={{fontSize:'4.5vh',color:'#6a6a6a',letterSpacing:'0.04em'}}>{dateStr}</div>
    </div>
  )
}
