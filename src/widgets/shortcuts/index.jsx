import { useState, useRef, useEffect } from 'react'

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

export default function Shortcuts({ config }) {
  const ref = useRef(null)
  const container = useContainerSize(ref)
  const [runningIdx, setRunningIdx] = useState(null)

  const actions = config?.actions || []
  const userCols = config?.columns || 0

  if (actions.length === 0) {
    return (
      <div ref={ref} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'#6a6a6a',fontSize:'12px',textAlign:'center',padding:'8px'}}>
          Configure actions<br/>in settings
        </span>
      </div>
    )
  }

  // Auto-calculate columns based on container width
  const cols = userCols > 0 ? userCols : Math.max(1, Math.floor(container.w / 70))
  const btnSize = Math.min(container.w / cols - 8, container.h / Math.ceil(actions.length / cols) - 8)
  const iconSize = Math.max(14, btnSize * 0.45)
  const labelSize = Math.max(8, btnSize * 0.15)

  async function runAction(action, idx) {
    setRunningIdx(idx)
    try {
      if (action.type === 'shortcut') {
        await window.shelf?.runShortcut?.(action.value)
      } else {
        await window.shelf?.launchAction?.({ type: action.type, value: action.value })
      }
    } catch (e) {
      console.error('Action failed:', e)
    }
    setTimeout(() => setRunningIdx(null), 300)
  }

  return (
    <div ref={ref} style={{
      height:'100%',width:'100%',
      display:'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: '4px',
      padding: '4px',
      overflow: 'hidden',
      alignContent: 'center',
    }}>
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => runAction(action, i)}
          data-no-swipe
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            background: runningIdx === i ? 'rgba(201, 168, 76, 0.15)' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            cursor: 'pointer',
            padding: '4px',
            transition: 'all 0.15s',
            touchAction: 'manipulation',
            overflow: 'hidden',
            transform: runningIdx === i ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          <span style={{fontSize: `${iconSize}px`, lineHeight: 1}}>{action.icon || '\u26A1'}</span>
          {labelSize > 9 && <span style={{fontSize: `${labelSize}px`, color: '#8a8a8a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%'}}>{action.name || ''}</span>}
        </button>
      ))}
    </div>
  )
}
