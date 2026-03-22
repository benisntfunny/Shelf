import { useRef, useCallback } from 'react'

const SWIPE_THRESHOLD = 50
const RATIO_THRESHOLD = 3
const MAX_DURATION = 300

const INTERACTIVE_SELECTORS = 'button, input, select, textarea, [role="slider"], [data-no-swipe]'

export function useSwipe({ onSwipeLeft, onSwipeRight }) {
  const touchState = useRef(null)

  const onTouchStart = useCallback((e) => {
    const target = e.target
    if (target.closest(INTERACTIVE_SELECTORS)) return
    const touch = e.touches[0]
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    }
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (!touchState.current) return
    const touch = e.changedTouches[0]
    const { startX, startY, startTime } = touchState.current
    touchState.current = null
    const dx = touch.clientX - startX
    const dy = touch.clientY - startY
    const dt = Date.now() - startTime
    if (dt > MAX_DURATION) return
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    if (Math.abs(dy) > 0 && Math.abs(dx) / Math.abs(dy) < RATIO_THRESHOLD) return
    if (dx < 0) { onSwipeLeft?.() } else { onSwipeRight?.() }
  }, [onSwipeLeft, onSwipeRight])

  return { onTouchStart, onTouchEnd }
}
