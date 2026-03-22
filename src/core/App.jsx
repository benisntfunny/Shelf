import React, { useEffect } from 'react'
import { useLayout } from './hooks/useLayout'
import WidgetBar from './components/WidgetBar'

export default function App() {
  const { layout, loaded, reload, pages, activePage, setActivePage } = useLayout()

  useEffect(() => {
    if (window.shelf?.onLayoutChanged) {
      return window.shelf.onLayoutChanged(() => reload())
    }
  }, [reload])

  if (!loaded) return null

  return (
    <div className="app">
      <WidgetBar widgets={layout.widgets} />
      {pages.length > 1 && (
        <div className="page-indicator">
          {pages.map(p => (
            <div
              key={p.id}
              className={`page-dot${p.id === activePage ? ' active' : ''}`}
              onClick={() => setActivePage(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
