import React from 'react'
import { useLayout } from './hooks/useLayout'
import { useEditMode } from './hooks/useEditMode'
import { useSecrets } from './hooks/useSecrets'
import WidgetBar from './components/WidgetBar'
import EditPanel from './components/EditPanel'
import SecretsPanel from './components/SecretsPanel'
import './settings.css'

export default function SettingsApp() {
  const { layout, loaded, addWidget, removeWidget, reorderWidgets, updateWidgetConfig, updateWidgetSize } = useLayout()
  const { selectedWidgetId, selectWidget } = useEditMode()
  const { secrets, loaded: secretsLoaded, updateSecret } = useSecrets()

  if (!loaded || !secretsLoaded) return null

  const selectedWidget = layout.widgets.find((w) => w.id === selectedWidgetId)

  return (
    <div className="settings-app">
      <header className="settings-header">
        <h1>Shelf Settings</h1>
      </header>

      <section className="settings-preview">
        <h2>Bar Preview</h2>
        <div className="preview-container">
          <WidgetBar
            widgets={layout.widgets}
            editMode={true}
            selectedWidgetId={selectedWidgetId}
            onSelect={selectWidget}
            onRemove={removeWidget}
            onReorder={reorderWidgets}
          />
        </div>
      </section>

      <section className="settings-editor">
        <EditPanel
          open={true}
          onAddWidget={addWidget}
          selectedWidget={selectedWidget}
          onConfigChange={(config) => selectedWidget && updateWidgetConfig(selectedWidget.id, config)}
          onSizeChange={(size) => selectedWidget && updateWidgetSize(selectedWidget.id, size)}
        />
      </section>

      <section className="settings-secrets">
        <SecretsPanel secrets={secrets} onUpdateSecret={updateSecret} />
      </section>
    </div>
  )
}
