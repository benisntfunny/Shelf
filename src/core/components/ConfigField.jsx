import { useState, useEffect } from 'react'

const DOMAIN_ICONS = {
  light: '💡', switch: '🔌', fan: '🌀', sensor: '🌡️', binary_sensor: '📡',
  climate: '❄️', cover: '🪟', lock: '🔒', scene: '🎬', script: '📜',
  automation: '⚙️', input_boolean: '🔘', camera: '📷', media_player: '🎵',
  person: '👤', device_tracker: '📍', weather: '🌤️', sun: '☀️',
  vacuum: '🧹', number: '🔢', select: '📋', button: '🔘',
}

const DOMAIN_ORDER = ['light','switch','fan','climate','cover','lock','sensor','binary_sensor',
  'scene','script','automation','media_player','camera','input_boolean','person','device_tracker']

function HAEntityPicker({ value, onChange }) {
  const [allEntities, setAllEntities] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [expandedDomains, setExpandedDomains] = useState({})

  const selected = Array.isArray(value) ? value : []

  function fetchEntities() {
    setLoading(true)
    setError(null)
    window.shelf?.haGetEntities?.().then(result => {
      if (result?.ok) {
        setAllEntities(result.entities)
      } else {
        setError(result?.error || 'Failed to fetch entities')
      }
      setLoading(false)
    }).catch(e => {
      setError(e.message)
      setLoading(false)
    })
  }

  useEffect(() => { fetchEntities() }, [])

  function toggleEntity(entityId) {
    if (selected.includes(entityId)) {
      onChange(selected.filter(id => id !== entityId))
    } else {
      onChange([...selected, entityId])
    }
  }

  function moveEntity(idx, dir) {
    const arr = [...selected]
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= arr.length) return
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    onChange(arr)
  }

  // Group entities by domain
  const grouped = {}
  if (allEntities) {
    for (const e of allEntities) {
      if (search && !e.friendly_name.toLowerCase().includes(search.toLowerCase()) &&
          !e.entity_id.toLowerCase().includes(search.toLowerCase())) continue
      if (!grouped[e.domain]) grouped[e.domain] = []
      grouped[e.domain].push(e)
    }
  }

  const sortedDomains = Object.keys(grouped).sort((a, b) => {
    const ai = DOMAIN_ORDER.indexOf(a)
    const bi = DOMAIN_ORDER.indexOf(b)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  return (
    <div className="config-field ha-entity-picker">
      <label>Entities</label>

      {/* Selected entities with reorder */}
      {selected.length > 0 && (
        <div className="ha-selected">
          {selected.map((entityId, i) => {
            const domain = entityId.split('.')[0]
            const entity = allEntities?.find(e => e.entity_id === entityId)
            return (
              <div key={entityId} className="ha-selected-item">
                <span className="ha-selected-icon">{DOMAIN_ICONS[domain] || '❓'}</span>
                <span className="ha-selected-name">{entity?.friendly_name || entityId}</span>
                <div className="ha-selected-actions">
                  <button onClick={() => moveEntity(i, -1)} disabled={i === 0}>↑</button>
                  <button onClick={() => moveEntity(i, 1)} disabled={i === selected.length - 1}>↓</button>
                  <button onClick={() => toggleEntity(entityId)} className="ha-remove">×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Search and browse */}
      {loading && <div style={{color:'var(--muted)',fontSize:12,padding:'8px 0'}}>Loading entities...</div>}
      {error && (
        <div style={{color:'var(--negative)',fontSize:12,padding:'8px 0'}}>
          {error.includes('not configured') ? 'Set HA credentials in Keys tab first' : error}
          <button onClick={fetchEntities} style={{marginLeft:8,fontSize:11,color:'var(--accent)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Retry</button>
        </div>
      )}

      {allEntities && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entities..."
            style={{width:'100%',padding:'6px 10px',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,color:'var(--text)',fontSize:12,outline:'none',marginTop:6}}
          />
          <div className="ha-domain-list">
            {sortedDomains.map(domain => {
              const entities = grouped[domain]
              const isExpanded = expandedDomains[domain] || search.length > 0
              const icon = DOMAIN_ICONS[domain] || '❓'
              const selectedCount = entities.filter(e => selected.includes(e.entity_id)).length

              return (
                <div key={domain} className="ha-domain-group">
                  <button className="ha-domain-header" onClick={() => setExpandedDomains(prev => ({ ...prev, [domain]: !prev[domain] }))}>
                    <span>{icon} {domain} ({entities.length})</span>
                    {selectedCount > 0 && <span className="ha-domain-badge">{selectedCount} added</span>}
                    <span className="ha-domain-arrow">{isExpanded ? '▾' : '▸'}</span>
                  </button>
                  {isExpanded && (
                    <div className="ha-entity-list">
                      {entities.map(e => {
                        const isSelected = selected.includes(e.entity_id)
                        return (
                          <button
                            key={e.entity_id}
                            className={`ha-entity-item${isSelected ? ' selected' : ''}`}
                            onClick={() => toggleEntity(e.entity_id)}
                          >
                            <span className="ha-entity-name">{e.friendly_name}</span>
                            <span className="ha-entity-state">{e.state}</span>
                            <span className="ha-entity-check">{isSelected ? '✓' : '+'}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function ConfigField({ field, value, onChange }) {
  const [listInput, setListInput] = useState('')

  if (field.type === 'ha-entity-picker') {
    return <HAEntityPicker value={value} onChange={onChange} />
  }

  if (field.type === 'toggle') {
    return (
      <div className="config-field toggle-field">
        <label>{field.label}</label>
        <button
          className={`toggle${value ? ' on' : ''}`}
          onClick={() => onChange(!value)}
        />
      </div>
    )
  }

  if (field.type === 'checklist') {
    const selected = Array.isArray(value) ? value : []
    return (
      <div className="config-field checklist-field">
        <label>{field.label}</label>
        <div className="checklist-options">
          {(field.options || []).map((opt) => {
            const isObj = typeof opt === 'object'
            const val = isObj ? opt.value : opt
            const lbl = isObj ? opt.label : opt
            const checked = selected.includes(val)
            return (
              <button
                key={val}
                className={`checklist-option${checked ? ' checked' : ''}`}
                onClick={() => {
                  if (checked) {
                    onChange(selected.filter(v => v !== val))
                  } else {
                    onChange([...selected, val])
                  }
                }}
              >
                <span className="checklist-check">{checked ? '✓' : ''}</span>
                {lbl}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="config-field">
        <label>{field.label}</label>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((opt) => {
            const isObj = typeof opt === 'object'
            const val = isObj ? opt.value : opt
            const lbl = isObj ? opt.label : opt
            return <option key={val} value={val}>{lbl}</option>
          })}
        </select>
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div className="config-field">
        <label>{field.label}</label>
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    )
  }

  if (field.type === 'list') {
    const items = Array.isArray(value) ? value : []

    // Structured list with itemSchema (array of objects)
    if (field.itemSchema) {
      return (
        <div className="config-field list-field">
          <label>{field.label}</label>
          <div className="list-items">
            {items.map((item, i) => (
              <div key={i} className="list-item-structured">
                {field.itemSchema.map((sub) => {
                  if (sub.type === 'select') {
                    return (
                      <select
                        key={sub.key}
                        value={item?.[sub.key] ?? ''}
                        onChange={(e) => {
                          const updated = [...items]
                          updated[i] = { ...updated[i], [sub.key]: e.target.value }
                          onChange(updated)
                        }}
                      >
                        {(sub.options || []).map((opt) => {
                          const isObj = typeof opt === 'object'
                          const val = isObj ? opt.value : opt
                          const lbl = isObj ? opt.label : opt
                          return <option key={val} value={val}>{lbl}</option>
                        })}
                      </select>
                    )
                  }
                  return (
                    <input
                      key={sub.key}
                      type="text"
                      value={item?.[sub.key] ?? ''}
                      placeholder={sub.placeholder || sub.label}
                      onChange={(e) => {
                        const updated = [...items]
                        updated[i] = { ...updated[i], [sub.key]: e.target.value }
                        onChange(updated)
                      }}
                    />
                  )
                })}
                <button onClick={() => onChange(items.filter((_, j) => j !== i))}>x</button>
              </div>
            ))}
          </div>
          <button className="add-btn" onClick={() => {
            const empty = {}
            field.itemSchema.forEach((sub) => { empty[sub.key] = '' })
            onChange([...items, empty])
          }}>+ Add</button>
        </div>
      )
    }

    // Simple string list
    return (
      <div className="config-field list-field">
        <label>{field.label}</label>
        <div className="list-items">
          {items.map((item, i) => (
            <span key={i} className="list-item">
              {item}
              <button onClick={() => onChange(items.filter((_, j) => j !== i))}>x</button>
            </span>
          ))}
        </div>
        <div className="add-row">
          <input
            type="text"
            value={listInput}
            onChange={(e) => setListInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && listInput.trim()) {
                onChange([...items, listInput.trim()])
                setListInput('')
              }
            }}
            placeholder="Add item..."
          />
          <button onClick={() => {
            if (listInput.trim()) {
              onChange([...items, listInput.trim()])
              setListInput('')
            }
          }}>Add</button>
        </div>
      </div>
    )
  }

  // Default: text
  return (
    <div className="config-field">
      <label>{field.label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || ''}
      />
    </div>
  )
}
