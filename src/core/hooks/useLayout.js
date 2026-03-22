import { useState, useEffect, useCallback } from 'react'

const DEFAULT_LAYOUT = {
  widgets: [
    { id: 'clock-1', widgetId: 'clock', size: '2x3', col: 1, row: 1, config: {} },
    { id: 'spacer-1', widgetId: 'spacer', size: '2x3', col: 3, row: 1, config: {} },
    { id: 'system-1', widgetId: 'system', size: '3x3', col: 5, row: 1, config: {} },
  ],
}

const SIZE_MIGRATION = {
  xs: '1x3', sm: '2x3', md: '3x3', lg: '4x3', xl: '6x3', full: '12x3', fill: '2x3'
}

function parseSize(size) {
  const [w, h] = (size || '4x3').split('x').map(Number)
  return { w: w || 4, h: h || 3 }
}

// Check if a widget at (col, row) with size (w, h) overlaps any existing widget
function overlaps(col, row, w, h, widgets, excludeId) {
  for (const other of widgets) {
    if (other.id === excludeId) continue
    if (!other.col || !other.row) continue
    const os = parseSize(other.size)
    const oCol = other.col, oRow = other.row
    if (col < oCol + os.w && col + w > oCol && row < oRow + os.h && row + h > oRow) {
      return true
    }
  }
  return false
}

// Find first available position for a widget of given size
function findOpenPosition(w, h, widgets) {
  for (let r = 1; r <= 3 - h + 1; r++) {
    for (let c = 1; c <= 12 - w + 1; c++) {
      if (!overlaps(c, r, w, h, widgets, null)) {
        return { col: c, row: r }
      }
    }
  }
  return { col: 1, row: 1 } // fallback
}

// Assign col/row to widgets that don't have them
function assignPositions(widgets) {
  const result = []
  for (const w of widgets) {
    if (w.col && w.row) {
      result.push(w)
    } else {
      const { w: sw, h: sh } = parseSize(w.size)
      const pos = findOpenPosition(sw, sh, result)
      result.push({ ...w, ...pos })
    }
  }
  return result
}

function migrateLayout(config) {
  if (!config?.widgets) return config
  let widgets = config.widgets.map((w) => {
    const migrated = SIZE_MIGRATION[w.size]
    if (migrated) return { ...w, size: migrated }
    return w
  })
  widgets = assignPositions(widgets)
  return { ...config, widgets }
}

export function useLayout() {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [loaded, setLoaded] = useState(false)

  const loadFromMain = useCallback(() => {
    if (window.shelf) {
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000))
      return Promise.race([window.shelf.getLayout(), timeout]).then((config) => {
        setLayout(migrateLayout(config) || DEFAULT_LAYOUT)
        setLoaded(true)
      }).catch(() => {
        console.error('useLayout: getLayout failed, using defaults')
        setLayout(DEFAULT_LAYOUT)
        setLoaded(true)
      })
    } else {
      setLoaded(true)
      return Promise.resolve()
    }
  }, [])

  useEffect(() => {
    loadFromMain()
  }, [loadFromMain])

  const reload = useCallback(() => {
    loadFromMain()
  }, [loadFromMain])

  const addWidget = useCallback((widgetId, size = '3x3') => {
    setLayout((prev) => {
      const id = `${widgetId}-${Date.now()}`
      const { w, h } = parseSize(size)
      const pos = findOpenPosition(w, h, prev.widgets)
      const next = { ...prev, widgets: [...prev.widgets, { id, widgetId, size, ...pos, config: {} }] }
      if (window.shelf) window.shelf.saveLayout(next)
      return next
    })
  }, [])

  const removeWidget = useCallback((id) => {
    setLayout((prev) => {
      const next = { ...prev, widgets: prev.widgets.filter((w) => w.id !== id) }
      if (window.shelf) window.shelf.saveLayout(next)
      return next
    })
  }, [])

  const reorderWidgets = useCallback((widgets) => {
    setLayout((prev) => {
      const next = { ...prev, widgets }
      if (window.shelf) window.shelf.saveLayout(next)
      return next
    })
  }, [])

  const updateWidgetConfig = useCallback((id, config) => {
    setLayout((prev) => {
      const next = {
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === id ? { ...w, config: { ...w.config, ...config } } : w)),
      }
      if (window.shelf) window.shelf.saveLayout(next)
      return next
    })
  }, [])

  const updateWidgetSize = useCallback((id, size) => {
    setLayout((prev) => {
      const { w, h } = parseSize(size)
      const widget = prev.widgets.find((ww) => ww.id === id)
      // Try to keep same position, but if it overflows the grid, adjust
      let col = widget?.col || 1, row = widget?.row || 1
      if (col + w - 1 > 12) col = Math.max(1, 12 - w + 1)
      if (row + h - 1 > 3) row = Math.max(1, 3 - h + 1)
      const next = {
        ...prev,
        widgets: prev.widgets.map((ww) => (ww.id === id ? { ...ww, size, col, row } : ww)),
      }
      if (window.shelf) window.shelf.saveLayout(next)
      return next
    })
  }, [])

  const moveWidget = useCallback((id, col, row) => {
    setLayout((prev) => {
      const next = {
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === id ? { ...w, col, row } : w)),
      }
      if (window.shelf) window.shelf.saveLayout(next)
      return next
    })
  }, [])

  return { layout, loaded, reload, addWidget, removeWidget, reorderWidgets, updateWidgetConfig, updateWidgetSize, moveWidget }
}
