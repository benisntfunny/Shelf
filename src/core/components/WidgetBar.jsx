import React from 'react'
import WidgetCard from './WidgetCard'

export default function WidgetBar({ widgets }) {
  return (
    <div className="widget-bar">
      {widgets.map((widget) => (
        <WidgetCard key={widget.id} widget={widget} />
      ))}
    </div>
  )
}
