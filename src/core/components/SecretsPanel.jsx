import { useState } from 'react'
import { getAllWidgets, getWidgetConfig, getAllSecretsSchema } from '../../widgets/registry'

function getRequiredKeys() {
  const keys = []

  // New: secretsSchema (flat keys, shared across instances)
  for (const field of getAllSecretsSchema()) {
    keys.push({
      key: field.key,
      label: field.label,
      placeholder: field.placeholder || '',
      isSecret: field.secret !== false,
      widgetName: field.widgetName,
      source: 'secretsSchema',
    })
  }

  // Legacy: configSchema fields with secret: true
  for (const meta of getAllWidgets()) {
    const config = getWidgetConfig(meta.id)
    if (!config?.schema) continue
    for (const field of config.schema) {
      if (field.secret) {
        keys.push({
          key: `${meta.id}.${field.key}`,
          label: field.label,
          placeholder: '',
          isSecret: true,
          widgetName: meta.name,
          source: 'configSchema',
        })
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
      {requiredKeys.map(({ key, label, placeholder, isSecret, widgetName }) => {
        const hasValue = !!secrets[key]
        return (
          <div key={key} className="config-field">
            <label>
              {widgetName} - {label}
              {!hasValue && <span style={{ color: 'var(--negative)', marginLeft: 6, fontSize: 11 }}>not set</span>}
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type={isSecret ? 'password' : 'text'}
                value={editing[key] ?? (hasValue ? (isSecret ? '••••••••' : secrets[key]) : '')}
                onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                onFocus={() => {
                  if (editing[key] === undefined) setEditing({ ...editing, [key]: '' })
                }}
                onBlur={() => {
                  if (editing[key] !== undefined && editing[key] !== '') {
                    onUpdateSecret(key, editing[key])
                  }
                  setEditing((prev) => {
                    const next = { ...prev }
                    delete next[key]
                    return next
                  })
                }}
                placeholder={placeholder || 'Enter API key...'}
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
