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

// Domain-based icons
const DOMAIN_ICONS = {
  light: '\uD83D\uDCA1', switch: '\uD83D\uDD0C', fan: '\uD83C\uDF00', sensor: '\uD83C\uDF21\uFE0F', binary_sensor: '\uD83D\uDCE1',
  climate: '\u2744\uFE0F', cover: '\uD83E\uDE9F', lock: '\uD83D\uDD12', scene: '\uD83C\uDFAC', script: '\uD83D\uDCDC',
  automation: '\u2699\uFE0F', input_boolean: '\uD83D\uDD18', camera: '\uD83D\uDCF7', media_player: '\uD83C\uDFB5',
}

function EntityControl({ entity, onCallService }) {
  const domain = entity.entity_id.split('.')[0]
  const name = entity.attributes?.friendly_name || entity.entity_id
  const state = entity.state
  const isOn = state === 'on'
  const icon = DOMAIN_ICONS[domain] || '\u2753'

  // Toggle domains
  if (['switch', 'light', 'fan', 'input_boolean'].includes(domain)) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{icon}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <button
          onClick={() => onCallService(domain, isOn ? 'turn_off' : 'turn_on', { entity_id: entity.entity_id })}
          data-no-swipe
          style={{
            padding:'3px 10px',
            borderRadius:'10px',
            border:'none',
            background: isOn ? '#c9a84c' : 'rgba(255,255,255,0.08)',
            color: isOn ? '#000' : '#6a6a6a',
            fontSize:'10px',
            fontWeight:600,
            cursor:'pointer',
            flexShrink:0,
            touchAction:'manipulation',
          }}
        >{isOn ? 'ON' : 'OFF'}</button>
      </div>
    )
  }

  // Sensors
  if (['sensor', 'binary_sensor'].includes(domain)) {
    const unit = entity.attributes?.unit_of_measurement || ''
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{icon}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <span style={{fontSize:'12px',color:'#c9a84c',fontWeight:600,flexShrink:0}}>{state}{unit ? ` ${unit}` : ''}</span>
      </div>
    )
  }

  // Climate
  if (domain === 'climate') {
    const currentTemp = entity.attributes?.current_temperature
    const targetTemp = entity.attributes?.temperature
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{icon}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
          {currentTemp != null && <span style={{fontSize:'11px',color:'#8a8a8a'}}>{currentTemp}&deg;</span>}
          {targetTemp != null && (
            <div style={{display:'flex',alignItems:'center',gap:'2px'}}>
              <button onClick={() => onCallService('climate', 'set_temperature', { entity_id: entity.entity_id, temperature: targetTemp - 1 })}
                data-no-swipe style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:'#e0e0e0',fontSize:'10px',width:'20px',height:'20px',cursor:'pointer',touchAction:'manipulation'}}>-</button>
              <span style={{fontSize:'12px',color:'#c9a84c',fontWeight:600,minWidth:'28px',textAlign:'center'}}>{targetTemp}&deg;</span>
              <button onClick={() => onCallService('climate', 'set_temperature', { entity_id: entity.entity_id, temperature: targetTemp + 1 })}
                data-no-swipe style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:'#e0e0e0',fontSize:'10px',width:'20px',height:'20px',cursor:'pointer',touchAction:'manipulation'}}>+</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Lock
  if (domain === 'lock') {
    const isLocked = state === 'locked'
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{isLocked ? '\uD83D\uDD12' : '\uD83D\uDD13'}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <button onClick={() => onCallService('lock', isLocked ? 'unlock' : 'lock', { entity_id: entity.entity_id })}
          data-no-swipe style={{padding:'3px 10px',borderRadius:'10px',border:'none',background:isLocked?'#4caf82':'#cf6679',color:'#fff',fontSize:'10px',fontWeight:600,cursor:'pointer',flexShrink:0,touchAction:'manipulation'}}>
          {isLocked ? 'LOCKED' : 'UNLOCKED'}
        </button>
      </div>
    )
  }

  // Scene/script/automation
  if (['scene', 'script', 'automation'].includes(domain)) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{icon}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <button onClick={() => {
          if (domain === 'scene') onCallService('scene', 'turn_on', { entity_id: entity.entity_id })
          else if (domain === 'script') onCallService('script', 'turn_on', { entity_id: entity.entity_id })
          else onCallService('automation', 'trigger', { entity_id: entity.entity_id })
        }} data-no-swipe style={{padding:'3px 10px',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.1)',background:'none',color:'#c9a84c',fontSize:'10px',fontWeight:600,cursor:'pointer',flexShrink:0,touchAction:'manipulation'}}>
          RUN
        </button>
      </div>
    )
  }

  // Cover
  if (domain === 'cover') {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
          <span style={{fontSize:'14px',flexShrink:0}}>{icon}</span>
          <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
        </div>
        <div style={{display:'flex',gap:'2px'}}>
          <button onClick={() => onCallService('cover', 'open_cover', { entity_id: entity.entity_id })} data-no-swipe style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:'#e0e0e0',fontSize:'9px',padding:'2px 6px',cursor:'pointer',touchAction:'manipulation'}}>Open</button>
          <button onClick={() => onCallService('cover', 'stop_cover', { entity_id: entity.entity_id })} data-no-swipe style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:'#e0e0e0',fontSize:'9px',padding:'2px 6px',cursor:'pointer',touchAction:'manipulation'}}>Stop</button>
          <button onClick={() => onCallService('cover', 'close_cover', { entity_id: entity.entity_id })} data-no-swipe style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'4px',color:'#e0e0e0',fontSize:'9px',padding:'2px 6px',cursor:'pointer',touchAction:'manipulation'}}>Close</button>
        </div>
      </div>
    )
  }

  // Default: show name + state
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',gap:'6px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'4px',overflow:'hidden',flex:1,minWidth:0}}>
        <span style={{fontSize:'14px',flexShrink:0}}>{icon}</span>
        <span style={{fontSize:'11px',color:'#e0e0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
      </div>
      <span style={{fontSize:'11px',color:'#8a8a8a',flexShrink:0}}>{state}</span>
    </div>
  )
}

function GroupCard({ name, entities, onCallService }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.03)',
      border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:'8px',
      padding:'6px 8px',
      marginBottom:'4px',
    }}>
      {name && <div style={{fontSize:'10px',color:'#6a6a6a',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px',fontWeight:600}}>{name}</div>}
      {entities.map(entity => (
        <EntityControl key={entity.entity_id} entity={entity} onCallService={onCallService} />
      ))}
    </div>
  )
}

export default function HomeAssistant({ config }) {
  const ref = useRef(null)
  const container = useContainerSize(ref)
  const [states, setStates] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const entityIds = config?.entities || []
  const groups = config?.groups || []

  // Collect all entity IDs (from both flat list and groups)
  const allEntityIds = [
    ...entityIds,
    ...groups.flatMap(g => (g.entities || '').split(',').map(e => e.trim()).filter(Boolean))
  ]

  useEffect(() => {
    if (allEntityIds.length === 0) {
      setLoading(false)
      return
    }

    function poll() {
      window.shelf?.haGetStates?.(allEntityIds).then(result => {
        if (result.ok) {
          setStates(result.states)
          setError(null)
        } else {
          setError(result.error)
        }
        setLoading(false)
      }).catch(e => {
        setError(e.message)
        setLoading(false)
      })
    }

    poll()
    const timer = setInterval(poll, 5000)
    return () => clearInterval(timer)
  }, [allEntityIds.join(',')])

  function handleCallService(domain, service, data) {
    window.shelf?.haCallService?.({ domain, service, data }).then(() => {
      // Re-fetch after action
      setTimeout(() => {
        window.shelf?.haGetStates?.(allEntityIds).then(result => {
          if (result.ok) setStates(result.states)
        })
      }, 500)
    })
  }

  if (loading) {
    return (
      <div ref={ref} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'#6a6a6a',fontSize:'12px'}}>Connecting to HA...</span>
      </div>
    )
  }

  if (allEntityIds.length === 0) {
    return (
      <div ref={ref} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'#6a6a6a',fontSize:'12px',textAlign:'center',padding:'8px'}}>Add entities<br/>in settings</span>
      </div>
    )
  }

  if (error) {
    const isAuth = error.includes('401') || error.includes('403')
    return (
      <div ref={ref} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'4px'}}>
        <span style={{color:'#cf6679',fontSize:'12px',textAlign:'center',padding:'8px'}}>
          {isAuth ? 'Invalid token \u2014 check Keys tab' : error.includes('not configured') ? 'Configure HA in Keys tab' : 'Cannot reach HA'}
        </span>
      </div>
    )
  }

  // Build groups for display
  const stateMap = new Map(states.map(s => [s.entity_id, s]))
  const groupedEntityIds = new Set(groups.flatMap(g => (g.entities || '').split(',').map(e => e.trim()).filter(Boolean)))
  const ungrouped = entityIds.filter(id => !groupedEntityIds.has(id)).map(id => stateMap.get(id)).filter(Boolean)

  return (
    <div ref={ref} style={{
      height:'100%',width:'100%',
      overflow:'auto',
      padding:'4px',
    }}>
      {groups.map((group, i) => {
        const gEntities = (group.entities || '').split(',').map(e => e.trim()).filter(Boolean).map(id => stateMap.get(id)).filter(Boolean)
        if (gEntities.length === 0) return null
        return <GroupCard key={i} name={group.name} entities={gEntities} onCallService={handleCallService} />
      })}
      {ungrouped.length > 0 && (
        <GroupCard name={groups.length > 0 ? 'Other' : ''} entities={ungrouped} onCallService={handleCallService} />
      )}
    </div>
  )
}
