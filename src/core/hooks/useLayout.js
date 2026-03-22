import { useState, useEffect, useCallback } from 'react'
import { GRID_COLS, GRID_ROWS } from '../constants'

const DEFAULT_LAYOUT = {
  pages: [
    {
      id: 'page-1',
      name: 'Dashboard',
      triggerApp: null,
      widgets: [
        { id: 'clock-1', widgetId: 'clock', size: '2x6', col: 1, row: 1, config: {} },
        { id: 'spacer-1', widgetId: 'spacer', size: '2x6', col: 3, row: 1, config: {} },
        { id: 'system-1', widgetId: 'system', size: '3x6', col: 5, row: 1, config: {} },
      ]
    }
  ],
  activePage: 'page-1'
}

function parseSize(size) {
  const [w, h] = (size || `4x${GRID_ROWS}`).split('x').map(Number)
  return { w: w || 4, h: h || GRID_ROWS }
}

function overlaps(col, row, w, h, widgets, excludeId) {
  for (const other of widgets) {
    if (other.id === excludeId) continue
    if (!other.col || !other.row) continue
    const os = parseSize(other.size)
    if (col < other.col + os.w && col + w > other.col && row < other.row + os.h && row + h > other.row) {
      return true
    }
  }
  return false
}

function findOpenPosition(w, h, widgets) {
  for (let r = 1; r <= GRID_ROWS - h + 1; r++) {
    for (let c = 1; c <= GRID_COLS - w + 1; c++) {
      if (!overlaps(c, r, w, h, widgets, null)) {
        return { col: c, row: r }
      }
    }
  }
  return { col: 1, row: 1 }
}

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

export function useLayout() {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [loaded, setLoaded] = useState(false)

  const save = useCallback((next) => {
    if (window.shelf) window.shelf.saveLayout(next)
  }, [])

  const loadFromMain = useCallback(() => {
    if (window.shelf) {
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000))
      return Promise.race([window.shelf.getLayout(), timeout]).then((config) => {
        const data = config || DEFAULT_LAYOUT
        if (data.pages) {
          data.pages = data.pages.map(p => ({
            ...p,
            widgets: assignPositions(p.widgets || [])
          }))
        }
        setLayout(data)
        setLoaded(true)
      }).catch(() => {
        setLayout(DEFAULT_LAYOUT)
        setLoaded(true)
      })
    } else {
      setLoaded(true)
      return Promise.resolve()
    }
  }, [])

  useEffect(() => { loadFromMain() }, [loadFromMain])

  const reload = useCallback(() => { loadFromMain() }, [loadFromMain])

  const activePage = layout.activePage || layout.pages?.[0]?.id
  const activePageData = layout.pages?.find(p => p.id === activePage) || layout.pages?.[0]
  const pages = layout.pages || []

  const setActivePage = useCallback((pageId) => {
    setLayout(prev => {
      const next = { ...prev, activePage: pageId }
      save(next)
      return next
    })
  }, [save])

  const addPage = useCallback((name) => {
    setLayout(prev => {
      const id = `page-${Date.now()}`
      const next = {
        ...prev,
        pages: [...prev.pages, { id, name, triggerApp: null, widgets: [] }],
        activePage: id
      }
      save(next)
      return next
    })
  }, [save])

  const removePage = useCallback((pageId) => {
    setLayout(prev => {
      if (prev.pages.length <= 1) return prev
      const next = {
        ...prev,
        pages: prev.pages.filter(p => p.id !== pageId),
      }
      if (next.activePage === pageId) {
        next.activePage = next.pages[0].id
      }
      save(next)
      return next
    })
  }, [save])

  const renamePage = useCallback((pageId, name) => {
    setLayout(prev => {
      const next = {
        ...prev,
        pages: prev.pages.map(p => p.id === pageId ? { ...p, name } : p)
      }
      save(next)
      return next
    })
  }, [save])

  const updatePageWidgets = useCallback((updater) => {
    setLayout(prev => {
      const next = {
        ...prev,
        pages: prev.pages.map(p => {
          if (p.id !== (prev.activePage || prev.pages[0]?.id)) return p
          return { ...p, widgets: updater(p.widgets) }
        })
      }
      save(next)
      return next
    })
  }, [save])

  const addWidget = useCallback((widgetId, size = '3x6') => {
    updatePageWidgets(widgets => {
      const id = `${widgetId}-${Date.now()}`
      const { w, h } = parseSize(size)
      const pos = findOpenPosition(w, h, widgets)
      return [...widgets, { id, widgetId, size, ...pos, config: {} }]
    })
  }, [updatePageWidgets])

  const removeWidget = useCallback((id) => {
    updatePageWidgets(widgets => widgets.filter(w => w.id !== id))
  }, [updatePageWidgets])

  const updateWidgetConfig = useCallback((id, config) => {
    updatePageWidgets(widgets =>
      widgets.map(w => w.id === id ? { ...w, config: { ...w.config, ...config } } : w)
    )
  }, [updatePageWidgets])

  const updateWidgetSize = useCallback((id, size) => {
    updatePageWidgets(widgets => {
      const { w, h } = parseSize(size)
      const widget = widgets.find(ww => ww.id === id)
      let col = widget?.col || 1, row = widget?.row || 1
      if (col + w - 1 > GRID_COLS) col = Math.max(1, GRID_COLS - w + 1)
      if (row + h - 1 > GRID_ROWS) row = Math.max(1, GRID_ROWS - h + 1)
      return widgets.map(ww => ww.id === id ? { ...ww, size, col, row } : ww)
    })
  }, [updatePageWidgets])

  const moveWidget = useCallback((id, col, row) => {
    updatePageWidgets(widgets =>
      widgets.map(w => w.id === id ? { ...w, col, row } : w)
    )
  }, [updatePageWidgets])

  const compatLayout = {
    ...layout,
    widgets: activePageData?.widgets || []
  }

  return {
    layout: compatLayout,
    loaded,
    reload,
    pages,
    activePage,
    setActivePage,
    addPage,
    removePage,
    renamePage,
    addWidget,
    removeWidget,
    updateWidgetConfig,
    updateWidgetSize,
    moveWidget,
  }
}
