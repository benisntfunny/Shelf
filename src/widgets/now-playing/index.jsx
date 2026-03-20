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
    <div className="now-playing">
      <div className="artwork">{'\u{1F3B6}'}</div>
      <div className="info">
        <div className="track">{track.track}</div>
        <div className="artist">{track.artist}</div>
        <div className="controls">
          <button onClick={() => cmd('previous')}>{'\u{23EE}'}</button>
          <button onClick={() => cmd('playpause')}>{track.playing ? '\u{23F8}' : '\u{25B6}'}</button>
          <button onClick={() => cmd('next')}>{'\u{23ED}'}</button>
        </div>
      </div>
    </div>
  )
}
