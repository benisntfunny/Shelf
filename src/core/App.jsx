import React, { useEffect } from 'react'
import { useLayout } from './hooks/useLayout'
import WidgetBar from './components/WidgetBar'

export default function App() {
  const { layout, loaded, reload } = useLayout()

  useEffect(() => {
    if (window.shelf?.onLayoutChanged) {
      return window.shelf.onLayoutChanged(() => reload())
    }
  }, [reload])

  if (!loaded) return null

  return (
    <div className="app">
      <WidgetBar widgets={layout.widgets} editMode={false} />
    </div>
  )
}
