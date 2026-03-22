import { useState, useEffect } from 'react'
import { getAllWidgets } from '../widgets/_runtime/loader'
import './store.css'

const REGISTRY_URL = 'https://raw.githubusercontent.com/benisntfunny/Shelf/main/registry/registry.json'

export default function WidgetStore({ onAddWidget }) {
  const [registry, setRegistry] = useState(null)
  const [search, setSearch] = useState('')
  const installedIds = new Set(getAllWidgets().map((w) => w.id))

  useEffect(() => {
    async function fetchRegistry() {
      try {
        if (window.shelf?.fetchUrl) {
          const res = await window.shelf.fetchUrl(REGISTRY_URL)
          if (res.body) {
            setRegistry(JSON.parse(res.body))
            return
          }
        }
      } catch (_) {
        // fall through to local
      }
      // Fallback to bundled registry
      try {
        const res = await fetch('./registry/registry.json')
        setRegistry(await res.json())
      } catch (_) {
        setRegistry({ version: '1', widgets: [] })
      }
    }
    fetchRegistry()
  }, [])

  if (!registry) {
    return <div className="widget-store"><p className="store-loading">Loading widget store...</p></div>
  }

  const filtered = registry.widgets.filter((w) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      (w.tags || []).some((t) => t.toLowerCase().includes(q))
    )
  })

  return (
    <div className="widget-store">
      <div className="store-header">
        <input
          type="text"
          className="store-search"
          placeholder="Search widgets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="store-grid">
        {filtered.map((w) => {
          const installed = installedIds.has(w.id)
          return (
            <div key={w.id} className="store-card">
              <div className="store-card-header">
                <span className="store-card-name">{w.name}</span>
                <span className="store-card-version">v{w.version}</span>
              </div>
              <p className="store-card-desc">{w.description}</p>
              <div className="store-card-meta">
                <span className="store-card-author">by {w.author}</span>
                <span className="store-card-sizes">{w.sizes.join(', ')}</span>
              </div>
              {w.tags && (
                <div className="store-card-tags">
                  {w.tags.map((t) => (
                    <span key={t} className="store-tag">{t}</span>
                  ))}
                </div>
              )}
              <div className="store-card-actions">
                {w.builtin && installed ? (
                  <button
                    className="store-btn store-btn-add"
                    onClick={() => onAddWidget(w.id, w.sizes[Math.floor(w.sizes.length / 2)] || '3x3')}
                  >
                    Add to Bar
                  </button>
                ) : w.builtin ? (
                  <button
                    className="store-btn store-btn-add"
                    onClick={() => onAddWidget(w.id, w.sizes[Math.floor(w.sizes.length / 2)] || '3x3')}
                  >
                    Add to Bar
                  </button>
                ) : installed ? (
                  <button className="store-btn store-btn-remove">Remove</button>
                ) : (
                  <button className="store-btn store-btn-install" disabled>Install</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="store-footer">
        <a
          className="store-submit-link"
          onClick={() => window.shelf?.fetchUrl && window.open?.('https://github.com/benisntfunny/Shelf')}
          href="#"
        >
          Submit a Widget →
        </a>
      </div>
    </div>
  )
}
