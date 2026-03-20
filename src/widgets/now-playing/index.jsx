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
            <div style={{ color: '#6a6a6a', fontSize: 13, padding: 16 }}>Loading...</div>
          ) : tracks.length === 0 ? (
            <div style={{ color: '#6a6a6a', fontSize: 13, padding: 16 }}>No tracks</div>
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
      <div className="widget-content" style={{ color: '#6a6a6a', fontSize: 13 }}>
        Not playing
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'row',alignItems:'center',height:'100%',width:'100%',gap:'16px',padding:'12px 16px',position:'relative'}}>
      {/* Album art - left side */}
      <div style={{width:'120px',height:'120px',borderRadius:'12px',background:'#1e1e1e',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'48px',overflow:'hidden'}}>
        {track.artwork ? <img src={track.artwork} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" /> : '\u{1F3B5}'}
      </div>
      {/* Track info - right side */}
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',gap:'6px',minWidth:0}}>
        <div style={{fontSize:'20px',fontWeight:600,color:'#e0e0e0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.track}</div>
        <div style={{fontSize:'15px',color:'#6a6a6a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.artist}</div>
        <div style={{display:'flex',gap:'16px',marginTop:'8px'}}>
          <button onClick={() => cmd('previous')} style={{fontSize:'28px',background:'none',border:'none',color:'#e0e0e0',cursor:'pointer',opacity:0.7}}>{'\u{23EE}'}</button>
          <button onClick={() => cmd('playpause')} style={{fontSize:'32px',background:'none',border:'none',color:'#e0e0e0',cursor:'pointer',opacity:0.9}}>{track.playing ? '\u{23F8}' : '\u{25B6}'}</button>
          <button onClick={() => cmd('next')} style={{fontSize:'28px',background:'none',border:'none',color:'#e0e0e0',cursor:'pointer',opacity:0.7}}>{'\u{23ED}'}</button>
        </div>
      </div>
      {/* Browse button top right */}
      <button onClick={() => setBrowsing(true)} style={{position:'absolute',top:'8px',right:'10px',padding:'3px 10px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',color:'#6a6a6a',fontSize:'11px',cursor:'pointer'}}>Browse</button>
      {/* Browse overlay */}
      {browsing && <BrowseOverlay onClose={() => setBrowsing(false)} />}
    </div>
  )
}
