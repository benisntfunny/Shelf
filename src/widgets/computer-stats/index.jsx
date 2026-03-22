import { useState, useEffect, useRef } from 'react'

function useContainerSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref])
  return size
}

function thresholdColor(percent) {
  if (percent < 50) return '#4caf82'
  if (percent < 80) return '#c9a84c'
  return '#cf6679'
}

function RadialGauge({ percent, label, w, h }) {
  // Use a fixed viewBox, let SVG scale to container
  const vb = 100
  const r = 38
  const stroke = 10
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - Math.min(100, percent) / 100)
  const color = thresholdColor(percent)
  const cx = vb / 2, cy = vb / 2
  const svgSize = Math.min(w * 0.9, h * 0.75)
  const labelSize = Math.max(8, svgSize * 0.15)

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',width:'100%',gap: Math.max(1, h * 0.02) + 'px'}}>
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${vb} ${vb}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{transition: 'stroke-dashoffset 0.5s ease'}} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill="#e0e0e0" fontSize="22" fontWeight="700">{Math.round(percent)}%</text>
      </svg>
      <span style={{fontSize: labelSize + 'px', color:'#6a6a6a', textTransform:'uppercase', letterSpacing:'0.5px', lineHeight:1}}>{label}</span>
    </div>
  )
}

function BarGauge({ percent, label, w, h }) {
  const color = thresholdColor(percent)
  const barH = Math.max(8, h * 0.15)
  const fontSize = Math.max(10, h * 0.2)
  const labelSize = Math.max(8, h * 0.15)

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',gap: Math.max(2, h * 0.05) + 'px',padding:'0 4px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
        <span style={{fontSize: labelSize + 'px', color:'#6a6a6a',textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</span>
        <span style={{fontSize: fontSize + 'px', fontWeight:700, color}}>{Math.round(percent)}%</span>
      </div>
      <div style={{width:'100%',height:barH+'px',background:'rgba(255,255,255,0.06)',borderRadius:barH/2+'px',overflow:'hidden'}}>
        <div style={{width: Math.min(100, percent)+'%',height:'100%',background:color,borderRadius:barH/2+'px',transition:'width 0.5s ease'}} />
      </div>
    </div>
  )
}

function NumberDisplay({ value, unit, label, w, h }) {
  const color = typeof value === 'number' && value > 80 ? '#cf6679' : value > 50 ? '#c9a84c' : '#4caf82'
  const fontSize = Math.max(14, Math.min(h * 0.4, w * 0.3))
  const labelSize = Math.max(8, fontSize * 0.4)

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',width:'100%',gap: Math.max(1, h * 0.03) + 'px'}}>
      <span style={{fontSize: fontSize + 'px', fontWeight:700, color, lineHeight:1}}>{value}{unit}</span>
      <span style={{fontSize: labelSize + 'px', color:'#6a6a6a', textTransform:'uppercase', letterSpacing:'0.5px', lineHeight:1}}>{label}</span>
    </div>
  )
}

function NetworkDisplay({ up, down, w, h }) {
  const fontSize = Math.max(10, Math.min(h * 0.2, w * 0.12))
  const labelSize = Math.max(8, fontSize * 0.7)

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',width:'100%',gap: Math.max(2, h * 0.04) + 'px'}}>
      <span style={{fontSize: fontSize + 'px', color:'#4caf82', lineHeight:1}}>{'\u2191'} {formatBytes(up)}</span>
      <span style={{fontSize: fontSize + 'px', color:'#c9a84c', lineHeight:1}}>{'\u2193'} {formatBytes(down)}</span>
      <span style={{fontSize: labelSize + 'px', color:'#6a6a6a', textTransform:'uppercase', lineHeight:1}}>Net</span>
    </div>
  )
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B/s'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB/s'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB/s'
}

function getStatValue(stats, statId) {
  switch (statId) {
    case 'cpu': return { percent: stats.cpu?.usage ?? 0, label: 'CPU' }
    case 'ram': return { percent: stats.ram?.percent ?? 0, label: 'RAM' }
    case 'disk': return { percent: stats.disk?.[0]?.percent ?? 0, label: 'Disk' }
    case 'battery': {
      if (!stats.battery?.present) return null
      const icon = stats.battery.charging ? ' \u26A1' : ''
      return { percent: stats.battery.percent ?? 0, label: 'Battery' + icon }
    }
    case 'cpuTemp': {
      if (!stats.cpuTemp?.available) return { value: '?', unit: '\u00B0', label: 'CPU Temp', isTemp: true }
      return { value: Math.round(stats.cpuTemp.temp), unit: '\u00B0C', label: 'CPU Temp', isTemp: true }
    }
    case 'network': return { isNetwork: true, up: stats.network?.up ?? 0, down: stats.network?.down ?? 0 }
    default: return null
  }
}

export default function ComputerStats({ config }) {
  const ref = useRef(null)
  const container = useContainerSize(ref)
  const [stats, setStats] = useState(null)

  // Support both old format (string array) and new format (object array)
  const rawStats = config?.stats || [{ id: 'cpu', display: 'radial' }, { id: 'ram', display: 'bar' }]
  const statList = rawStats.map(s => typeof s === 'string' ? { id: s, display: null } : s)
  const interval = (config?.pollInterval || 2) * 1000
  const showSparklines = config?.showSparklines ?? false

  const DEFAULT_DISPLAY = { cpu: 'radial', ram: 'bar', disk: 'bar', network: 'number', battery: 'bar', cpuTemp: 'number' }

  useEffect(() => {
    function poll() {
      window.shelf?.getSystemStatsFull?.().then(setStats).catch(() => {})
    }
    poll()
    const timer = setInterval(poll, interval)
    return () => clearInterval(timer)
  }, [interval])

  if (!stats || container.w === 0) {
    return <div ref={ref} style={{height:'100%',width:'100%'}} />
  }

  // Filter out unavailable stats
  const validStats = statList.filter(s => {
    if (s.id === 'battery' && !stats.battery?.present) return false
    return true
  })
  const count = validStats.length
  if (count === 0) return <div ref={ref} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#6a6a6a',fontSize:'12px'}}>Add stats in settings</span></div>

  // Pick grid layout
  let bestCols = 1, bestRows = count
  let bestScore = Infinity
  for (let c = 1; c <= Math.min(count, 6); c++) {
    const r = Math.ceil(count / c)
    const cw = container.w / c
    const ch = container.h / r
    // Prefer layouts where cells are roughly square
    const ratio = Math.max(cw / ch, ch / cw)
    // Penalize too many empty cells
    const empty = c * r - count
    const score = ratio + empty * 0.5
    if (score < bestScore) {
      bestScore = score
      bestCols = c
      bestRows = r
    }
  }

  const cellW = container.w / bestCols
  const cellH = container.h / bestRows

  function renderStat(stat) {
    const display = stat.display || DEFAULT_DISPLAY[stat.id] || 'number'
    const data = getStatValue(stats, stat.id)
    if (!data) return null

    if (data.isNetwork) {
      return <NetworkDisplay up={data.up} down={data.down} w={cellW} h={cellH} />
    }

    if (data.isTemp || stat.id === 'cpuTemp') {
      return <NumberDisplay value={data.value} unit={data.unit} label={data.label} w={cellW} h={cellH} />
    }

    if (display === 'radial') return <RadialGauge percent={data.percent} label={data.label} w={cellW} h={cellH} />
    if (display === 'bar') return <BarGauge percent={data.percent} label={data.label} w={cellW} h={cellH} />
    return <NumberDisplay value={Math.round(data.percent)} unit="%" label={data.label} w={cellW} h={cellH} />
  }

  return (
    <div ref={ref} style={{
      height:'100%',width:'100%',
      display:'grid',
      gridTemplateColumns: `repeat(${bestCols}, 1fr)`,
      gridTemplateRows: `repeat(${bestRows}, 1fr)`,
      overflow:'hidden',
    }}>
      {validStats.map(stat => (
        <div key={stat.id} style={{display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',padding:'2px'}}>
          {renderStat(stat)}
        </div>
      ))}
    </div>
  )
}
