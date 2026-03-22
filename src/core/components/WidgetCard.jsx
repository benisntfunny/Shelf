import React from 'react'
import { getWidgetComponent } from '../../widgets/registry'
import { GRID_COLS, GRID_ROWS } from '../constants'

function parseSize(size) {
  const [w, h] = (size || '').split('x').map(Number)
  if (!w || !h || w < 1 || w > GRID_COLS || h < 1 || h > GRID_ROWS) {
    console.warn(`[Shelf] Invalid widget size "${size}", falling back to 4x${GRID_ROWS}`)
    return { w: 4, h: GRID_ROWS }
  }
  return { w, h }
}

export default function WidgetCard({ widget }) {
  const Component = getWidgetComponent(widget.widgetId)
  const { w, h } = parseSize(widget.size)

  const style = {
    gridColumn: widget.col ? `${widget.col} / span ${w}` : `span ${w}`,
    gridRow: widget.row ? `${widget.row} / span ${h}` : `span ${h}`,
  }

  return (
    <div className="widget-card" style={style}>
      <div className="widget-content">
        {Component ? <Component config={widget.config} size={widget.size} /> : null}
      </div>
    </div>
  )
}
