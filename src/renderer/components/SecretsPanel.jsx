import { useState } from 'react'
import { getAllWidgets, getWidgetConfig } from '../../widgets/registry'

function getRequiredKeys() {
  const keys = []
  for (const meta of getAllWidgets()) {
    const config = getWidgetConfig(meta.id)
    if (!config?.schema) continue
    for (const field of config.schema) {
      if (field.secret) {
        keys.push({ widgetId: meta.id, widgetName: meta.name, key: field.key, label: field.label })
      }
    }
  }
  return keys
}

export default function SecretsPanel({ secrets, onUpdateSecret }) {
  const requiredKeys = getRequiredKeys()
  const [editing, setEditing] = useState({})

  if (requiredKeys.length === 0) {
    return (
      <div className="secrets-panel">
        <h3>API Keys</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>No widgets require API keys.</p>
      </div>
    )
  }

  return (
    <div className="secrets-panel">
      <h3>API Keys</h3>
      {requiredKeys.map(({ widgetId, widgetName, key, label }) => {
        const secretKey = `${widgetId}.${key}`
        const hasValue = !!secrets[secretKey]
        return (
          <div key={secretKey} className="config-field">
            <label>{widgetName} - {label}</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="password"
                value={editing[secretKey] ?? (hasValue ? '••••••••' : '')}
                onChange={(e) => setEditing({ ...editing, [secretKey]: e.target.value })}
                onFocus={() => {
                  if (editing[secretKey] === undefined) setEditing({ ...editing, [secretKey]: '' })
                }}
                onBlur={() => {
                  if (editing[secretKey] !== undefined && editing[secretKey] !== '') {
                    onUpdateSecret(secretKey, editing[secretKey])
                  }
                  setEditing((prev) => {
                    const next = { ...prev }
                    delete next[secretKey]
                    return next
                  })
                }}
                placeholder="Enter API key..."
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${hasValue ? 'var(--positive)' : 'var(--negative)'}`,
                  borderRadius: 6,
                  color: 'var(--text)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
