import WidgetPalette from './WidgetPalette'
import ConfigPanel from './ConfigPanel'

export default function EditPanel({ open, onAddWidget, selectedWidget, onConfigChange, onSizeChange, onDone }) {
  return (
    <div className={`edit-panel${open ? ' open' : ''}`}>
      <WidgetPalette onAddWidget={onAddWidget} />
      <ConfigPanel
        widget={selectedWidget}
        onConfigChange={onConfigChange}
        onSizeChange={onSizeChange}
      />
      {onDone && <button className="done-button" onClick={onDone}>Done</button>}
    </div>
  )
}
