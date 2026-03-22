import { useState, useEffect, useRef } from 'react'

function useContainerSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref])
  return size
}

export default function PageSwitcher() {
  const ref = useRef(null)
  const container = useContainerSize(ref)
  const [pages, setPages] = useState([])
  const [activePage, setActivePage] = useState('')

  useEffect(() => {
    function loadPages() {
      if (!window.shelf?.getPages) return
      window.shelf.getPages().then(({ pages: p, activePage: ap }) => {
        setPages(p || [])
        setActivePage(ap || '')
      })
    }
    loadPages()
    if (window.shelf?.onLayoutChanged) {
      return window.shelf.onLayoutChanged(loadPages)
    }
  }, [])

  const currentIdx = pages.findIndex(p => p.id === activePage)
  const currentName = pages[currentIdx]?.name || ''
  const canPrev = currentIdx > 0
  const canNext = currentIdx < pages.length - 1

  function goTo(pageId) {
    if (window.shelf?.setActivePage) {
      window.shelf.setActivePage(pageId)
      setActivePage(pageId)
    }
  }

  const isWide = container.w > container.h * 1.5
  const arrowSize = Math.max(16, Math.min(container.h * 0.4, container.w * 0.3))
  const labelSize = Math.max(8, arrowSize * 0.3)

  const arrowStyle = (enabled) => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: enabled ? '#e0e0e0' : 'rgba(255,255,255,0.15)',
    fontSize: `${arrowSize}px`,
    cursor: enabled ? 'pointer' : 'default',
    padding: 0,
    touchAction: 'manipulation',
    transition: 'color 0.2s',
  })

  if (pages.length <= 1) {
    return (
      <div ref={ref} style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'#6a6a6a',fontSize:'12px'}}>1 page</span>
      </div>
    )
  }

  return (
    <div ref={ref} style={{
      height:'100%',width:'100%',
      display:'flex',
      flexDirection: isWide ? 'row' : 'column',
      alignItems:'center',
      justifyContent:'center',
      gap: '2px',
    }}>
      <button
        style={arrowStyle(canPrev)}
        onClick={() => canPrev && goTo(pages[currentIdx - 1].id)}
        data-no-swipe
      >
        {isWide ? '\u25C0' : '\u25B2'}
      </button>
      <div style={{
        fontSize: `${labelSize}px`,
        color: '#6a6a6a',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: isWide ? '40%' : '90%',
        letterSpacing: '0.03em',
      }}>
        {currentName}
      </div>
      <button
        style={arrowStyle(canNext)}
        onClick={() => canNext && goTo(pages[currentIdx + 1].id)}
        data-no-swipe
      >
        {isWide ? '\u25B6' : '\u25BC'}
      </button>
    </div>
  )
}
