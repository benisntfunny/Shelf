import React from 'react'
import WidgetCard from './WidgetCard'

export default function WidgetBar({ widgets, className }) {
  return (
    <div className={`widget-bar ${className || ''}`}>
      {widgets.map((widget) => (
        <WidgetCard key={widget.id} widget={widget} />
      ))}
    </div>
  )
}
