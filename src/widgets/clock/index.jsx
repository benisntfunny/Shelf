import { useState, useEffect, useRef } from 'react'

function useContainerSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: width, h: height })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref])
  return size
}

function SingleClock({ timezone, label, use24h, showSeconds, containerH, isCompact }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const opts = timezone ? { timeZone: timezone } : {}
  const formatter = new Intl.DateTimeFormat('en-US', {
    ...opts,
    hour: 'numeric',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12: !use24h,
  })
  const parts = formatter.formatToParts(now)
  const hour = parts.find(p => p.type === 'hour')?.value
  const minute = parts.find(p => p.type === 'minute')?.value
  const second = parts.find(p => p.type === 'second')?.value
  const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value

  const dateStr = now.toLocaleDateString('en-US', {
    ...opts,
    weekday: 'short', month: 'short', day: 'numeric',
  })

  const displayLabel = label || (timezone ? timezone.split('/').pop().replace(/_/g, ' ') : '')
  const h = containerH
  const showDate = h > 80
  const showPeriod = !use24h && dayPeriod && h > 60
  const showSecs = showSeconds && h > 60

  // Count visible lines to budget vertical space
  let lines = 1 // time always shown
  if (displayLabel) lines++
  if (showSecs) lines++
  if (showPeriod) lines++
  if (showDate) lines++

  // Time gets ~50% of height, other elements share the rest
  const timeFontSize = isCompact ? h * 0.35 : h * 0.5 / Math.max(1, lines * 0.3)
  const smallFontSize = timeFontSize * 0.28
  const labelFontSize = timeFontSize * 0.22

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',width:'100%',gap: `${h * 0.01}px`, overflow:'hidden'}}>
      {displayLabel && <div style={{fontSize: `${labelFontSize}px`,fontWeight:600,color:'#8a8a8a',letterSpacing:'0.05em',textTransform:'uppercase',lineHeight:1,whiteSpace:'nowrap'}}>{displayLabel}</div>}
      <div style={{fontSize: `${timeFontSize}px`,fontWeight:700,lineHeight:1,letterSpacing:'-0.03em',color:'#e0e0e0',whiteSpace:'nowrap'}}>{hour}:{minute}</div>
      {showSecs && <div style={{fontSize: `${smallFontSize}px`,fontWeight:400,color:'#8a8a8a',lineHeight:1}}>{second}</div>}
      {showPeriod && <div style={{fontSize: `${smallFontSize}px`,fontWeight:500,color:'#6a6a6a',lineHeight:1}}>{dayPeriod}</div>}
      {showDate && <div style={{fontSize: `${smallFontSize}px`,color:'#6a6a6a',letterSpacing:'0.04em',whiteSpace:'nowrap'}}>{dateStr}</div>}
    </div>
  )
}

export default function Clock({ config }) {
  const ref = useRef(null)
  const container = useContainerSize(ref)
  const use24h = config?.use24h ?? false
  const showSeconds = config?.showSeconds ?? false
  const clocks = config?.clocks
  const hasMultipleClocks = clocks && clocks.length > 0

  if (!hasMultipleClocks) {
    return (
      <div ref={ref} style={{height:'100%',width:'100%'}}>
        {container.h > 0 && (
          <SingleClock timezone={config?.timezone} label={config?.label} use24h={use24h} showSeconds={showSeconds} containerH={container.h} />
        )}
      </div>
    )
  }

  return (
    <div ref={ref} style={{display:'flex',alignItems:'center',justifyContent:'space-evenly',height:'100%',width:'100%'}}>
      {container.h > 0 && clocks.map((clock, i) => (
        <SingleClock
          key={i}
          timezone={clock.timezone}
          label={clock.label}
          use24h={use24h}
          showSeconds={showSeconds}
          containerH={container.h}
          isCompact
        />
      ))}
    </div>
  )
}
