import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useLayout } from './hooks/useLayout'
import { useSwipe } from './hooks/useSwipe'
import WidgetBar from './components/WidgetBar'

export default function App() {
  const { layout, loaded, reload, pages, activePage, setActivePage } = useLayout()
  const [transitioning, setTransitioning] = useState(null)
  const barRef = useRef(null)

  useEffect(() => {
    if (window.shelf?.onLayoutChanged) {
      return window.shelf.onLayoutChanged(() => reload())
    }
  }, [reload])

  const switchPage = useCallback((pageId) => {
    setTransitioning('exit')
    setTimeout(() => {
      setActivePage(pageId)
      setTransitioning('enter')
      setTimeout(() => setTransitioning(null), 200)
    }, 200)
  }, [setActivePage])

  const goNext = useCallback(() => {
    const idx = pages.findIndex(p => p.id === activePage)
    if (idx < pages.length - 1) switchPage(pages[idx + 1].id)
  }, [pages, activePage, switchPage])

  const goPrev = useCallback(() => {
    const idx = pages.findIndex(p => p.id === activePage)
    if (idx > 0) switchPage(pages[idx - 1].id)
  }, [pages, activePage, switchPage])

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  })

  if (!loaded) return null

  const barClass = transitioning === 'exit' ? 'page-exit' :
                   transitioning === 'enter' ? 'page-enter' : ''

  return (
    <div className="app" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <WidgetBar widgets={layout.widgets} className={barClass} />
      {pages.length > 1 && (
        <div className="page-indicator" style={{
          '--dot-size': (layout.indicatorSize || 6) + 'px',
          '--dot-color': layout.indicatorColor || 'rgba(255,255,255,0.2)',
          '--dot-active': layout.indicatorActiveColor || '#c9a84c',
        }}>
          {pages.map(p => (
            <div
              key={p.id}
              className={`page-dot${p.id === activePage ? ' active' : ''}`}
              onClick={() => switchPage(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
