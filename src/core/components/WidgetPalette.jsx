import { getAllWidgets } from '../../widgets/registry'

export default function WidgetPalette({ onAddWidget }) {
  const widgets = getAllWidgets()

  return (
    <div className="widget-palette">
      <h3>Add Widget</h3>
      <div className="palette-grid">
        {widgets.map((w) => (
          <div
            key={w.id}
            className="palette-card"
            onClick={() => onAddWidget(w.id, w.defaultSize)}
          >
            <div className="icon">
              {typeof w.icon === 'string' && w.icon.endsWith('.png') ? (
                <img src={w.icon} alt={w.name} />
              ) : (
                w.icon
              )}
            </div>
            <div className="name">{w.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
