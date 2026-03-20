import React, { useState } from 'react'
import { useLayout } from './hooks/useLayout'
import { useEditMode } from './hooks/useEditMode'
import { useSecrets } from './hooks/useSecrets'
import WidgetBar from './components/WidgetBar'
import EditPanel from './components/EditPanel'
import SecretsPanel from './components/SecretsPanel'
import WidgetStore from '../store/WidgetStore'
import './settings.css'

const TABS = [
  { id: 'layout', label: 'Layout' },
  { id: 'store', label: 'Widget Store' },
  { id: 'keys', label: 'Keys' },
  { id: 'about', label: 'About' },
]

export default function SettingsApp() {
  const { layout, loaded, addWidget, removeWidget, reorderWidgets, updateWidgetConfig, updateWidgetSize } = useLayout()
  const { selectedWidgetId, selectWidget } = useEditMode()
  const { secrets, loaded: secretsLoaded, updateSecret } = useSecrets()
  const [activeTab, setActiveTab] = useState('layout')

  if (!loaded || !secretsLoaded) return null

  const selectedWidget = layout.widgets.find((w) => w.id === selectedWidgetId)

  return (
    <div className="settings-app">
      <header className="settings-header">
        <h1>Shelf Settings</h1>
        <nav className="settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="settings-content">
        {activeTab === 'layout' && (
          <>
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
          </>
        )}

        {activeTab === 'store' && (
          <WidgetStore onAddWidget={(widgetId, size) => {
            addWidget(widgetId, size)
            setActiveTab('layout')
          }} />
        )}

        {activeTab === 'keys' && (
          <section className="settings-secrets">
            <SecretsPanel secrets={secrets} onUpdateSecret={updateSecret} />
          </section>
        )}

        {activeTab === 'about' && (
          <section className="settings-about">
            <div className="about-content">
              <h2>Shelf</h2>
              <p className="about-version">v0.1.0</p>
              <p className="about-desc">
                A customizable widget bar for your desktop. Add, configure, and arrange widgets
                to create your perfect information display.
              </p>
              <div className="about-links">
                <a
                  href="#"
                  className="about-link"
                  onClick={(e) => {
                    e.preventDefault()
                    window.open?.('https://github.com/benisntfunny/Shelf')
                  }}
                >
                  GitHub Repository
                </a>
                <a
                  href="#"
                  className="about-link"
                  onClick={(e) => {
                    e.preventDefault()
                    window.open?.('https://github.com/benisntfunny/Shelf/releases')
                  }}
                >
                  Check for Updates
                </a>
              </div>
              <p className="about-copy">Built with Electron + React</p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
