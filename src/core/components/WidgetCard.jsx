import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getWidgetComponent } from '../../widgets/registry'

function SortableWidgetCard({ widget, selected, onSelect, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const Component = getWidgetComponent(widget.widgetId)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`widget-card size-${widget.size} edit-mode${isDragging ? ' dragging' : ''}${selected ? ' selected' : ''}`}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <div className="drag-handle" />
      <button className="widget-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}>x</button>
      <div className="widget-content">
        {Component ? <Component config={widget.config} /> : null}
      </div>
    </div>
  )
}

export default function WidgetCard({ widget, editMode, selected, onSelect, onRemove }) {
  const Component = getWidgetComponent(widget.widgetId)

  if (editMode) {
    return (
      <SortableWidgetCard
        widget={widget}
        selected={selected}
        onSelect={onSelect}
        onRemove={onRemove}
      />
    )
  }

  return (
    <div className={`widget-card size-${widget.size}`}>
      <div className="widget-content">
        {Component ? <Component config={widget.config} /> : null}
      </div>
    </div>
  )
}
