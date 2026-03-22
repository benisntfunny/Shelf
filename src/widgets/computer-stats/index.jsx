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

const DEFAULT_DISPLAY = { cpu: 'radial', ram: 'bar', disk: 'bar', network: 'number', battery: 'bar' }
const STAT_LABELS = { cpu: 'CPU', ram: 'RAM', disk: 'Disk', network: 'Net', battery: 'Battery' }

function thresholdColor(percent) {
  if (percent < 50) return '#4caf82'
  if (percent < 80) return '#c9a84c'
  return '#cf6679'
}

function RadialGauge({ percent, label, size }) {
  const r = size * 0.38
  const stroke = Math.max(3, size * 0.08)
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - percent / 100)
  const color = thresholdColor(percent)
  const cx = size / 2, cy = size / 2

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{transition: 'stroke-dashoffset 0.5s ease'}} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill="#e0e0e0" fontSize={size * 0.22} fontWeight="700">{Math.round(percent)}%</text>
      </svg>
      <span style={{fontSize: Math.max(8, size * 0.14) + 'px', color:'#6a6a6a', textTransform:'uppercase', letterSpacing:'0.5px'}}>{label}</span>
    </div>
  )
}

function BarGauge({ percent, label, width }) {
  const color = thresholdColor(percent)
  const h = Math.max(6, width * 0.06)
  return (
    <div style={{width:'100%',display:'flex',flexDirection:'column',gap:'2px'}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize: Math.max(9, width * 0.07) + 'px'}}>
        <span style={{color:'#6a6a6a',textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</span>
        <span style={{color}}>{Math.round(percent)}%</span>
      </div>
      <div style={{width:'100%',height:h+'px',background:'rgba(255,255,255,0.06)',borderRadius:h/2+'px',overflow:'hidden'}}>
        <div style={{width:percent+'%',height:'100%',background:color,borderRadius:h/2+'px',transition:'width 0.5s ease'}} />
      </div>
    </div>
  )
}

function NumberDisplay({ value, unit, label, size }) {
  const color = typeof value === 'number' && value > 80 ? '#cf6679' : value > 50 ? '#c9a84c' : '#4caf82'
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
      <span style={{fontSize: Math.max(12, size * 0.3) + 'px', fontWeight:700, color, lineHeight:1}}>{value}{unit}</span>
      <span style={{fontSize: Math.max(8, size * 0.14) + 'px', color:'#6a6a6a', textTransform:'uppercase', letterSpacing:'0.5px'}}>{label}</span>
    </div>
  )
}

function Sparkline({ data, width, height, color }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - (v / max) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} style={{position:'absolute',bottom:0,left:0,opacity:0.15}}>
      <polyline points={points} fill="none" stroke={color || '#6a6a6a'} strokeWidth="1.5" />
    </svg>
  )
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B/s'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB/s'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB/s'
}

export default function ComputerStats({ config }) {
  const ref = useRef(null)
  const container = useContainerSize(ref)
  const [stats, setStats] = useState(null)

  const statList = config?.stats || ['cpu', 'ram']
  const displayStyles = config?.displayStyles || {}
  const interval = (config?.pollInterval || 2) * 1000
  const showSparklines = config?.showSparklines ?? false

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

  // Calculate grid layout to fill the space
  const count = statList.filter(s => s !== 'battery' || stats.battery?.present).length
  if (count === 0) return <div ref={ref} style={{height:'100%',width:'100%'}} />

  // Pick cols/rows to best fill the rectangle
  let bestCols = 1, bestRows = count
  let bestRatio = Infinity
  for (let c = 1; c <= count; c++) {
    const r = Math.ceil(count / c)
    const cellW = container.w / c
    const cellH = container.h / r
    const ratio = Math.max(cellW / cellH, cellH / cellW)
    if (ratio < bestRatio) {
      bestRatio = ratio
      bestCols = c
      bestRows = r
    }
  }
  const cols = bestCols
  const cellW = container.w / cols - 8
  const cellH = container.h / bestRows - 8
  const cellSize = Math.min(cellW, cellH)

  function renderStat(statId) {
    const display = displayStyles[statId] || DEFAULT_DISPLAY[statId] || 'number'

    if (statId === 'cpu') {
      const pct = stats.cpu?.usage ?? 0
      if (display === 'radial') return <RadialGauge percent={pct} label="CPU" size={cellSize} />
      if (display === 'bar') return <BarGauge percent={pct} label="CPU" width={cellW} />
      return <NumberDisplay value={Math.round(pct)} unit="%" label="CPU" size={cellSize} />
    }
    if (statId === 'ram') {
      const pct = stats.ram?.percent ?? 0
      if (display === 'radial') return <RadialGauge percent={pct} label="RAM" size={cellSize} />
      if (display === 'bar') return <BarGauge percent={pct} label="RAM" width={cellW} />
      return <NumberDisplay value={Math.round(pct)} unit="%" label="RAM" size={cellSize} />
    }
    if (statId === 'disk') {
      const d = stats.disk?.[0]
      const pct = d?.percent ?? 0
      if (display === 'radial') return <RadialGauge percent={pct} label="Disk" size={cellSize} />
      if (display === 'bar') return <BarGauge percent={pct} label="Disk" width={cellW} />
      return <NumberDisplay value={Math.round(pct)} unit="%" label="Disk" size={cellSize} />
    }
    if (statId === 'network') {
      const up = stats.network?.up ?? 0
      const down = stats.network?.down ?? 0
      return (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
          <span style={{fontSize: Math.max(9, cellSize * 0.13) + 'px', color:'#4caf82'}}>&#8593; {formatBytes(up)}</span>
          <span style={{fontSize: Math.max(9, cellSize * 0.13) + 'px', color:'#c9a84c'}}>&#8595; {formatBytes(down)}</span>
          <span style={{fontSize: Math.max(8, cellSize * 0.1) + 'px', color:'#6a6a6a', textTransform:'uppercase'}}>Net</span>
        </div>
      )
    }
    if (statId === 'battery') {
      if (!stats.battery?.present) return null
      const pct = stats.battery.percent ?? 0
      const icon = stats.battery.charging ? '\u26A1' : ''
      if (display === 'bar') return <BarGauge percent={pct} label={`Battery ${icon}`} width={cellW} />
      return <NumberDisplay value={Math.round(pct)} unit={`% ${icon}`} label="Battery" size={cellSize} />
    }
    return null
  }

  return (
    <div ref={ref} style={{
      height:'100%',width:'100%',
      display:'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${bestRows}, 1fr)`,
      gap:'4px',
      padding:'4px',
      overflow:'hidden',
    }}>
      {statList.map(statId => {
        const el = renderStat(statId)
        if (!el) return null
        return (
          <div key={statId} style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            {showSparklines && stats.history?.[statId] && (
              <Sparkline data={stats.history[statId]} width={cellW} height={cellH * 0.5} />
            )}
            {el}
          </div>
        )
      })}
    </div>
  )
}
