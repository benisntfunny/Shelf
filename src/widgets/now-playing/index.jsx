import { useState, useEffect } from 'react'

export default function NowPlaying() {
  const [track, setTrack] = useState(null)

  useEffect(() => {
    let mounted = true
    async function poll() {
      if (window.shelf) {
        const data = await window.shelf.getNowPlaying()
        if (mounted) setTrack(data)
      }
    }
    poll()
    const timer = setInterval(poll, 3000)
    return () => { mounted = false; clearInterval(timer) }
  }, [])

  async function cmd(action) {
    if (window.shelf) await window.shelf.musicCommand(action)
  }

  if (!track || (!track.track && !track.playing)) {
    return (
      <div className="widget-content" style={{ color: 'var(--muted)', fontSize: 13 }}>
        Not playing
      </div>
    )
  }

  return (
    <div className="widget-content">
      <div className="np-inner">
        <div className="np-art-placeholder">{'\u{1F3B6}'}</div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="np-title">{track.track}</div>
          <div className="np-artist">{track.artist}</div>
          <div className="np-controls">
            <button className="np-btn" onClick={() => cmd('previous')}>{'\u{23EE}'}</button>
            <button className="np-btn" onClick={() => cmd('playpause')}>{track.playing ? '\u{23F8}' : '\u{25B6}'}</button>
            <button className="np-btn" onClick={() => cmd('next')}>{'\u{23ED}'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
