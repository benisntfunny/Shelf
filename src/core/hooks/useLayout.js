import { useState, useEffect, useCallback } from 'react'

const DEFAULT_LAYOUT = {
  widgets: [
    { id: 'clock-1', widgetId: 'clock', size: 'sm', config: {} },
    { id: 'spacer-1', widgetId: 'spacer', size: 'sm', config: {} },
    { id: 'system-1', widgetId: 'system', size: 'md', config: {} },
  ],
}

function migrateLayout(config) {
  if (!config?.widgets) return config
  return {
    ...config,
    widgets: config.widgets.map((w) => {
      if (w.size === 'fill') return { ...w, size: 'sm' }
      return w
    }),
  }
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

  const addWidget = useCallback((widgetId, size = 'md') => {
    setLayout((prev) => {
      const id = `${widgetId}-${Date.now()}`
      const next = { ...prev, widgets: [...prev.widgets, { id, widgetId, size, config: {} }] }
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
      const next = {
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === id ? { ...w, size } : w)),
      }
      if (window.shelf) window.shelf.saveLayout(next)
      return next
    })
  }, [])

  return { layout, loaded, reload, addWidget, removeWidget, reorderWidgets, updateWidgetConfig, updateWidgetSize }
}
