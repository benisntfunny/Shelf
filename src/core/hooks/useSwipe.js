import { useRef, useCallback } from 'react'

const SWIPE_THRESHOLD = 50
const RATIO_THRESHOLD = 3
const MAX_DURATION = 500  // more generous for touch

const INTERACTIVE_SELECTORS = 'button, input, select, textarea, [role="slider"], [data-no-swipe]'

function avgTouch(touches) {
  let x = 0, y = 0
  for (let i = 0; i < touches.length; i++) {
    x += touches[i].clientX
    y += touches[i].clientY
  }
  return { x: x / touches.length, y: y / touches.length }
}

export function useSwipe({ onSwipeLeft, onSwipeRight }) {
  const touchState = useRef(null)

  const onTouchStart = useCallback((e) => {
    // For single touch, check if it started on an interactive element
    if (e.touches.length === 1) {
      const target = e.target
      if (target.closest(INTERACTIVE_SELECTORS)) return
    }
    // Accept both 1-finger and 2-finger swipes
    const avg = avgTouch(e.touches)
    touchState.current = {
      startX: avg.x,
      startY: avg.y,
      startTime: Date.now(),
      fingerCount: e.touches.length,
    }
  }, [])

  const onTouchMove = useCallback((e) => {
    // Update finger count if more fingers added
    if (touchState.current && e.touches.length > touchState.current.fingerCount) {
      touchState.current.fingerCount = e.touches.length
    }
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (!touchState.current) return
    // Wait until all fingers are lifted
    if (e.touches.length > 0) return

    const avg = avgTouch(e.changedTouches)
    const { startX, startY, startTime } = touchState.current
    touchState.current = null

    const dx = avg.x - startX
    const dy = avg.y - startY
    const dt = Date.now() - startTime

    if (dt > MAX_DURATION) return
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    if (Math.abs(dy) > 0 && Math.abs(dx) / Math.abs(dy) < RATIO_THRESHOLD) return

    if (dx < 0) { onSwipeLeft?.() } else { onSwipeRight?.() }
  }, [onSwipeLeft, onSwipeRight])

  return { onTouchStart, onTouchMove, onTouchEnd }
}
