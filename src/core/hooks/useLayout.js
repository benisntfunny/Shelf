import { useState, useEffect, useCallback, useRef } from 'react'
import { GRID_COLS, GRID_ROWS } from '../constants'

const DEFAULT_LAYOUT = {
  pages: [
    {
      id: 'page-1',
      name: 'Dashboard',
      triggerApp: null,
      widgets: [
        { id: 'clock-1', widgetId: 'clock', size: '2x6', col: 1, row: 1, config: {} },
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
  return null // no space found
}

function assignPositions(widgets) {
  const result = []
  for (const w of widgets) {
    if (w.col && w.row) {
      result.push(w)
    } else {
      const { w: sw, h: sh } = parseSize(w.size)
      const pos = findOpenPosition(sw, sh, result)
      result.push({ ...w, ...(pos || { col: 1, row: 1 }) })
    }
  }
  return result
}

// Calculate total used columns in a row range
function usedColumns(widgets) {
  let total = 0
  for (const w of widgets) {
    const { w: ww } = parseSize(w.size)
    total += ww
  }
  return total
}

// Try to make space for a new widget by shrinking existing widgets
function makeSpace(widgets, needW, needH) {
  // First check if there's already space
  const pos = findOpenPosition(needW, needH, widgets)
  if (pos) return { widgets, pos }

  // Strategy: shrink widest widgets first to free up columns
  let adjusted = widgets.map(w => ({ ...w }))

  // Try shrinking widgets horizontally, widest first
  for (let attempt = 0; attempt < 10; attempt++) {
    // Sort by width descending to shrink the biggest first
    const byWidth = [...adjusted]
      .map((w, i) => ({ ...w, idx: i, pw: parseSize(w.size).w, ph: parseSize(w.size).h }))
      .filter(w => w.pw > 1)
      .sort((a, b) => b.pw - a.pw)

    if (byWidth.length === 0) break

    // Shrink the widest widget by 1 column
    const target = byWidth[0]
    const newW = target.pw - 1
    adjusted[target.idx] = { ...adjusted[target.idx], size: `${newW}x${target.ph}` }

    // Reflow positions after shrinking
    adjusted = reflowWidgets(adjusted)

    // Check if we have space now
    const newPos = findOpenPosition(needW, needH, adjusted)
    if (newPos) return { widgets: adjusted, pos: newPos }
  }

  // If horizontal shrinking didn't work, try shrinking vertically too
  adjusted = widgets.map(w => ({ ...w }))
  for (let attempt = 0; attempt < 10; attempt++) {
    const bySize = [...adjusted]
      .map((w, i) => ({ ...w, idx: i, pw: parseSize(w.size).w, ph: parseSize(w.size).h }))
      .filter(w => w.pw > 1 || w.ph > 1)
      .sort((a, b) => (b.pw * b.ph) - (a.pw * a.ph))

    if (bySize.length === 0) break

    const target = bySize[0]
    const newW = target.pw > target.ph ? target.pw - 1 : target.pw
    const newH = target.pw <= target.ph && target.ph > 1 ? target.ph - 1 : target.ph
    if (newW === target.pw && newH === target.ph) {
      // Can't shrink further, try next
      const next = bySize[1]
      if (!next) break
      const nw2 = next.pw > 1 ? next.pw - 1 : next.pw
      const nh2 = next.ph > 1 && nw2 === next.pw ? next.ph - 1 : next.ph
      adjusted[next.idx] = { ...adjusted[next.idx], size: `${nw2}x${nh2}` }
    } else {
      adjusted[target.idx] = { ...adjusted[target.idx], size: `${newW}x${newH}` }
    }

    adjusted = reflowWidgets(adjusted)
    const newPos = findOpenPosition(needW, needH, adjusted)
    if (newPos) return { widgets: adjusted, pos: newPos }
  }

  // Last resort: just place at 1,1 overlapping
  return { widgets: adjusted, pos: { col: 1, row: 1 } }
}

// Reflow widget positions left-to-right, top-to-bottom
function reflowWidgets(widgets) {
  const placed = []
  // Sort by original position to maintain relative order
  const sorted = [...widgets].sort((a, b) => {
    const ar = a.row || 1, br = b.row || 1
    const ac = a.col || 1, bc = b.col || 1
    return ar !== br ? ar - br : ac - bc
  })

  for (const w of sorted) {
    const { w: ww, h: wh } = parseSize(w.size)
    const pos = findOpenPosition(ww, wh, placed)
    placed.push({ ...w, ...(pos || { col: w.col || 1, row: w.row || 1 }) })
  }
  return placed
}

const MAX_UNDO = 20

export function useLayout() {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [loaded, setLoaded] = useState(false)
  const undoStack = useRef([])

  const save = useCallback((next) => {
    if (window.shelf) window.shelf.saveLayout(next)
  }, [])

  // Push current state onto undo stack before making changes
  const pushUndo = useCallback((currentLayout) => {
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), JSON.parse(JSON.stringify(currentLayout))]
  }, [])

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return
    const prev = undoStack.current.pop()
    setLayout(prev)
    save(prev)
  }, [save])

  // Listen for Ctrl+Z / Cmd+Z
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo])

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
      pushUndo(prev)
      const id = `page-${Date.now()}`
      const next = {
        ...prev,
        pages: [...prev.pages, { id, name, triggerApp: null, widgets: [] }],
        activePage: id
      }
      save(next)
      return next
    })
  }, [save, pushUndo])

  const removePage = useCallback((pageId) => {
    setLayout(prev => {
      if (prev.pages.length <= 1) return prev
      pushUndo(prev)
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
  }, [save, pushUndo])

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

  const updatePageWidgets = useCallback((updater, recordUndo = false) => {
    setLayout(prev => {
      if (recordUndo) pushUndo(prev)
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
  }, [save, pushUndo])

  const addWidget = useCallback((widgetId, size = '3x6') => {
    updatePageWidgets(widgets => {
      const id = `${widgetId}-${Date.now()}`
      const { w, h } = parseSize(size)

      // Try to make space by shrinking existing widgets
      const { widgets: adjusted, pos } = makeSpace(widgets, w, h)
      return [...adjusted, { id, widgetId, size, ...pos, config: {} }]
    }, true) // record undo
  }, [updatePageWidgets])

  const removeWidget = useCallback((id) => {
    updatePageWidgets(widgets => widgets.filter(w => w.id !== id), true)
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

  const updateLayoutSetting = useCallback((key, value) => {
    setLayout(prev => {
      const next = { ...prev, [key]: value }
      save(next)
      return next
    })
  }, [save])

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
    updateLayoutSetting,
    moveWidget,
    undo,
  }
}
