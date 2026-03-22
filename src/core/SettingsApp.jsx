import React, { useState, useRef, useCallback } from 'react'
import { useLayout } from './hooks/useLayout'
import { useEditMode } from './hooks/useEditMode'
import { useSecrets } from './hooks/useSecrets'
import { getWidgetMeta } from '../widgets/registry'
import EditPanel from './components/EditPanel'
import SecretsPanel from './components/SecretsPanel'
import WidgetStore from '../store/WidgetStore'
import { GRID_COLS, GRID_ROWS } from './constants'
import './settings.css'

const TABS = [
  { id: 'layout', label: 'Layout' },
  { id: 'store', label: 'Widget Store' },
  { id: 'keys', label: 'Keys' },
  { id: 'about', label: 'About' },
]

function parseSize(size) {
  const [w, h] = (size || '').split('x').map(Number)
  return { w: w || 4, h: h || GRID_ROWS }
}

function cellsOverlap(c1, r1, w1, h1, c2, r2, w2, h2) {
  return c1 < c2 + w2 && c1 + w1 > c2 && r1 < r2 + h2 && r1 + h1 > r2
}

function canPlace(col, row, w, h, widgets, excludeId) {
  if (col < 1 || row < 1 || col + w - 1 > GRID_COLS || row + h - 1 > GRID_ROWS) return false
  for (const other of widgets) {
    if (other.id === excludeId) continue
    const os = parseSize(other.size)
    if (cellsOverlap(col, row, w, h, other.col || 1, other.row || 1, os.w, os.h)) return false
  }
  return true
}

function BarPreview({ widgets, selectedWidgetId, onSelect, onRemove, onSizeChange, onMoveWidget }) {
  const gridRef = useRef(null)
  const [dragState, setDragState] = useState(null) // { id, ghostCol, ghostRow, valid }

  const getGridPos = useCallback((clientX, clientY) => {
    if (!gridRef.current) return { col: 1, row: 1 }
    const rect = gridRef.current.getBoundingClientRect()
    const gap = 4, pad = 4
    const cellW = (rect.width - pad * 2 - gap * (GRID_COLS - 1)) / GRID_COLS
    const cellH = (rect.height - pad * 2 - gap * (GRID_ROWS - 1)) / GRID_ROWS
    const col = Math.max(1, Math.min(GRID_COLS, Math.round((clientX - rect.left - pad) / (cellW + gap)) + 1))
    const row = Math.max(1, Math.min(GRID_ROWS, Math.round((clientY - rect.top - pad) / (cellH + gap)) + 1))
    return { col, row }
  }, [])

  function handleDragStart(e, widget) {
    if (e.target.closest('.preview-resize') || e.target.closest('.preview-remove')) return
    e.preventDefault()
    const { w, h } = parseSize(widget.size)
    let didDrag = false

    function onMove(ev) {
      didDrag = true
      const { col, row } = getGridPos(ev.clientX, ev.clientY)
      // Clamp so widget doesn't extend past grid
      const clampedCol = Math.min(col, GRID_COLS - w + 1)
      const clampedRow = Math.min(row, GRID_ROWS - h + 1)
      const valid = canPlace(clampedCol, clampedRow, w, h, widgets, widget.id)
      setDragState({ id: widget.id, ghostCol: clampedCol, ghostRow: clampedRow, w, h, valid })
    }

    function onUp(ev) {
      if (didDrag) {
        const { col, row } = getGridPos(ev.clientX, ev.clientY)
        const clampedCol = Math.min(col, GRID_COLS - w + 1)
        const clampedRow = Math.min(row, GRID_ROWS - h + 1)
        if (canPlace(clampedCol, clampedRow, w, h, widgets, widget.id)) {
          onMoveWidget(widget.id, clampedCol, clampedRow)
        }
      }
      setDragState(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    setDragState({ id: widget.id, ghostCol: widget.col || 1, ghostRow: widget.row || 1, w, h, valid: true })
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleResizeStart(e, widget, edge) {
    e.stopPropagation()
    e.preventDefault()
    const { w, h } = parseSize(widget.size)
    const startX = e.clientX
    const startY = e.clientY

    function onMoveResize(ev) {
      if (!gridRef.current) return
      const rect = gridRef.current.getBoundingClientRect()
      const gap = 4, pad = 4
      const cellW = (rect.width - pad * 2 - gap * (GRID_COLS - 1)) / GRID_COLS
      const cellH = (rect.height - pad * 2 - gap * (GRID_ROWS - 1)) / GRID_ROWS
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY

      let newW = w, newH = h
      if (edge === 'right' || edge === 'corner') newW = Math.max(1, Math.min(GRID_COLS, w + Math.round(dx / cellW)))
      if (edge === 'bottom' || edge === 'corner') newH = Math.max(1, Math.min(GRID_ROWS, h + Math.round(dy / cellH)))

      const col = widget.col || 1, row = widget.row || 1
      if (col + newW - 1 > GRID_COLS) newW = GRID_COLS - col + 1
      if (row + newH - 1 > GRID_ROWS) newH = GRID_ROWS - row + 1

      const newSize = `${newW}x${newH}`
      if (newSize !== widget.size) onSizeChange(widget.id, newSize)
    }

    function onUp() {
      window.removeEventListener('mousemove', onMoveResize)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMoveResize)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="preview-grid" ref={gridRef}>
      {/* Drop ghost */}
      {dragState && (
        <div
          className={`preview-ghost ${dragState.valid ? 'valid' : 'invalid'}`}
          style={{
            gridColumn: `${dragState.ghostCol} / span ${dragState.w}`,
            gridRow: `${dragState.ghostRow} / span ${dragState.h}`,
          }}
        />
      )}

      {widgets.map((widget) => {
        const { w, h } = parseSize(widget.size)
        const meta = getWidgetMeta(widget.widgetId)
        const isSelected = widget.id === selectedWidgetId
        const isDragging = dragState?.id === widget.id
        return (
          <div
            key={widget.id}
            className={`preview-cell${isSelected ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
            style={{
              gridColumn: `${widget.col || 1} / span ${w}`,
              gridRow: `${widget.row || 1} / span ${h}`,
            }}
            onClick={() => onSelect(widget.id)}
            onMouseDown={(e) => handleDragStart(e, widget)}
          >
            <span className="preview-icon">{meta?.icon || '?'}</span>
            <span className="preview-label">{meta?.name || widget.widgetId}</span>
            <span className="preview-size">{widget.size}</span>
            <button className="preview-remove" onClick={(e) => { e.stopPropagation(); onRemove(widget.id) }}>x</button>
            <div className="preview-resize preview-resize-right" onMouseDown={(e) => handleResizeStart(e, widget, 'right')} />
            <div className="preview-resize preview-resize-bottom" onMouseDown={(e) => handleResizeStart(e, widget, 'bottom')} />
            <div className="preview-resize preview-resize-corner" onMouseDown={(e) => handleResizeStart(e, widget, 'corner')} />
          </div>
        )
      })}
    </div>
  )
}

export default function SettingsApp() {
  const { layout, loaded, pages, activePage, setActivePage,
    addPage, removePage, renamePage,
    addWidget, removeWidget, updateWidgetConfig, updateWidgetSize, moveWidget } = useLayout()
  const { selectedWidgetId, selectWidget } = useEditMode()
  const { secrets, loaded: secretsLoaded, updateSecret } = useSecrets()
  const [activeTab, setActiveTab] = useState('layout')

  if (!loaded || !secretsLoaded) return (
    <div style={{ color: '#999', padding: 40, fontFamily: 'system-ui', textAlign: 'center' }}>
      <p>Loading Shelf settings...</p>
    </div>
  )

  const selectedWidget = layout.widgets.find((w) => w.id === selectedWidgetId)

  return (
    <div className="settings-app">
      <header className="settings-header">
        <h1>Shelf Settings</h1>
        <nav className="settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="settings-content">
        {activeTab === 'layout' && (
          <>
            <section className="settings-pages">
              <div className="page-tabs">
                {pages.map(p => (
                  <button key={p.id} className={`page-tab${p.id === activePage ? ' active' : ''}`}
                    onClick={() => setActivePage(p.id)}>{p.name}</button>
                ))}
                <button className="page-tab add" onClick={() => {
                  const name = window.prompt('Page name:')
                  if (name?.trim()) addPage(name.trim())
                }}>+</button>
              </div>
              {pages.length > 1 && (
                <div className="page-actions">
                  <button className="page-action" onClick={() => {
                    const name = window.prompt('Rename page:', pages.find(p => p.id === activePage)?.name)
                    if (name?.trim()) renamePage(activePage, name.trim())
                  }}>Rename</button>
                  <button className="page-action delete" onClick={() => {
                    const page = pages.find(p => p.id === activePage)
                    if (page?.widgets?.length > 0) {
                      if (!window.confirm(`Delete "${page.name}"? It has ${page.widgets.length} widget(s).`)) return
                    }
                    removePage(activePage)
                  }}>Delete Page</button>
                </div>
              )}
            </section>

            <section className="settings-preview">
              <h2>Bar Preview — {pages.find(p => p.id === activePage)?.name || 'Page'}</h2>
              <BarPreview
                widgets={layout.widgets}
                selectedWidgetId={selectedWidgetId}
                onSelect={selectWidget}
                onRemove={removeWidget}
                onSizeChange={(id, size) => updateWidgetSize(id, size)}
                onMoveWidget={moveWidget}
              />
            </section>

            <section className="settings-editor">
              <EditPanel
                open={true}
                onAddWidget={addWidget}
                selectedWidget={selectedWidget}
                onConfigChange={(config) => selectedWidget && updateWidgetConfig(selectedWidget.id, config)}
                onSizeChange={(size) => selectedWidget && updateWidgetSize(selectedWidget.id, size)}
              />
            </section>
          </>
        )}

        {activeTab === 'store' && (
          <WidgetStore onAddWidget={(widgetId, size) => {
            addWidget(widgetId, size)
            setActiveTab('layout')
          }} />
        )}

        {activeTab === 'keys' && (
          <section className="settings-secrets">
            <SecretsPanel secrets={secrets} onUpdateSecret={updateSecret} />
          </section>
        )}

        {activeTab === 'about' && (
          <section className="settings-about">
            <div className="about-content">
              <h2>Shelf</h2>
              <p className="about-version">v0.1.0</p>
              <p className="about-desc">
                A customizable widget bar for your desktop. Add, configure, and arrange widgets
                to create your perfect information display.
              </p>
              <div className="about-links">
                <a href="#" className="about-link" onClick={(e) => { e.preventDefault(); window.open?.('https://github.com/benisntfunny/Shelf') }}>GitHub Repository</a>
                <a href="#" className="about-link" onClick={(e) => { e.preventDefault(); window.open?.('https://github.com/benisntfunny/Shelf/releases') }}>Check for Updates</a>
              </div>
              <p className="about-copy">Built with Electron + React</p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
