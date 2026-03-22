import { useState, useEffect, useRef } from 'react'

function volumeColor(vol) {
  // Red (0%) → Yellow (50%) → Green (100%)
  if (vol <= 50) {
    const r = 207, g = Math.round(102 + (vol / 50) * 150)
    return `rgb(${r}, ${g}, 100)`
  }
  const r = Math.round(207 - ((vol - 50) / 50) * 131), g = 175
  return `rgb(${r}, ${g}, 100)`
}

export default function Volume({ size }) {
  const [volume, setVolume] = useState(50)
  const [muted, setMuted] = useState(false)
  const [dragging, setDragging] = useState(false)
  const sliderRef = useRef(null)

  useEffect(() => {
    let mounted = true
    async function poll() {
      if (!window.shelf?.getVolume) return
      const data = await window.shelf.getVolume()
      if (mounted && !dragging) {
        setVolume(data.volume)
        setMuted(data.muted)
      }
    }
    poll()
    const timer = setInterval(poll, 2000)
    return () => { mounted = false; clearInterval(timer) }
  }, [dragging])

  function applyVolume(vol) {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)))
    setVolume(clamped)
    if (window.shelf?.setVolume) window.shelf.setVolume({ volume: clamped })
  }

  function toggleMute() {
    const newMuted = !muted
    setMuted(newMuted)
    if (window.shelf?.setVolume) window.shelf.setVolume({ muted: newMuted })
  }

  function handleSliderEvent(e, rect) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const pct = ((clientX - rect.left) / rect.width) * 100
    applyVolume(pct)
  }

  function onPointerDown(e) {
    if (!sliderRef.current) return
    setDragging(true)
    const rect = sliderRef.current.getBoundingClientRect()
    handleSliderEvent(e, rect)

    function onMove(ev) { handleSliderEvent(ev, rect) }
    function onUp() {
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
  }

  const icon = muted ? '\u{1F507}' : volume > 60 ? '\u{1F50A}' : volume > 20 ? '\u{1F509}' : '\u{1F508}'
  const [w, h] = (size || '2x1').split('x').map(Number)
  const isVertical = h > w
  const isTiny = w <= 1 && h <= 1

  // 1x1: just icon + value, tap to mute
  if (isTiny) {
    return (
      <div onClick={toggleMute} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', width: '100%', cursor: 'pointer', gap: '0.5vh',
      }}>
        <span style={{ fontSize: '6vh' }}>{icon}</span>
        <span style={{ fontSize: '3vh', color: muted ? '#cf6679' : '#e0e0e0', fontWeight: 600 }}>
          {muted ? 'MUTE' : `${volume}%`}
        </span>
      </div>
    )
  }

  // Vertical: slider goes top to bottom
  if (isVertical) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', width: '100%', padding: '1vh 0', gap: '1vh',
      }}>
        <span onClick={toggleMute} style={{ fontSize: '5vh', cursor: 'pointer' }}>{icon}</span>
        <div
          ref={sliderRef}
          onMouseDown={(e) => {
            if (!sliderRef.current) return
            setDragging(true)
            const rect = sliderRef.current.getBoundingClientRect()
            const pct = 100 - ((e.clientY - rect.top) / rect.height) * 100
            applyVolume(pct)
            function onMove(ev) {
              const p = 100 - ((ev.clientY - rect.top) / rect.height) * 100
              applyVolume(p)
            }
            function onUp() {
              setDragging(false)
              window.removeEventListener('mousemove', onMove)
              window.removeEventListener('mouseup', onUp)
            }
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
          }}
          style={{
            flex: 1, width: '40%', background: 'rgba(255,255,255,0.08)', borderRadius: '8px',
            position: 'relative', cursor: 'pointer', touchAction: 'none',
          }}
        >
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${muted ? 0 : volume}%`,
            background: muted ? '#cf6679' : volumeColor(volume), borderRadius: '8px',
            transition: dragging ? 'none' : 'height 0.15s ease',
          }} />
        </div>
        <span style={{ fontSize: '3vh', color: '#6a6a6a', fontWeight: 600 }}>{volume}%</span>
      </div>
    )
  }

  // Horizontal: icon + slider + percentage
  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: '100%', width: '100%',
      padding: '0 1.5vw', gap: '1vw',
    }}>
      <span onClick={toggleMute} style={{ fontSize: '5vh', cursor: 'pointer', flexShrink: 0 }}>{icon}</span>
      <div
        ref={sliderRef}
        onMouseDown={onPointerDown}
        onTouchStart={onPointerDown}
        style={{
          flex: 1, height: '35%', maxHeight: '20px', background: 'rgba(255,255,255,0.08)',
          borderRadius: '8px', position: 'relative', cursor: 'pointer', touchAction: 'none',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${muted ? 0 : volume}%`,
          background: muted ? '#cf6679' : volumeColor(volume), borderRadius: '8px',
          transition: dragging ? 'none' : 'width 0.15s ease',
        }} />
        <div style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
          left: `${muted ? 0 : volume}%`,
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#e0e0e0', boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          transition: dragging ? 'none' : 'left 0.15s ease',
        }} />
      </div>
      <span style={{ fontSize: '3vh', color: '#6a6a6a', fontWeight: 600, minWidth: '3vw', textAlign: 'right', flexShrink: 0 }}>
        {volume}%
      </span>
    </div>
  )
}
