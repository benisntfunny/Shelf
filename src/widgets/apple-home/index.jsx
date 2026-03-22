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

// Match service type UUIDs (last 8 hex chars of the full UUID)
function svcType(svc) {
  const t = (svc.type || '').toUpperCase()
  if (t.includes('00000043')) return 'lightbulb'
  if (t.includes('00000049')) return 'switch'
  if (t.includes('0000004A')) return 'thermostat'
  if (t.includes('00000045')) return 'lock'
  if (t.includes('00000041')) return 'garage'
  if (t.includes('00000080')) return 'contact'
  if (t.includes('0000008A')) return 'temp-sensor'
  if (t.includes('00000082')) return 'humidity-sensor'
  if (t.includes('00000085')) return 'motion-sensor'
  if (t.includes('00000047')) return 'outlet'
  if (t.includes('00000040')) return 'fan'
  return null
}

function chrValue(svc, chrTypeFragment) {
  const c = svc.characteristics.find(ch => (ch.type || '').toUpperCase().includes(chrTypeFragment.toUpperCase()))
  return c ? { value: c.value, iid: c.iid } : null
}

function AccessoryControl({ accessory, onControl }) {
  const name = accessory.name

  // Find the main controllable service (skip AccessoryInformation service)
  const mainSvc = accessory.services.find(s => svcType(s) != null)
  if (!mainSvc) {
    return (
      <div style={{display:'flex',alignItems:'center',padding:'4px 0',gap:'4px'}}>
        <span style={{fontSize:'11px',color:'#6a6a6a'}}>{name}</span>
      </div>
    )
  }

  const type = svcType(mainSvc)
  const bridgeId = accessory.bridgeId
  const aid = accessory.aid

  // Toggle types (lightbulb, switch, outlet, fan)
  if (['lightbulb', 'switch', 'outlet', 'fan'].includes(type)) {
    const onChr = chrValue(mainSvc, '00000025')
    const isOn = onChr?.value === true || onChr?.value === 1
    const icon = type === 'lightbulb' ? '\uD83D\uDCA1' : type === 'fan' ? '\uD83C\uDF00' : '\uD83D\uDD0C'

    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{icon}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <button onClick={() => onControl(bridgeId, aid, onChr.iid, !isOn)} data-no-swipe
          style={{padding:'3px 10px',borderRadius:'10px',border:'none',
            background:isOn?'#c9a84c':'rgba(255,255,255,0.08)',
            color:isOn?'#000':'#6a6a6a',fontSize:'10px',fontWeight:600,cursor:'pointer',flexShrink:0,touchAction:'manipulation'}}>
          {isOn ? 'ON' : 'OFF'}
        </button>
      </div>
    )
  }

  // Temperature/humidity sensors
  if (['temp-sensor', 'humidity-sensor'].includes(type)) {
    const tempChr = chrValue(mainSvc, '00000011') || chrValue(mainSvc, '00000010')
    const icon = type === 'temp-sensor' ? '\uD83C\uDF21\uFE0F' : '\uD83D\uDCA7'
    const unit = type === 'temp-sensor' ? '\u00B0' : '%'
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{icon}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <span style={{fontSize:'12px',color:'#c9a84c',fontWeight:600}}>{tempChr?.value ?? '?'}{unit}</span>
      </div>
    )
  }

  // Lock
  if (type === 'lock') {
    const lockState = chrValue(mainSvc, '0000001D')
    const lockTarget = chrValue(mainSvc, '0000001E')
    const isLocked = lockState?.value === 1
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{isLocked ? '\uD83D\uDD12' : '\uD83D\uDD13'}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <button onClick={() => lockTarget && onControl(bridgeId, aid, lockTarget.iid, isLocked ? 0 : 1)} data-no-swipe
          style={{padding:'3px 10px',borderRadius:'10px',border:'none',background:isLocked?'#4caf82':'#cf6679',color:'#fff',fontSize:'10px',fontWeight:600,cursor:'pointer',flexShrink:0,touchAction:'manipulation'}}>
          {isLocked ? 'LOCKED' : 'UNLOCKED'}
        </button>
      </div>
    )
  }

  // Contact sensor, motion sensor
  if (['contact', 'motion-sensor'].includes(type)) {
    const stateChr = type === 'contact' ? chrValue(mainSvc, '0000006A') : chrValue(mainSvc, '00000022')
    const icon = type === 'contact' ? '\uD83D\uDEAA' : '\uD83D\uDC64'
    const stateText = type === 'contact' ? (stateChr?.value === 0 ? 'Closed' : 'Open') : (stateChr?.value ? 'Motion' : 'Clear')
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{icon}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <span style={{fontSize:'11px',color:'#8a8a8a'}}>{stateText}</span>
      </div>
    )
  }

  // Thermostat
  if (type === 'thermostat') {
    const currentTemp = chrValue(mainSvc, '00000011')
    const targetTemp = chrValue(mainSvc, '00000035')
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{'\u2744\uFE0F'}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>
          {currentTemp && <span style={{fontSize:'11px',color:'#8a8a8a'}}>{currentTemp.value}{'\u00B0'}</span>}
          {targetTemp && (
            <div style={{display:'flex',alignItems:'center',gap:'2px'}}>
              <button onClick={() => onControl(bridgeId, aid, targetTemp.iid, (targetTemp.value || 20) - 1)} data-no-swipe
                style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:'#e0e0e0',fontSize:'10px',width:'20px',height:'20px',cursor:'pointer',touchAction:'manipulation'}}>-</button>
              <span style={{fontSize:'12px',color:'#c9a84c',fontWeight:600,minWidth:'28px',textAlign:'center'}}>{targetTemp.value}{'\u00B0'}</span>
              <button onClick={() => onControl(bridgeId, aid, targetTemp.iid, (targetTemp.value || 20) + 1)} data-no-swipe
                style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:'#e0e0e0',fontSize:'10px',width:'20px',height:'20px',cursor:'pointer',touchAction:'manipulation'}}>+</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Fallback
  return (
    <div style={{display:'flex',alignItems:'center',padding:'4px 0',gap:'4px'}}>
      <span style={{fontSize:'11px',color:'#6a6a6a'}}>{name}</span>
    </div>
  )
}

function PairingUI() {
  const [devices, setDevices] = useState([])
  const [discovering, setDiscovering] = useState(false)
  const [pairing, setPairing] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function discover() {
    setDiscovering(true)
    setError(null)
    const result = await window.shelf?.homekitDiscover?.()
    if (result?.ok) setDevices(result.devices || [])
    else setError(result?.error || 'Discovery failed')
    setDiscovering(false)
  }

  async function pair() {
    if (!pairing || !pin) return
    setError(null)
    const result = await window.shelf?.homekitPair?.({ deviceId: pairing, pin })
    if (result?.ok) {
      setSuccess(`Paired with ${result.name}!`)
      setPairing(null)
      setPin('')
    } else {
      setError(result?.error || 'Pairing failed')
    }
  }

  return (
    <div style={{padding:'8px',display:'flex',flexDirection:'column',gap:'6px',height:'100%'}}>
      <div style={{fontSize:'11px',color:'#6a6a6a',textAlign:'center'}}>No HomeKit devices paired</div>
      <button onClick={discover} disabled={discovering} data-no-swipe
        style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#c9a84c',fontSize:'11px',cursor:'pointer',touchAction:'manipulation',alignSelf:'center'}}>
        {discovering ? 'Searching...' : 'Discover Devices'}
      </button>

      {devices.length > 0 && !pairing && (
        <div style={{overflow:'auto',flex:1}}>
          {devices.map(d => (
            <div key={d.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <span style={{fontSize:'11px',color:'#e0e0e0'}}>{d.name}</span>
              <button onClick={() => setPairing(d.id)} data-no-swipe
                style={{padding:'2px 8px',borderRadius:'4px',border:'1px solid rgba(255,255,255,0.1)',background:'none',color:'#c9a84c',fontSize:'10px',cursor:'pointer',touchAction:'manipulation'}}>
                Pair
              </button>
            </div>
          ))}
        </div>
      )}

      {pairing && (
        <div style={{display:'flex',flexDirection:'column',gap:'4px',alignItems:'center'}}>
          <span style={{fontSize:'10px',color:'#8a8a8a'}}>Enter HomeKit PIN:</span>
          <input type="text" value={pin} onChange={e => setPin(e.target.value)} placeholder="123-45-678"
            style={{padding:'4px 8px',borderRadius:'4px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(0,0,0,0.3)',color:'#e0e0e0',fontSize:'12px',textAlign:'center',width:'120px'}} />
          <div style={{display:'flex',gap:'4px'}}>
            <button onClick={pair} data-no-swipe style={{padding:'3px 10px',borderRadius:'4px',background:'#c9a84c',color:'#000',border:'none',fontSize:'10px',fontWeight:600,cursor:'pointer',touchAction:'manipulation'}}>Pair</button>
            <button onClick={() => { setPairing(null); setPin('') }} data-no-swipe style={{padding:'3px 10px',borderRadius:'4px',background:'none',border:'1px solid rgba(255,255,255,0.1)',color:'#6a6a6a',fontSize:'10px',cursor:'pointer',touchAction:'manipulation'}}>Cancel</button>
          </div>
        </div>
      )}

      {error && <div style={{fontSize:'10px',color:'#cf6679',textAlign:'center'}}>{error}</div>}
      {success && <div style={{fontSize:'10px',color:'#4caf82',textAlign:'center'}}>{success}</div>}
    </div>
  )
}

export default function AppleHome({ config }) {
  const ref = useRef(null)
  const container = useContainerSize(ref)
  const [accessories, setAccessories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasPairings, setHasPairings] = useState(null)

  const groups = config?.groups || []

  useEffect(() => {
    window.shelf?.homekitPairedDevices?.().then(result => {
      if (result?.ok && result.devices.length > 0) {
        setHasPairings(true)
        return window.shelf.homekitAccessories()
      } else {
        setHasPairings(false)
        setLoading(false)
        return null
      }
    }).then(result => {
      if (result?.ok) {
        setAccessories(result.accessories || [])
        setError(null)
      } else if (result) {
        setError(result.error)
      }
      setLoading(false)
    }).catch(e => {
      setError(e.message)
      setLoading(false)
    })
  }, [])

  // Poll accessories every 10 seconds
  useEffect(() => {
    if (!hasPairings) return
    const timer = setInterval(() => {
      window.shelf?.homekitAccessories?.().then(result => {
        if (result?.ok) {
          setAccessories(result.accessories || [])
          setError(null)
        }
      })
    }, 10000)
    return () => clearInterval(timer)
  }, [hasPairings])

  function handleControl(bridgeId, aid, iid, value) {
    window.shelf?.homekitControl?.({ bridgeId, aid, iid, value }).then(() => {
      // Refresh after control
      setTimeout(() => {
        window.shelf?.homekitAccessories?.().then(result => {
          if (result?.ok) setAccessories(result.accessories || [])
        })
      }, 500)
    })
  }

  if (loading) {
    return (
      <div ref={ref} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'#6a6a6a',fontSize:'12px'}}>Loading HomeKit...</span>
      </div>
    )
  }

  if (hasPairings === false) {
    return (
      <div ref={ref} style={{height:'100%',width:'100%'}}>
        <PairingUI />
      </div>
    )
  }

  if (error) {
    return (
      <div ref={ref} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'4px'}}>
        <span style={{color:'#cf6679',fontSize:'11px',textAlign:'center',padding:'8px'}}>{error}</span>
      </div>
    )
  }

  // Filter out accessories with errors or no services
  const validAccessories = accessories.filter(a => !a.error && a.services.length > 0)

  if (validAccessories.length === 0) {
    return (
      <div ref={ref} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'#6a6a6a',fontSize:'12px',textAlign:'center',padding:'8px'}}>No accessories found</span>
      </div>
    )
  }

  // Group accessories
  const groupedNames = new Set(groups.flatMap(g => (g.accessories || '').split(',').map(n => n.trim().toLowerCase()).filter(Boolean)))
  const ungrouped = validAccessories.filter(a => !groupedNames.has(a.name.toLowerCase()))

  return (
    <div ref={ref} style={{height:'100%',width:'100%',overflow:'auto',padding:'4px'}}>
      {groups.map((group, i) => {
        const names = (group.accessories || '').split(',').map(n => n.trim().toLowerCase()).filter(Boolean)
        const groupAccs = validAccessories.filter(a => names.includes(a.name.toLowerCase()))
        if (groupAccs.length === 0) return null
        return (
          <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'8px',padding:'6px 8px',marginBottom:'4px'}}>
            <div style={{fontSize:'10px',color:'#6a6a6a',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px',fontWeight:600}}>{group.name}</div>
            {groupAccs.map(acc => <AccessoryControl key={`${acc.bridgeId}-${acc.aid}`} accessory={acc} onControl={handleControl} />)}
          </div>
        )
      })}
      {ungrouped.length > 0 && (
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'8px',padding:'6px 8px'}}>
          {groups.length > 0 && <div style={{fontSize:'10px',color:'#6a6a6a',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px',fontWeight:600}}>Other</div>}
          {ungrouped.map(acc => <AccessoryControl key={`${acc.bridgeId}-${acc.aid}`} accessory={acc} onControl={handleControl} />)}
        </div>
      )}
    </div>
  )
}
