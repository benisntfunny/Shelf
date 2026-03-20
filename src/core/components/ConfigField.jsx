import { useState } from 'react'

export default function ConfigField({ field, value, onChange }) {
  const [listInput, setListInput] = useState('')

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

  if (field.type === 'select') {
    return (
      <div className="config-field">
        <label>{field.label}</label>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
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
      />
    </div>
  )
}
