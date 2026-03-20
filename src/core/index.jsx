import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const params = new URLSearchParams(window.location.search)
const mode = params.get('mode') || 'bar'

async function boot() {
  let AppComponent
  if (mode === 'settings') {
    const mod = await import('./SettingsApp')
    AppComponent = mod.default
  } else {
    const mod = await import('./App')
    AppComponent = mod.default
  }

  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AppComponent />
    </React.StrictMode>
  )
}

boot()
