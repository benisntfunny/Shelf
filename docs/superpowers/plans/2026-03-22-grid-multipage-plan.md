# Grid Expansion + Multi-Page System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the grid from 12x3 to 12x6, add multi-page support with swipe navigation, and create a page-switcher widget.

**Architecture:** The grid constant changes from 3→6 rows across all grid math, CSS, collision detection, and widget sizes. Config migrates from `{ widgets: [...] }` to `{ pages: [...], activePage }`. A `useSwipe` hook detects horizontal touch gestures on the bar. A small page indicator renders in the bar chrome. A page-switcher widget provides manual navigation.

**Tech Stack:** Electron, React, CSS Grid, Touch Events API

**Spec:** `docs/superpowers/specs/2026-03-22-shelf-expansion-design.md` (sections 1 + grid change)

---

## Chunk 1: Grid Expansion (12x3 → 12x6)

### Task 1: Define grid constant and update config-store migration

**Files:**
- Create: `src/core/constants.js`
- Modify: `src/main/config-store.js`

- [ ] **Step 1: Create constants file**

Create `src/core/constants.js`:
```js
export const GRID_COLS = 12
export const GRID_ROWS = 6
```

- [ ] **Step 2: Add migration logic to config-store.js**

Modify `src/main/config-store.js` to add a `migrateConfig` function that runs on load. This handles:
1. Old string sizes (`sm`, `md`, etc.) → `Wx6` format
2. Old `Wx3` sizes where the widget was full-height → `Wx6` (double the row count)
3. Old flat `{ widgets: [...] }` → page-wrapped (done in Task 8)

For now, just the size migration:

```js
const CURRENT_VERSION = 2

const SIZE_MIGRATION = {
  xs: '1x6', sm: '2x6', md: '3x6', lg: '4x6', xl: '6x6', full: '12x6', fill: '2x6'
}

function migrateWidgetSizes(widgets) {
  return widgets.map(w => {
    // String size migration
    if (SIZE_MIGRATION[w.size]) {
      return { ...w, size: SIZE_MIGRATION[w.size] }
    }
    // Wx3 → Wx6 (double row count for old full-height widgets)
    const match = (w.size || '').match(/^(\d+)x3$/)
    if (match) {
      return { ...w, size: `${match[1]}x6` }
    }
    return w
  })
}

function migrateConfig(config) {
  if (!config) return null
  // Skip if already migrated to current version
  if (config._version >= CURRENT_VERSION) return config

  let result = config

  // Size migration (only on first migration, not on every load)
  if (result.widgets) {
    result = { ...result, widgets: migrateWidgetSizes(result.widgets) }
  }

  // Page migration handled in Task 8 — adds pages wrapping
  // ...

  result._version = CURRENT_VERSION
  return result
}
```

Update `loadConfig()` to call `migrateConfig` before returning. If migration changed the config, save it immediately so migration only runs once:

```js
function loadConfig() {
  ensureDir()
  if (!fs.existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULT_CONFIG)
    return DEFAULT_CONFIG
  }
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    const migrated = migrateConfig(raw)
    if (migrated._version !== raw._version) {
      saveConfig(migrated) // persist migration so it doesn't re-run
    }
    return migrated
  } catch {
    return DEFAULT_CONFIG
  }
}
```

- [ ] **Step 3: Update DEFAULT_CONFIG**

Change the default config to use new sizes:
```js
const DEFAULT_CONFIG = {
  widgets: [
    { id: 'clock-1', widgetId: 'clock', size: '2x6', config: {} },
    { id: 'spacer-1', widgetId: 'spacer', size: '2x6', config: {} },
    { id: 'system-1', widgetId: 'system', size: '3x6', config: {} },
  ],
}
```

- [ ] **Step 4: Set file permissions on save**

Update `saveConfig` and `saveSecrets` to set mode 0600:
```js
function saveConfig(config) {
  ensureDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 })
}

function saveSecrets(secrets) {
  ensureDir()
  fs.writeFileSync(SECRETS_PATH, JSON.stringify(secrets, null, 2), { mode: 0o600 })
}
```

- [ ] **Step 5: Build and verify no crash**

Run: `cd /Users/ben/Developer/shelf && npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/core/constants.js src/main/config-store.js
git commit -m "feat: add grid constants and config migration for 12x6 grid"
```

---

### Task 2: Update CSS grid definitions

**Files:**
- Modify: `src/core/styles.css:68-77`
- Modify: `src/core/settings.css:68-79`

- [ ] **Step 1: Update bar grid CSS**

In `src/core/styles.css`, change line 72:
```css
/* ── Widget Bar: 12x6 grid ── */
.widget-bar {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(6, 1fr);
  height: 100%;
  padding: 6px 8px;
  gap: 6px;
  overflow: hidden;
}
```

- [ ] **Step 2: Update settings preview grid CSS**

In `src/core/settings.css`, change lines 68-79:
```css
.preview-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(6, 1fr);
  grid-auto-flow: dense;
  gap: 4px;
  background: var(--bg);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 4px;
  height: 200px;
}
```

Note: height increased from 160px to 200px to accommodate 6 rows.

- [ ] **Step 3: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/core/styles.css src/core/settings.css
git commit -m "feat: update CSS grids from 3 rows to 6 rows"
```

---

### Task 3: Update grid math in WidgetCard and SettingsApp

**Files:**
- Modify: `src/core/components/WidgetCard.jsx:4-11`
- Modify: `src/core/SettingsApp.jsx:18-118`

- [ ] **Step 1: Update WidgetCard parseSize**

In `src/core/components/WidgetCard.jsx`, change the parseSize function:
```js
import { GRID_COLS, GRID_ROWS } from '../constants'

function parseSize(size) {
  const [w, h] = (size || '').split('x').map(Number)
  if (!w || !h || w < 1 || w > GRID_COLS || h < 1 || h > GRID_ROWS) {
    console.warn(`[Shelf] Invalid widget size "${size}", falling back to 4x6`)
    return { w: 4, h: GRID_ROWS }
  }
  return { w, h }
}
```

Note: The import path uses `../../core/constants` because WidgetCard is in `src/core/components/`.

- [ ] **Step 2: Update SettingsApp grid math**

In `src/core/SettingsApp.jsx`, add the import at the top:
```js
import { GRID_COLS, GRID_ROWS } from './constants'
```

Then update all hardcoded `3` references to use `GRID_ROWS`:

`parseSize` (line 18-21):
```js
function parseSize(size) {
  const [w, h] = (size || '').split('x').map(Number)
  return { w: w || 4, h: h || GRID_ROWS }
}
```

`canPlace` (line 27-35):
```js
function canPlace(col, row, w, h, widgets, excludeId) {
  if (col < 1 || row < 1 || col + w - 1 > GRID_COLS || row + h - 1 > GRID_ROWS) return false
  for (const other of widgets) {
    if (other.id === excludeId) continue
    const os = parseSize(other.size)
    if (cellsOverlap(col, row, w, h, other.col || 1, other.row || 1, os.w, os.h)) return false
  }
  return true
}
```

`getGridPos` (lines 44-49):
```js
const cellH = (rect.height - pad * 2 - gap * (GRID_ROWS - 1)) / GRID_ROWS
// ...
const row = Math.max(1, Math.min(GRID_ROWS, Math.round((clientY - rect.top - pad) / (cellH + gap)) + 1))
```

`handleDragStart` clamp lines (60-61, 69-70):
```js
const clampedRow = Math.min(row, GRID_ROWS - h + 1)
```

`handleResizeStart` (lines 95, 101, 105):
```js
const cellH = (rect.height - pad * 2 - gap * (GRID_ROWS - 1)) / GRID_ROWS
// ...
if (edge === 'bottom' || edge === 'corner') newH = Math.max(1, Math.min(GRID_ROWS, h + Math.round(dy / cellH)))
// ...
if (row + newH - 1 > GRID_ROWS) newH = GRID_ROWS - row + 1
```

- [ ] **Step 3: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/core/components/WidgetCard.jsx src/core/SettingsApp.jsx
git commit -m "feat: update grid math to use GRID_ROWS constant"
```

---

### Task 4: Update useLayout.js grid math and remove client-side migration

**Files:**
- Modify: `src/core/hooks/useLayout.js`

- [ ] **Step 1: Update useLayout.js**

Add import:
```js
import { GRID_COLS, GRID_ROWS } from '../constants'
```

Remove the `SIZE_MIGRATION` map and `migrateLayout` function entirely (migration now lives in config-store.js).

Update `parseSize`:
```js
function parseSize(size) {
  const [w, h] = (size || `4x${GRID_ROWS}`).split('x').map(Number)
  return { w: w || 4, h: h || GRID_ROWS }
}
```

Update `findOpenPosition`:
```js
function findOpenPosition(w, h, widgets) {
  for (let r = 1; r <= GRID_ROWS - h + 1; r++) {
    for (let c = 1; c <= GRID_COLS - w + 1; c++) {
      if (!overlaps(c, r, w, h, widgets, null)) {
        return { col: c, row: r }
      }
    }
  }
  return { col: 1, row: 1 }
}
```

Update `updateWidgetSize`:
```js
if (col + w - 1 > GRID_COLS) col = Math.max(1, GRID_COLS - w + 1)
if (row + h - 1 > GRID_ROWS) row = Math.max(1, GRID_ROWS - h + 1)
```

Update `loadFromMain` — remove `migrateLayout` call, just use config directly:
```js
return Promise.race([window.shelf.getLayout(), timeout]).then((config) => {
  setLayout(config || DEFAULT_LAYOUT)
  setLoaded(true)
})
```

Update `DEFAULT_LAYOUT` to use `x6` sizes:
```js
const DEFAULT_LAYOUT = {
  widgets: [
    { id: 'clock-1', widgetId: 'clock', size: '2x6', col: 1, row: 1, config: {} },
    { id: 'spacer-1', widgetId: 'spacer', size: '2x6', col: 3, row: 1, config: {} },
    { id: 'system-1', widgetId: 'system', size: '3x6', col: 5, row: 1, config: {} },
  ],
}
```

- [ ] **Step 2: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/core/hooks/useLayout.js
git commit -m "feat: update useLayout grid math, remove client-side migration"
```

---

### Task 5: Update all widget meta.js sizes

**Files:**
- Modify: All 10 widget `meta.js` files

- [ ] **Step 1: Update each widget meta.js**

The pattern: `x3` full-height sizes become `x6`. Keep sub-height sizes as-is (e.g., `1x1`, `2x2` stay). Add new intermediate sizes where useful.

`src/widgets/clock/meta.js`:
```js
export default { id: 'clock', name: 'Clock', description: 'Time and date display', icon: '\u{1F552}', defaultSize: '2x6', sizes: ['1x2', '1x3', '1x6', '2x3', '2x6', '3x6', '4x6', '6x6', '8x6'] }
```

`src/widgets/weather/meta.js`:
```js
export default { id: 'weather', name: 'Weather', description: 'Current weather conditions', icon: '\u{1F324}', defaultSize: '4x6', sizes: ['2x3', '2x6', '4x3', '4x6', '12x2'] }
```

`src/widgets/now-playing/meta.js`:
```js
export default { id: 'now-playing', name: 'Now Playing', description: 'Apple Music now playing', icon: '\u{1F3B5}', defaultSize: '4x6', sizes: ['4x6', '6x6', '12x6'] }
```

`src/widgets/stocks/meta.js`:
```js
export default { id: 'stocks', name: 'Stocks', description: 'Stock ticker widget', icon: '\u{1F4C8}', defaultSize: '4x6', sizes: ['1x2', '2x2', '3x2', '4x2', '6x2', '12x2', '4x3', '4x6', '6x3', '6x6'] }
```

`src/widgets/system/meta.js`:
```js
export default { id: 'system', name: 'System', description: 'CPU, memory, and network usage', icon: '\u{1F4BB}', defaultSize: '3x6', sizes: ['2x6', '3x6'] }
```

`src/widgets/display/meta.js`:
```js
export default { id: 'display', name: 'Display', description: 'Xeneon display controls', icon: '\u{1F4BB}', defaultSize: '3x6', sizes: ['2x6', '3x6', '4x6'] }
```

`src/widgets/calendar/meta.js`:
```js
export default { id: 'calendar', name: 'Calendar', description: 'Upcoming calendar events', icon: '\u{1F4C5}', defaultSize: '3x6', sizes: ['2x6', '3x6', '4x6'] }
```

`src/widgets/spacer/meta.js`:
```js
export default { id: 'spacer', name: 'Spacer', description: 'Empty space', icon: '\u{2B1C}', defaultSize: '2x6', sizes: ['1x1', '1x2', '1x3', '1x6', '2x1', '2x2', '2x3', '2x6'] }
```

`src/widgets/volume/meta.js`:
```js
export default { id: 'volume', name: 'Volume', description: 'System volume control', icon: '\u{1F50A}', defaultSize: '2x6', sizes: ['1x2', '2x2', '3x2', '2x3', '2x6'] }
```

`src/widgets/felix-status/meta.js`:
```js
export default { id: 'felix-status', name: 'Felix Status', description: 'Felix server status', icon: '\u{1F431}', defaultSize: '2x6', sizes: ['1x6', '2x6'] }
```

Note: Read each file first to verify the current content before editing. The exact icon unicode values above are approximations — preserve whatever icon is already in each file.

- [ ] **Step 2: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/widgets/*/meta.js
git commit -m "feat: update all widget sizes for 12x6 grid"
```

---

### Task 6: Update ConfigPanel default sizes fallback

**Files:**
- Modify: `src/core/components/ConfigPanel.jsx:18`

- [ ] **Step 1: Update default sizes**

In `ConfigPanel.jsx`, change the fallback sizes:
```js
const validSizes = meta?.sizes || ['2x6', '3x6', '4x6']
```

- [ ] **Step 2: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/core/components/ConfigPanel.jsx
git commit -m "feat: update ConfigPanel default sizes for 6-row grid"
```

---

### Task 7: Visual test of grid expansion

- [ ] **Step 1: Kill existing Electron and relaunch**

```bash
pkill -f "Electron.app" 2>/dev/null
sleep 1
cd /Users/ben/Developer/shelf && open node_modules/electron/dist/Electron.app --args $(pwd)
```

- [ ] **Step 2: Verify visually**

Check:
- Bar renders with 6-row grid (widgets should be full height)
- Settings panel shows 6-row preview grid
- Widgets can be resized to partial heights (e.g., 2x3 = half height)
- Drag and drop still works in settings
- Existing config migrated correctly (old sizes → x6)

- [ ] **Step 3: Commit any fixes**

If visual issues found, fix and commit.

---

## Chunk 2: Multi-Page System

### Task 8: Extend config-store for multi-page config

**Files:**
- Modify: `src/main/config-store.js`

- [ ] **Step 1: Add page migration to migrateConfig**

Extend the `migrateConfig` function in `config-store.js` to handle the flat-to-paged migration:

Replace the `migrateConfig` function from Task 1 with this complete version:

```js
function migrateConfig(config) {
  if (!config) return null
  if (config._version >= CURRENT_VERSION) return config

  let result = { ...config }

  // Step 1: Size migration within widgets (flat or paged)
  if (result.pages) {
    result.pages = result.pages.map(page => ({
      ...page,
      widgets: migrateWidgetSizes(page.widgets || [])
    }))
  } else if (result.widgets) {
    // Step 2: Flat → paged migration (preserves other top-level config fields)
    const { widgets, ...rest } = result
    result = {
      ...rest,
      pages: [
        { id: 'page-1', name: 'Dashboard', triggerApp: null, widgets: migrateWidgetSizes(widgets) }
      ],
      activePage: 'page-1'
    }
  }

  result._version = CURRENT_VERSION
  return result
}
```

Note: `triggerApp: null` is included in the page data model now (per spec) to avoid a future migration when app-triggered pages are implemented.

Update `DEFAULT_CONFIG`:
```js
const DEFAULT_CONFIG = {
  _version: CURRENT_VERSION,
  pages: [
    {
      id: 'page-1',
      name: 'Dashboard',
      triggerApp: null,
      widgets: [
        { id: 'clock-1', widgetId: 'clock', size: '2x6', col: 1, row: 1, config: {} },
        { id: 'spacer-1', widgetId: 'spacer', size: '2x6', col: 3, row: 1, config: {} },
        { id: 'system-1', widgetId: 'system', size: '3x6', col: 5, row: 1, config: {} },
      ]
    }
  ],
  activePage: 'page-1'
}
```

- [ ] **Step 2: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/main/config-store.js
git commit -m "feat: add multi-page config migration"
```

---

### Task 9: Update useLayout hook for multi-page support

**Files:**
- Modify: `src/core/hooks/useLayout.js`

- [ ] **Step 1: Rewrite useLayout for page-aware state**

The hook needs to manage an array of pages and track the active page. All widget CRUD operations (add, remove, move, resize, config) operate on the active page's widget array.

New exports to add: `pages`, `activePage`, `setActivePage`, `addPage`, `removePage`, `renamePage`.

```js
import { useState, useEffect, useCallback } from 'react'
import { GRID_COLS, GRID_ROWS } from '../constants'

const DEFAULT_LAYOUT = {
  pages: [
    {
      id: 'page-1',
      name: 'Dashboard',
      triggerApp: null,
      widgets: [
        { id: 'clock-1', widgetId: 'clock', size: '2x6', col: 1, row: 1, config: {} },
        { id: 'spacer-1', widgetId: 'spacer', size: '2x6', col: 3, row: 1, config: {} },
        { id: 'system-1', widgetId: 'system', size: '3x6', col: 5, row: 1, config: {} },
      ]
    }
  ],
  activePage: 'page-1'
}

function parseSize(size) {
  const [w, h] = (size || `4x${GRID_ROWS}`).split('x').map(Number)
  return { w: w || 4, h: h || GRID_ROWS }
}

function overlaps(col, row, w, h, widgets, excludeId) {
  for (const other of widgets) {
    if (other.id === excludeId) continue
    if (!other.col || !other.row) continue
    const os = parseSize(other.size)
    if (col < other.col + os.w && col + w > other.col && row < other.row + os.h && row + h > other.row) {
      return true
    }
  }
  return false
}

function findOpenPosition(w, h, widgets) {
  for (let r = 1; r <= GRID_ROWS - h + 1; r++) {
    for (let c = 1; c <= GRID_COLS - w + 1; c++) {
      if (!overlaps(c, r, w, h, widgets, null)) {
        return { col: c, row: r }
      }
    }
  }
  return { col: 1, row: 1 }
}

function assignPositions(widgets) {
  const result = []
  for (const w of widgets) {
    if (w.col && w.row) {
      result.push(w)
    } else {
      const { w: sw, h: sh } = parseSize(w.size)
      const pos = findOpenPosition(sw, sh, result)
      result.push({ ...w, ...pos })
    }
  }
  return result
}

export function useLayout() {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [loaded, setLoaded] = useState(false)

  const save = useCallback((next) => {
    if (window.shelf) window.shelf.saveLayout(next)
  }, [])

  const loadFromMain = useCallback(() => {
    if (window.shelf) {
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000))
      return Promise.race([window.shelf.getLayout(), timeout]).then((config) => {
        const migrated = config || DEFAULT_LAYOUT
        // Ensure all widgets have positions
        if (migrated.pages) {
          migrated.pages = migrated.pages.map(p => ({
            ...p,
            widgets: assignPositions(p.widgets || [])
          }))
        }
        setLayout(migrated)
        setLoaded(true)
      }).catch(() => {
        setLayout(DEFAULT_LAYOUT)
        setLoaded(true)
      })
    } else {
      setLoaded(true)
      return Promise.resolve()
    }
  }, [])

  useEffect(() => { loadFromMain() }, [loadFromMain])

  const reload = useCallback(() => { loadFromMain() }, [loadFromMain])

  // Get active page data
  const activePage = layout.activePage || layout.pages?.[0]?.id
  const activePageData = layout.pages?.find(p => p.id === activePage) || layout.pages?.[0]
  const pages = layout.pages || []

  const setActivePage = useCallback((pageId) => {
    setLayout(prev => {
      const next = { ...prev, activePage: pageId }
      save(next)
      return next
    })
  }, [save])

  const addPage = useCallback((name) => {
    setLayout(prev => {
      const id = `page-${Date.now()}`
      const next = {
        ...prev,
        pages: [...prev.pages, { id, name, triggerApp: null, widgets: [] }],
        activePage: id
      }
      save(next)
      return next
    })
  }, [save])

  const removePage = useCallback((pageId) => {
    setLayout(prev => {
      if (prev.pages.length <= 1) return prev // can't delete last page
      const next = {
        ...prev,
        pages: prev.pages.filter(p => p.id !== pageId),
      }
      if (next.activePage === pageId) {
        next.activePage = next.pages[0].id
      }
      save(next)
      return next
    })
  }, [save])

  const renamePage = useCallback((pageId, name) => {
    setLayout(prev => {
      const next = {
        ...prev,
        pages: prev.pages.map(p => p.id === pageId ? { ...p, name } : p)
      }
      save(next)
      return next
    })
  }, [save])

  // Widget CRUD — operates on active page
  const updatePageWidgets = useCallback((updater) => {
    setLayout(prev => {
      const next = {
        ...prev,
        pages: prev.pages.map(p => {
          if (p.id !== (prev.activePage || prev.pages[0]?.id)) return p
          return { ...p, widgets: updater(p.widgets) }
        })
      }
      save(next)
      return next
    })
  }, [save])

  const addWidget = useCallback((widgetId, size = '3x6') => {
    updatePageWidgets(widgets => {
      const id = `${widgetId}-${Date.now()}`
      const { w, h } = parseSize(size)
      const pos = findOpenPosition(w, h, widgets)
      return [...widgets, { id, widgetId, size, ...pos, config: {} }]
    })
  }, [updatePageWidgets])

  const removeWidget = useCallback((id) => {
    updatePageWidgets(widgets => widgets.filter(w => w.id !== id))
  }, [updatePageWidgets])

  const updateWidgetConfig = useCallback((id, config) => {
    updatePageWidgets(widgets =>
      widgets.map(w => w.id === id ? { ...w, config: { ...w.config, ...config } } : w)
    )
  }, [updatePageWidgets])

  const updateWidgetSize = useCallback((id, size) => {
    updatePageWidgets(widgets => {
      const { w, h } = parseSize(size)
      const widget = widgets.find(ww => ww.id === id)
      let col = widget?.col || 1, row = widget?.row || 1
      if (col + w - 1 > GRID_COLS) col = Math.max(1, GRID_COLS - w + 1)
      if (row + h - 1 > GRID_ROWS) row = Math.max(1, GRID_ROWS - h + 1)
      return widgets.map(ww => ww.id === id ? { ...ww, size, col, row } : ww)
    })
  }, [updatePageWidgets])

  const moveWidget = useCallback((id, col, row) => {
    updatePageWidgets(widgets =>
      widgets.map(w => w.id === id ? { ...w, col, row } : w)
    )
  }, [updatePageWidgets])

  // Backward compat: expose layout.widgets as active page's widgets
  const compatLayout = {
    ...layout,
    widgets: activePageData?.widgets || []
  }

  return {
    layout: compatLayout,
    loaded,
    reload,
    pages,
    activePage,
    setActivePage,
    addPage,
    removePage,
    renamePage,
    addWidget,
    removeWidget,
    updateWidgetConfig,
    updateWidgetSize,
    moveWidget,
  }
}
```

- [ ] **Step 2: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/core/hooks/useLayout.js
git commit -m "feat: rewrite useLayout for multi-page support"
```

---

### Task 10: Update App.jsx to render active page

**Files:**
- Modify: `src/core/App.jsx`

- [ ] **Step 1: Update App to use pages**

```js
import React, { useEffect } from 'react'
import { useLayout } from './hooks/useLayout'
import WidgetBar from './components/WidgetBar'

export default function App() {
  const { layout, loaded, reload, pages, activePage, setActivePage } = useLayout()

  useEffect(() => {
    if (window.shelf?.onLayoutChanged) {
      return window.shelf.onLayoutChanged(() => reload())
    }
  }, [reload])

  if (!loaded) return null

  return (
    <div className="app">
      <WidgetBar widgets={layout.widgets} />
      {pages.length > 1 && (
        <div className="page-indicator">
          {pages.map(p => (
            <div
              key={p.id}
              className={`page-dot${p.id === activePage ? ' active' : ''}`}
              onClick={() => setActivePage(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add page indicator CSS**

In `src/core/styles.css`, add at the end:
```css
/* ── Page Indicator ── */
.page-indicator {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 10;
}

.page-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s;
}

.page-dot.active {
  background: var(--accent);
  transform: scale(1.3);
}

/* ── Page Transition ── */
.widget-bar {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.widget-bar.page-exit {
  opacity: 0;
  transform: translateX(-20px);
}

.widget-bar.page-enter {
  opacity: 0;
  transform: translateX(20px);
}
```

The page transition works by briefly adding `page-exit` class, swapping the widget content, then switching to `page-enter` which transitions back to normal. This is handled in App.jsx via a short timeout (see Task 11).

- [ ] **Step 3: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/core/App.jsx src/core/styles.css
git commit -m "feat: render active page with page indicator dots"
```

---

### Task 11: Add swipe navigation hook

**Files:**
- Create: `src/core/hooks/useSwipe.js`
- Modify: `src/core/App.jsx`

- [ ] **Step 1: Create useSwipe hook**

Create `src/core/hooks/useSwipe.js`:

```js
import { useRef, useCallback } from 'react'

const SWIPE_THRESHOLD = 50      // minimum px horizontal
const RATIO_THRESHOLD = 3       // horizontal must exceed vertical by this ratio
const MAX_DURATION = 300         // must complete within this many ms

// Elements that should block swipe
const INTERACTIVE_SELECTORS = 'button, input, select, textarea, [role="slider"], [data-no-swipe]'

export function useSwipe({ onSwipeLeft, onSwipeRight }) {
  const touchState = useRef(null)

  const onTouchStart = useCallback((e) => {
    // Don't swipe if touch started on an interactive element
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

    // Must be fast enough
    if (dt > MAX_DURATION) return

    // Must move enough horizontally
    if (Math.abs(dx) < SWIPE_THRESHOLD) return

    // Horizontal must dominate vertical
    if (Math.abs(dy) > 0 && Math.abs(dx) / Math.abs(dy) < RATIO_THRESHOLD) return

    if (dx < 0) {
      onSwipeLeft?.()
    } else {
      onSwipeRight?.()
    }
  }, [onSwipeLeft, onSwipeRight])

  return { onTouchStart, onTouchEnd }
}
```

- [ ] **Step 2: Wire up swipe in App.jsx**

Update `src/core/App.jsx` to use the swipe hook:

```js
import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useLayout } from './hooks/useLayout'
import { useSwipe } from './hooks/useSwipe'
import WidgetBar from './components/WidgetBar'

export default function App() {
  const { layout, loaded, reload, pages, activePage, setActivePage } = useLayout()
  const [transitioning, setTransitioning] = useState(null) // 'exit' | 'enter' | null
  const barRef = useRef(null)

  useEffect(() => {
    if (window.shelf?.onLayoutChanged) {
      return window.shelf.onLayoutChanged(() => reload())
    }
  }, [reload])

  const switchPage = useCallback((pageId) => {
    setTransitioning('exit')
    setTimeout(() => {
      setActivePage(pageId)
      setTransitioning('enter')
      setTimeout(() => setTransitioning(null), 200)
    }, 200)
  }, [setActivePage])

  const goNext = useCallback(() => {
    const idx = pages.findIndex(p => p.id === activePage)
    if (idx < pages.length - 1) switchPage(pages[idx + 1].id)
  }, [pages, activePage, switchPage])

  const goPrev = useCallback(() => {
    const idx = pages.findIndex(p => p.id === activePage)
    if (idx > 0) switchPage(pages[idx - 1].id)
  }, [pages, activePage, switchPage])

  const { onTouchStart, onTouchEnd } = useSwipe({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  })

  if (!loaded) return null

  const barClass = transitioning === 'exit' ? 'page-exit' :
                   transitioning === 'enter' ? 'page-enter' : ''

  return (
    <div className="app" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <WidgetBar ref={barRef} widgets={layout.widgets} className={barClass} />
      {pages.length > 1 && (
        <div className="page-indicator">
          {pages.map(p => (
            <div
              key={p.id}
              className={`page-dot${p.id === activePage ? ' active' : ''}`}
              onClick={() => switchPage(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

Note: `WidgetBar` needs to accept and apply a `className` prop. Update `WidgetBar.jsx`:

```js
import React from 'react'
import WidgetCard from './WidgetCard'

export default function WidgetBar({ widgets, className }) {
  return (
    <div className={`widget-bar ${className || ''}`}>
      {widgets.map((widget) => (
        <WidgetCard key={widget.id} widget={widget} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/core/hooks/useSwipe.js src/core/App.jsx
git commit -m "feat: add swipe navigation between pages"
```

---

### Task 12: Update SettingsApp for multi-page management

**Files:**
- Modify: `src/core/SettingsApp.jsx`

- [ ] **Step 1: Add page selector tabs to Layout tab**

In `SettingsApp.jsx`, destructure the new page functions from `useLayout`:

```js
const {
  layout, loaded, pages, activePage, setActivePage,
  addPage, removePage, renamePage,
  addWidget, removeWidget, updateWidgetConfig, updateWidgetSize, moveWidget
} = useLayout()
```

Then add a page selector bar inside the layout tab, above the BarPreview:

Note: Task 3's grid math changes to `SettingsApp.jsx` (GRID_ROWS import, canPlace, getGridPos, handleResizeStart) must be preserved. This task adds the page selector UI around the existing BarPreview. Do NOT rewrite the file — add the page selector section and update the destructuring.

```jsx
{activeTab === 'layout' && (
  <>
    <section className="settings-pages">
      <div className="page-tabs">
        {pages.map(p => (
          <button
            key={p.id}
            className={`page-tab${p.id === activePage ? ' active' : ''}`}
            onClick={() => setActivePage(p.id)}
          >
            {p.name}
          </button>
        ))}
        <button
          className="page-tab add"
          onClick={() => {
            const name = window.prompt('Page name:')
            if (name?.trim()) addPage(name.trim())
          }}
        >+</button>
      </div>
      {pages.length > 1 && (
        <div className="page-actions">
          <button
            className="page-action"
            onClick={() => {
              const name = window.prompt('Rename page:', pages.find(p => p.id === activePage)?.name)
              if (name?.trim()) renamePage(activePage, name.trim())
            }}
          >Rename</button>
          <button
            className="page-action delete"
            onClick={() => {
              const page = pages.find(p => p.id === activePage)
              if (page?.widgets?.length > 0) {
                if (!window.confirm(`Delete "${page.name}"? It has ${page.widgets.length} widget(s).`)) return
              }
              removePage(activePage)
            }}
          >Delete Page</button>
        </div>
      )}
    </section>

    <section className="settings-preview">
      <h2>Bar Preview — {pages.find(p => p.id === activePage)?.name || 'Page'}</h2>
      <BarPreview
        widgets={layout.widgets}
        selectedWidgetId={selectedWidgetId}
        onSelect={selectWidget}
        onRemove={removeWidget}
        onSizeChange={(id, size) => updateWidgetSize(id, size)}
        onMoveWidget={moveWidget}
      />
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
```

- [ ] **Step 2: Add page selector CSS**

Add to `src/core/settings.css`:

```css
/* Page selector */
.settings-pages {
  padding: 12px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.page-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.page-tab {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-tab:hover {
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--text);
}

.page-tab.active {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
  font-weight: 600;
}

.page-tab.add {
  background: none;
  border-style: dashed;
  font-size: 14px;
  padding: 6px 12px;
}

.page-tab.add:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.page-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.page-action {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
}

.page-action:hover {
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.15);
}

.page-action.delete:hover {
  color: var(--negative);
  border-color: var(--negative);
}
```

- [ ] **Step 3: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/core/SettingsApp.jsx src/core/settings.css
git commit -m "feat: add page management UI to settings"
```

---

### Task 13: Expose page navigation to widgets via preload

**Files:**
- Modify: `src/main/preload.js`
- Modify: `src/main/ipc-handlers.js`
- Modify: `src/main/main.js` (if needed for IPC)

- [ ] **Step 1: Add page IPC handlers**

In `src/main/ipc-handlers.js`, add these handlers **inside** the `registerIpcHandlers(notifyBarOfLayoutChange)` function (alongside existing handlers):

```js
  ipcMain.handle('get-pages', () => {
    const config = loadConfig()
    return { pages: config.pages || [], activePage: config.activePage }
  })

  ipcMain.handle('set-active-page', (_event, pageId) => {
    const config = loadConfig()
    config.activePage = pageId
    saveConfig(config)
    if (notifyBarOfLayoutChange) notifyBarOfLayoutChange()
    return { ok: true }
  })
```

- [ ] **Step 2: Add to preload.js**

Add to the `contextBridge.exposeInMainWorld` call:

```js
getPages: () => ipcRenderer.invoke('get-pages'),
setActivePage: (pageId) => ipcRenderer.invoke('set-active-page', pageId),
onPageChanged: (callback) => {
  const handler = (_event, data) => callback(data)
  ipcRenderer.on('page-changed', handler)
  return () => ipcRenderer.removeListener('page-changed', handler)
},
```

- [ ] **Step 3: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/main/preload.js src/main/ipc-handlers.js
git commit -m "feat: expose page navigation via IPC"
```

---

## Chunk 3: Page Switcher Widget

### Task 14: Create page-switcher widget

**Files:**
- Create: `src/widgets/page-switcher/meta.js`
- Create: `src/widgets/page-switcher/config.js`
- Create: `src/widgets/page-switcher/widget.js`
- Create: `src/widgets/page-switcher/index.jsx`
- Modify: `src/widgets/_runtime/loader.js` (register the widget)

- [ ] **Step 1: Create meta.js**

Create `src/widgets/page-switcher/meta.js`:
```js
export default {
  id: 'page-switcher',
  name: 'Page Switcher',
  description: 'Navigate between pages',
  icon: '\u{25C0}\u{25B6}',
  defaultSize: '1x6',
  sizes: ['1x2', '1x3', '1x6', '2x2', '2x3']
}
```

- [ ] **Step 2: Create config.js**

Create `src/widgets/page-switcher/config.js`:
```js
export default {
  defaults: {},
  schema: [],
}
```

- [ ] **Step 3: Create widget.js**

Create `src/widgets/page-switcher/widget.js`:
```js
import meta from './meta'
import config from './config'
import Component from './index'

export default {
  ...meta,
  version: '1.0.0',
  author: 'Shelf',
  configSchema: config.schema || [],
  component: Component,
}
```

- [ ] **Step 4: Create index.jsx**

Create `src/widgets/page-switcher/index.jsx`:

```jsx
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
    // Listen for layout changes (which include page changes)
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
```

- [ ] **Step 5: Register in loader.js**

In `src/widgets/_runtime/loader.js`, import and add to the builtinWidgets array:

```js
import pageSwitcherWidget from '../page-switcher/widget'
// Add to the builtinWidgets array:
const builtinWidgets = [
  // ...existing widgets...
  pageSwitcherWidget,
]
```

- [ ] **Step 6: Build and verify**

Run: `cd /Users/ben/Developer/shelf && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/widgets/page-switcher/ src/widgets/_runtime/loader.js
git commit -m "feat: add page-switcher widget"
```

---

### Task 15: End-to-end visual test

- [ ] **Step 1: Delete existing config to test fresh start**

```bash
rm ~/.shelf/config.json
```

- [ ] **Step 2: Kill and relaunch**

```bash
pkill -f "Electron.app" 2>/dev/null
sleep 1
cd /Users/ben/Developer/shelf && open node_modules/electron/dist/Electron.app --args $(pwd)
```

- [ ] **Step 3: Verify**

Check:
- App starts with 6-row grid, default widgets fill full height
- Open settings (cmd+comma or tray icon)
- Settings shows "Dashboard" page tab
- Click "+" to add a second page — name it "Test"
- Add a widget to the Test page
- Switch between pages in settings — each has independent grid
- Close settings, verify bar shows the active page
- Swipe left/right on Xeneon to switch pages (if available; otherwise use page dots)
- Add page-switcher widget — verify arrows work, page name shows
- Page indicator dots appear at bottom when 2+ pages exist
- Volume slider and other interactive controls do NOT trigger swipe

- [ ] **Step 4: Test migration**

```bash
# Write an old-format config
echo '{"widgets":[{"id":"clock-1","widgetId":"clock","size":"sm","col":1,"row":1,"config":{}}]}' > ~/.shelf/config.json
```

Kill and relaunch. Verify:
- Config migrated to page format (check `~/.shelf/config.json`)
- Widget size migrated from `sm` → `2x6`
- Widget renders correctly

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during multi-page visual testing"
```
