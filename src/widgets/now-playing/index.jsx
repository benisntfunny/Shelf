import { useState, useEffect, useRef, useCallback } from 'react'

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function MarqueeText({ text, style }) {
  const containerRef = useRef(null)
  const textRef = useRef(null)
  const [shouldScroll, setShouldScroll] = useState(false)

  useEffect(() => {
    const check = () => {
      if (containerRef.current && textRef.current) {
        setShouldScroll(textRef.current.scrollWidth > containerRef.current.offsetWidth)
      }
    }
    check()
    const timer = setTimeout(check, 100)
    return () => clearTimeout(timer)
  }, [text])

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', whiteSpace: 'nowrap', ...style }}>
      <span
        ref={textRef}
        style={{
          display: 'inline-block',
          ...(shouldScroll ? {
            animation: 'marquee 8s linear infinite',
            paddingRight: '4vw',
          } : {}),
        }}
      >
        {text}
        {shouldScroll && <span style={{ paddingLeft: '4vw' }}>{text}</span>}
      </span>
    </div>
  )
}

function AlbumThumb({ album, artist }) {
  const [art, setArt] = useState(null)
  useEffect(() => {
    if (!album || !window.shelf) return
    let mounted = true
    window.shelf.getAlbumArt({ album, artist }).then((data) => {
      if (mounted && data) setArt(data)
    })
    return () => { mounted = false }
  }, [album, artist])

  return (
    <div style={{width:'10vh',height:'10vh',borderRadius:'4px',background:'#1a1a1a',flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'4vh'}}>
      {art ? <img src={art} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" /> : '\u{1F3B5}'}
    </div>
  )
}

const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
]

function OnScreenKeyboard({ onKey, onBackspace, onClear }) {
  const btnStyle = {
    flex: 1,
    minWidth: 0,
    height: '16vh',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '5vh',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  const actionStyle = { ...btnStyle, flex: 1.5, background: 'rgba(255,255,255,0.12)', fontSize: '4vh' }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'0.8vh',padding:'1vh 0.5vw',flex:1,justifyContent:'center'}}>
      {KB_ROWS.map((row, ri) => (
        <div key={ri} style={{display:'flex',gap:'0.4vw',justifyContent:'center'}}>
          {ri === 2 && <button style={actionStyle} onClick={onBackspace}>{'\u232B'}</button>}
          {row.map((k) => (
            <button key={k} style={btnStyle} onClick={() => onKey(k)}>{k}</button>
          ))}
          {ri === 2 && <button style={actionStyle} onClick={onClear}>CLR</button>}
        </div>
      ))}
      <div style={{display:'flex',gap:'0.4vw',justifyContent:'center'}}>
        <button style={{...btnStyle, flex: 6}} onClick={() => onKey(' ')}>SPACE</button>
      </div>
    </div>
  )
}

function BrowseOverlay({ onClose }) {
  const [mode, setMode] = useState('playlists') // 'playlists' | 'search'
  const [playlists, setPlaylists] = useState([])
  const [selected, setSelected] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef(null)

  useEffect(() => {
    if (window.shelf) {
      window.shelf.getPlaylists().then((pl) => {
        setPlaylists(pl || [])
        if (pl && pl.length > 0) setSelected(pl[0])
      })
    }
  }, [])

  useEffect(() => {
    if (!selected || !window.shelf || mode !== 'playlists') return
    setLoading(true)
    window.shelf.getPlaylistTracks(selected).then((t) => {
      setTracks(t || [])
      setLoading(false)
    })
  }, [selected, mode])

  const doSearch = useCallback((q) => {
    if (!q.trim() || !window.shelf) {
      setSearchResults([])
      return
    }
    setSearching(true)
    window.shelf.searchTracks(q.trim()).then((results) => {
      setSearchResults(results || [])
      setSearching(false)
    })
  }, [])

  function handleSearchKey(key) {
    const next = searchQuery + key
    setSearchQuery(next)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(next), 600)
  }

  function handleSearchBackspace() {
    const next = searchQuery.slice(0, -1)
    setSearchQuery(next)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(next), 600)
  }

  function handleSearchClear() {
    setSearchQuery('')
    setSearchResults([])
  }

  async function handlePlay(track) {
    if (window.shelf) {
      await window.shelf.playTrack({ name: track.name, artist: track.artist })
      onClose()
    }
  }

  const displayTracks = mode === 'search' ? searchResults : tracks
  const isLoading = mode === 'search' ? searching : loading

  return (
    <div className="np-browse-overlay">
      <button className="np-browse-close" onClick={onClose}>{'\u2715'}</button>

      {/* Mode tabs */}
      <div style={{display:'flex',gap:'1vw',padding:'1.5vh 2vw 0',flexShrink:0}}>
        <button
          onClick={() => setMode('playlists')}
          style={{padding:'1.5vh 2vw',borderRadius:'8px',border:'1px solid',borderColor:mode==='playlists'?'#c9a84c':'rgba(255,255,255,0.1)',background:mode==='playlists'?'rgba(201,168,76,0.15)':'rgba(255,255,255,0.04)',color:mode==='playlists'?'#c9a84c':'#6a6a6a',fontSize:'4vh',cursor:'pointer'}}
        >Playlists</button>
        <button
          onClick={() => setMode('search')}
          style={{padding:'1.5vh 2vw',borderRadius:'8px',border:'1px solid',borderColor:mode==='search'?'#c9a84c':'rgba(255,255,255,0.1)',background:mode==='search'?'rgba(201,168,76,0.15)':'rgba(255,255,255,0.04)',color:mode==='search'?'#c9a84c':'#6a6a6a',fontSize:'4vh',cursor:'pointer'}}
        >Search</button>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Left panel: playlists or keyboard */}
        <div style={{width:'45vw',borderRight:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {mode === 'playlists' ? (
            <div className="np-browse-playlists" style={{flex:1}}>
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
          ) : (
            <div style={{display:'flex',flexDirection:'column',flex:1}}>
              <div style={{padding:'2vh 1vw',fontSize:'4vh',color:'#e0e0e0',background:'rgba(0,0,0,0.3)',borderBottom:'1px solid rgba(255,255,255,0.08)',minHeight:'8vh',display:'flex',alignItems:'center'}}>
                {searchQuery || <span style={{color:'#6a6a6a'}}>Type to search...</span>}
                <span style={{opacity:0.5,animation:'blink 1s infinite'}}>|</span>
              </div>
              <OnScreenKeyboard
                onKey={handleSearchKey}
                onBackspace={handleSearchBackspace}
                onClear={handleSearchClear}
              />
            </div>
          )}
        </div>

        {/* Right panel: track list */}
        <div className="np-browse-tracks" style={{flex:1}}>
          {isLoading ? (
            <div style={{ color: '#6a6a6a', fontSize: '5vh', padding: '4vh 2vw' }}>Loading...</div>
          ) : displayTracks.length === 0 ? (
            <div style={{ color: '#6a6a6a', fontSize: '5vh', padding: '4vh 2vw' }}>
              {mode === 'search' ? (searchQuery ? 'No results' : 'Search your library') : 'No tracks'}
            </div>
          ) : (
            displayTracks.map((t, i) => (
              <button key={i} className="np-browse-track" onClick={() => handlePlay(t)}>
                <div style={{display:'flex',alignItems:'center',gap:'1.5vw',width:'100%'}}>
                  <AlbumThumb album={t.album} artist={t.artist} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:'1vw'}}>
                      <span className="np-browse-track-name">{t.name}</span>
                      <span style={{fontSize:'3vh',color:'#6a6a6a',flexShrink:0}}>{formatTime(t.duration)}</span>
                    </div>
                    <span className="np-browse-track-artist">{t.artist}{t.album ? ` \u2014 ${t.album}` : ''}</span>
                  </div>
                </div>
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
      <div className="widget-content" style={{ color: '#6a6a6a', fontSize: '5vh' }}>
        Not playing
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',width:'100%',position:'relative'}}>
      {/* Main content — key triggers fade animation on track change */}
      <div key={track.track + '|' + track.artist} style={{display:'flex',flexDirection:'row',alignItems:'center',flex:1,gap:'3vw',padding:'1.5vh 2vw',minHeight:0,animation:'fadeSlideIn 0.4s ease'}}>
        {/* Album art */}
        <div style={{width:'25vh',height:'25vh',maxWidth:'30%',borderRadius:'12px',background:'#1e1e1e',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12vh',overflow:'hidden'}}>
          {track.artwork ? <img src={track.artwork} style={{width:'100%',height:'100%',objectFit:'cover',animation:'fadeIn 0.3s ease'}} alt="" /> : '\u{1F3B5}'}
        </div>
        {/* Track info */}
        <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',gap:'1vh',minWidth:0}}>
          <MarqueeText text={track.track} style={{fontSize:'7vh',fontWeight:600,color:'#e0e0e0',lineHeight:1.1}} />
          <div style={{fontSize:'5vh',color:'#6a6a6a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.1}}>{track.artist}</div>
          <div style={{display:'flex',gap:'3vw',marginTop:'0.5vh'}}>
            <button onClick={() => cmd('previous')} style={{fontSize:'8vh',background:'none',border:'none',color:'#e0e0e0',cursor:'pointer',opacity:0.7,padding:0,lineHeight:1}}>{'\u23EE'}</button>
            <button onClick={() => cmd('playpause')} style={{fontSize:'9vh',background:'none',border:'none',color:'#e0e0e0',cursor:'pointer',opacity:0.9,padding:0,lineHeight:1}}>{track.playing ? '\u23F8' : '\u25B6'}</button>
            <button onClick={() => cmd('next')} style={{fontSize:'8vh',background:'none',border:'none',color:'#e0e0e0',cursor:'pointer',opacity:0.7,padding:0,lineHeight:1}}>{'\u23ED'}</button>
          </div>
        </div>
      </div>
      {/* Prev/Next track bar */}
      {(track.prevTrack || track.nextTrack) && (
        <div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          <button onClick={() => cmd('previous')} style={{flex:1,padding:'1vh 2vw',cursor:'pointer',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',borderRight:'1px solid rgba(255,255,255,0.06)',background:'none',border:'none',borderRight:'1px solid rgba(255,255,255,0.06)',textAlign:'left',touchAction:'manipulation'}}>
            {track.prevTrack ? (
              <>
                <span style={{fontSize:'2.5vh',color:'#6a6a6a',marginRight:'0.5vw'}}>{'\u23EE'}</span>
                <span style={{fontSize:'2.8vh',color:'#8a8a8a'}}>{track.prevTrack.name}</span>
                <span style={{fontSize:'2.2vh',color:'#6a6a6a',marginLeft:'0.5vw'}}>{track.prevTrack.artist}</span>
              </>
            ) : <span style={{fontSize:'2.5vh',color:'#4a4a4a'}}>&nbsp;</span>}
          </button>
          <button onClick={() => cmd('next')} style={{flex:1,padding:'1vh 2vw',cursor:'pointer',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',textAlign:'right',background:'none',border:'none',touchAction:'manipulation'}}>
            {track.nextTrack ? (
              <>
                <span style={{fontSize:'2.8vh',color:'#8a8a8a'}}>{track.nextTrack.name}</span>
                <span style={{fontSize:'2.2vh',color:'#6a6a6a',marginLeft:'0.5vw'}}>{track.nextTrack.artist}</span>
                <span style={{fontSize:'2.5vh',color:'#6a6a6a',marginLeft:'0.5vw'}}>{'\u23ED'}</span>
              </>
            ) : <span style={{fontSize:'2.5vh',color:'#4a4a4a'}}>&nbsp;</span>}
          </button>
        </div>
      )}
      {/* Browse button */}
      <button onClick={() => setBrowsing(true)} style={{position:'absolute',top:'1.5vh',right:'1.5vw',padding:'0.8vh 1.5vw',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',color:'#6a6a6a',fontSize:'3.5vh',cursor:'pointer'}}>Browse</button>
      {browsing && <div style={{position:'absolute',inset:0,animation:'slideUp 0.3s ease'}}><BrowseOverlay onClose={() => setBrowsing(false)} /></div>}
    </div>
  )
}
