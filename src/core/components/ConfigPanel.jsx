import ConfigField from './ConfigField'
import { getWidgetConfig, getWidgetMeta } from '../../widgets/registry'

export default function ConfigPanel({ widget, onConfigChange, onSizeChange }) {
  if (!widget) {
    return (
      <div className="config-panel">
        <p className="no-selection">Select a widget to configure</p>
      </div>
    )
  }

  const widgetConfig = getWidgetConfig(widget.widgetId)
  const meta = getWidgetMeta(widget.widgetId)
  const schema = widgetConfig?.schema || []
  const defaults = widgetConfig?.defaults || {}
  const config = { ...defaults, ...widget.config }
  const validSizes = meta?.sizes || ['2x6', '3x6', '4x6']

  return (
    <div className="config-panel">
      <h3>{meta?.name || 'Widget'} Settings</h3>

      <div className="config-field">
        <label>Size</label>
        <div className="size-selector">
          {validSizes.map((s) => (
            <button
              key={s}
              className={widget.size === s ? 'active' : ''}
              onClick={() => onSizeChange(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {schema.filter((f) => !f.secret).map((field) => (
        <ConfigField
          key={field.key}
          field={field}
          value={config[field.key]}
          onChange={(val) => onConfigChange({ [field.key]: val })}
        />
      ))}

      {schema.filter((f) => !f.secret).length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>No additional settings</p>
      )}
    </div>
  )
}
