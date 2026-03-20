import { useState, useEffect, useRef } from 'react'

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function BrowseOverlay({ onClose }) {
  const [playlists, setPlaylists] = useState([])
  const [selected, setSelected] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (window.shelf) {
      window.shelf.getPlaylists().then((pl) => {
        setPlaylists(pl || [])
        if (pl && pl.length > 0) {
          setSelected(pl[0])
        }
      })
    }
  }, [])

  useEffect(() => {
    if (!selected || !window.shelf) return
    setLoading(true)
    window.shelf.getPlaylistTracks(selected).then((t) => {
      setTracks(t || [])
      setLoading(false)
    })
  }, [selected])

  async function handlePlay(track) {
    if (window.shelf) {
      await window.shelf.playTrack({ name: track.name, artist: track.artist })
      onClose()
    }
  }

  return (
    <div className="np-browse-overlay">
      <button className="np-browse-close" onClick={onClose}>{'\u2715'}</button>
      <div className="np-browse-panels">
        <div className="np-browse-playlists">
          {playlists.map((pl) => (
            <button
              key={pl}
              className={`np-browse-pill ${selected === pl ? 'active' : ''}`}
              onClick={() => setSelected(pl)}
            >
              {pl}
            </button>
          ))}
        </div>
        <div className="np-browse-tracks">
          {loading ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: 16 }}>Loading...</div>
          ) : tracks.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: 16 }}>No tracks</div>
          ) : (
            tracks.map((t, i) => (
              <button key={i} className="np-browse-track" onClick={() => handlePlay(t)}>
                <span className="np-browse-track-name">{t.name}</span>
                <span className="np-browse-track-artist">{t.artist}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function NowPlaying() {
  const [track, setTrack] = useState(null)
  const [browsing, setBrowsing] = useState(false)
  const [localPos, setLocalPos] = useState(0)
  const lastPoll = useRef(Date.now())

  useEffect(() => {
    let mounted = true
    async function poll() {
      if (window.shelf) {
        const data = await window.shelf.getNowPlaying()
        if (mounted) {
          setTrack(data)
          setLocalPos(data?.position || 0)
          lastPoll.current = Date.now()
        }
      }
    }
    poll()
    const timer = setInterval(poll, 3000)
    return () => { mounted = false; clearInterval(timer) }
  }, [])

  // Interpolate position between polls for smooth progress
  useEffect(() => {
    if (!track?.playing) return
    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastPoll.current) / 1000
      setLocalPos(Math.min((track.position || 0) + elapsed, track.duration || 0))
    }, 500)
    return () => clearInterval(interval)
  }, [track])

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

  const progress = track.duration > 0 ? (localPos / track.duration) * 100 : 0

  return (
    <div className="widget-content np-enhanced">
      {/* Album Art */}
      <div className="np-art-col" onClick={() => setBrowsing(true)}>
        {track.artwork ? (
          <img src={track.artwork} className="np-art-img" alt="" />
        ) : (
          <div className="np-art-fallback">{'\u{1F3B5}'}</div>
        )}
      </div>

      {/* Track Info + Controls */}
      <div className="np-info-col">
        <div className="np-track-name">{track.track}</div>
        <div className="np-track-artist">{track.artist}</div>
        {track.album && <div className="np-track-album">{track.album}</div>}

        {/* Progress bar */}
        <div className="np-progress-row">
          <span className="np-time">{formatTime(localPos)}</span>
          <div className="np-progress-bar">
            <div className="np-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="np-time">{formatTime(track.duration)}</span>
        </div>

        {/* Controls */}
        <div className="np-ctrl-row">
          <button className="np-ctrl-btn" onClick={() => cmd('previous')}>{'\u{23EE}'}</button>
          <button className="np-ctrl-btn np-ctrl-play" onClick={() => cmd('playpause')}>
            {track.playing ? '\u{23F8}' : '\u{25B6}'}
          </button>
          <button className="np-ctrl-btn" onClick={() => cmd('next')}>{'\u{23ED}'}</button>
        </div>

        {/* Browse button */}
        <button className="np-browse-btn" onClick={() => setBrowsing(true)}>Browse</button>
      </div>

      {/* Browse overlay */}
      {browsing && <BrowseOverlay onClose={() => setBrowsing(false)} />}
    </div>
  )
}
