import React from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import WidgetCard from './WidgetCard'

export default function WidgetBar({ widgets, editMode, selectedWidgetId, onSelect, onRemove, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id)
      const newIndex = widgets.findIndex((w) => w.id === over.id)
      onReorder(arrayMove(widgets, oldIndex, newIndex))
    }
  }

  if (!editMode) {
    return (
      <div className="widget-bar">
        {widgets.map((widget) => (
          <WidgetCard key={widget.id} widget={widget} editMode={false} />
        ))}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgets.map((w) => w.id)} strategy={horizontalListSortingStrategy}>
        <div className="widget-bar">
          {widgets.map((widget) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              editMode={true}
              selected={selectedWidgetId === widget.id}
              onSelect={() => onSelect(widget.id)}
              onRemove={() => onRemove(widget.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
