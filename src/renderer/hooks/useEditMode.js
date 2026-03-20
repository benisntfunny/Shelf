import { useState, useCallback } from 'react'

export function useEditMode() {
  const [editMode, setEditMode] = useState(false)
  const [selectedWidgetId, setSelectedWidgetId] = useState(null)

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => {
      if (prev) setSelectedWidgetId(null)
      return !prev
    })
  }, [])

  const selectWidget = useCallback((id) => {
    setSelectedWidgetId(id)
  }, [])

  return { editMode, selectedWidgetId, toggleEditMode, selectWidget }
}
