import { useState, useEffect } from 'react'

export default function Calendar() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    function fetch() {
      if (window.shelf) {
        window.shelf.getCalendarEvents().then(setEvents)
      }
    }
    fetch()
    const id = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  if (events.length === 0) {
    return (
      <div className="widget-content">
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>No events today</span>
      </div>
    )
  }

  return (
    <div className="calendar-events">
      {events.slice(0, 4).map((evt, i) => (
        <div key={i} className="calendar-event">
          <span className="calendar-time">{evt.time}</span>
          <span className="calendar-title">{evt.title}</span>
        </div>
      ))}
    </div>
  )
}
