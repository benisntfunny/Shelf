import { useState } from 'react'

export default function ConfigForm({ schema, values, onChange }) {
  if (!schema || schema.length === 0) return null

  return (
    <div className="config-form">
      {schema.filter((f) => !f.secret).map((field) => (
        <ConfigFormField
          key={field.key}
          field={field}
          value={values[field.key] ?? field.default}
          onChange={(val) => onChange({ [field.key]: val })}
        />
      ))}
    </div>
  )
}

function ConfigFormField({ field, value, onChange }) {
  const [listInput, setListInput] = useState('')

  if (field.type === 'boolean' || field.type === 'toggle') {
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
          min={field.min}
          max={field.max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    )
  }

  if (field.type === 'color') {
    return (
      <div className="config-field">
        <label>{field.label}</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="color"
            value={value || '#c9a84c'}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              background: 'transparent',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{value || '#c9a84c'}</span>
        </div>
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

  // Default: text (also handles secret:true as password)
  return (
    <div className="config-field">
      <label>{field.label}</label>
      <input
        type={field.secret ? 'password' : 'text'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || ''}
      />
    </div>
  )
}
