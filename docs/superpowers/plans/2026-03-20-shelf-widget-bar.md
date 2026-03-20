# Shelf - macOS Widget Bar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron + React app that turns an ultra-wide display into a customizable widget bar with drag-and-drop editing.

**Architecture:** Electron main process handles display detection, config I/O, and external API calls (stocks, weather). React renderer displays widgets in a horizontal flex row. Edit mode provides a control panel for adding/reordering/configuring widgets. Widget registry pattern -- each widget is a self-contained module with component, config schema, and metadata.

**Tech Stack:** Electron 33+, React 19, Vite, @dnd-kit/core, plain JS (no TypeScript)

---

## File Structure

```
shelf/
  package.json
  vite.config.js
  electron-builder.json
  .gitignore
  README.md
  index.html
  src/
    main/
      main.js              -- Electron main process (display detection, window, IPC)
      preload.js           -- Context bridge exposing window.shelf API
      config-store.js      -- Read/write ~/.shelf/config.json
      ipc-handlers.js      -- IPC handler registration (config, system, music, stocks)
      system-stats.js      -- CPU, RAM, network stats
      apple-music.js       -- Apple Music via osascript
      stocks-api.js        -- Fetch stock data from Yahoo Finance
      weather-api.js       -- Fetch weather from Open-Meteo (free, no key)
    renderer/
      index.jsx            -- React entry point
      App.jsx              -- Main app shell: widget bar + edit mode
      styles.css           -- Global styles + CSS custom properties (design system)
      hooks/
        useLayout.js       -- Layout state management + IPC save/load
        useEditMode.js     -- Edit mode toggle state
      components/
        WidgetBar.jsx       -- Horizontal flex container rendering active widgets
        WidgetCard.jsx      -- Card wrapper: size class, styling, drag handle
        EditPanel.jsx       -- Edit mode overlay: palette + config
        WidgetPalette.jsx   -- Available widgets grid (click to add)
        ConfigPanel.jsx     -- Dynamic form renderer from config schema
        ConfigField.jsx     -- Individual config field (text, number, toggle, list)
    widgets/
      registry.js          -- Imports all widgets, exports manifest array
      clock/
        index.jsx
        config.js
        meta.js
      weather/
        index.jsx
        config.js
        meta.js
      now-playing/
        index.jsx
        config.js
        meta.js
      stocks/
        index.jsx
        config.js
        meta.js
      system/
        index.jsx
        config.js
        meta.js
      felix-status/
        index.jsx
        config.js
        meta.js
      spacer/
        index.jsx
        config.js
        meta.js
```

---

## Chunk 1: Project Scaffold + Electron Shell

### Task 1: Initialize project with package.json and dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "shelf",
  "version": "0.1.0",
  "private": true,
  "main": "src/main/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"sleep 2 && electron .\"",
    "dev:vite": "vite",
    "dev:electron": "electron .",
    "build": "vite build",
    "start": "vite build && electron .",
    "dist": "vite build && electron-builder"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "concurrently": "^9.1.2",
    "electron": "^33.3.1",
    "electron-builder": "^25.1.8",
    "vite": "^6.2.4"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
out/
.vite/
*.log
.DS_Store
```

- [ ] **Step 3: Install dependencies**

Run: `cd /Users/ben/Developer/shelf && npm install`

### Task 2: Vite config + HTML entry point

**Files:**
- Create: `vite.config.js`
- Create: `index.html`

- [ ] **Step 1: Create vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
```

- [ ] **Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shelf</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/renderer/index.jsx"></script>
</body>
</html>
```

### Task 3: Electron main process + preload

**Files:**
- Create: `src/main/main.js`
- Create: `src/main/preload.js`
- Create: `src/main/config-store.js`
- Create: `src/main/ipc-handlers.js`

- [ ] **Step 1: Create config-store.js**

Reads/writes ~/.shelf/config.json. Creates directory and default config if missing.

- [ ] **Step 2: Create ipc-handlers.js**

Registers IPC handlers: get-layout, save-layout, get-system-stats, get-now-playing, get-stocks, get-weather.

- [ ] **Step 3: Create preload.js**

Exposes window.shelf API via contextBridge with invoke wrappers for all IPC channels.

- [ ] **Step 4: Create main.js**

Finds Xeneon Edge display (1280x360 logical or smallest-height fallback), creates fullscreen BrowserWindow, loads Vite dev URL or dist/index.html, hides menu bar.

### Task 4: React entry + App shell + design system CSS

**Files:**
- Create: `src/renderer/index.jsx`
- Create: `src/renderer/App.jsx`
- Create: `src/renderer/styles.css`

- [ ] **Step 1: Create styles.css with full design system**

All CSS custom properties (--bg, --card-bg, --card-border, etc.), base reset, body styling, widget card styles, edit mode styles.

- [ ] **Step 2: Create index.jsx**

ReactDOM.createRoot render of App.

- [ ] **Step 3: Create App.jsx**

Shell component: loads layout via useLayout hook, renders WidgetBar, gear button in bottom-right, edit mode toggle.

- [ ] **Step 4: Verify Electron + Vite dev mode works**

Run: `cd /Users/ben/Developer/shelf && npm run dev:vite` (just check Vite compiles)

---

## Chunk 2: Layout Engine + Widget Framework

### Task 5: Layout hooks and WidgetBar

**Files:**
- Create: `src/renderer/hooks/useLayout.js`
- Create: `src/renderer/hooks/useEditMode.js`
- Create: `src/renderer/components/WidgetBar.jsx`
- Create: `src/renderer/components/WidgetCard.jsx`

- [ ] **Step 1: Create useLayout.js**

State: widgets array. load() calls window.shelf.getLayout(). save() calls window.shelf.saveLayout(). addWidget(), removeWidget(), reorderWidgets(), updateWidgetConfig() helpers.

- [ ] **Step 2: Create useEditMode.js**

Simple boolean toggle state.

- [ ] **Step 3: Create WidgetBar.jsx**

Horizontal flex container. Maps layout widgets to WidgetCard components. Integrates @dnd-kit/sortable for reordering when in edit mode.

- [ ] **Step 4: Create WidgetCard.jsx**

Wrapper div with size class (xs/sm/md/lg/xl/fill mapped to widths). Card styling from design system. In edit mode: gold border + drag handle. Renders the actual widget component inside.

### Task 6: Widget registry

**Files:**
- Create: `src/widgets/registry.js`

- [ ] **Step 1: Create registry.js**

Imports all widget meta.js files. Exports: getWidgetMeta(widgetId), getAllWidgets(), getWidgetComponent(widgetId) (lazy imports).

---

## Chunk 3: Core Widgets (Clock, Spacer, System)

### Task 7: Clock widget

**Files:**
- Create: `src/widgets/clock/index.jsx`
- Create: `src/widgets/clock/config.js`
- Create: `src/widgets/clock/meta.js`

- [ ] **Step 1: Create meta.js** -- id: "clock", name: "Clock", defaultSize: "sm"
- [ ] **Step 2: Create config.js** -- schema: use24h (toggle, default false), showSeconds (toggle, default false)
- [ ] **Step 3: Create index.jsx** -- Renders time (large), date below. Uses setInterval(1000). Reads config for 24h/seconds.

### Task 8: Spacer widget

**Files:**
- Create: `src/widgets/spacer/index.jsx`
- Create: `src/widgets/spacer/config.js`
- Create: `src/widgets/spacer/meta.js`

- [ ] **Step 1: Create all three files** -- Empty div, config for size override, meta with defaultSize "fill"

### Task 9: System widget

**Files:**
- Create: `src/widgets/system/index.jsx`
- Create: `src/widgets/system/config.js`
- Create: `src/widgets/system/meta.js`
- Create: `src/main/system-stats.js`

- [ ] **Step 1: Create system-stats.js in main process** -- Uses os module for CPU/RAM. Parses network stats.
- [ ] **Step 2: Create meta.js + config.js** -- id: "system", defaultSize: "md", no config
- [ ] **Step 3: Create index.jsx** -- Polls window.shelf.getSystemStats() every 2s. Renders CPU%, RAM%, network up/down.

---

## Chunk 4: Edit Mode (Control Panel)

### Task 10: Edit panel, widget palette, config panel

**Files:**
- Create: `src/renderer/components/EditPanel.jsx`
- Create: `src/renderer/components/WidgetPalette.jsx`
- Create: `src/renderer/components/ConfigPanel.jsx`
- Create: `src/renderer/components/ConfigField.jsx`

- [ ] **Step 1: Create ConfigField.jsx** -- Renders input based on field type: "toggle" (checkbox), "text" (input), "number" (input), "select" (dropdown), "list" (add/remove items).

- [ ] **Step 2: Create ConfigPanel.jsx** -- Given a widget instance + its config schema, renders ConfigField for each field. Calls onConfigChange on change.

- [ ] **Step 3: Create WidgetPalette.jsx** -- Grid of all available widgets from registry. Each as a card with icon + name. Click calls onAddWidget.

- [ ] **Step 4: Create EditPanel.jsx** -- Slides up from bottom. Left side: WidgetPalette. Right side: ConfigPanel (shown when a widget is selected). "Done" button. Remove widget button on each active widget.

- [ ] **Step 5: Wire into App.jsx** -- EditPanel renders when editMode is true. Pass all layout mutation handlers.

---

## Chunk 5: Remaining Widgets (Weather, Stocks, NowPlaying, FelixStatus)

### Task 11: Weather widget

**Files:**
- Create: `src/widgets/weather/index.jsx`
- Create: `src/widgets/weather/config.js`
- Create: `src/widgets/weather/meta.js`
- Create: `src/main/weather-api.js`

- [ ] **Step 1: Create weather-api.js** -- Fetches from Open-Meteo API (free, no key). Takes lat/lon/units.
- [ ] **Step 2: Create meta + config** -- Config: latitude (text), longitude (text), units (select: C/F)
- [ ] **Step 3: Create index.jsx** -- Displays temp, condition icon (emoji), hi/lo. Refreshes every 15 min.

### Task 12: Stocks widget

**Files:**
- Create: `src/widgets/stocks/index.jsx`
- Create: `src/widgets/stocks/config.js`
- Create: `src/widgets/stocks/meta.js`
- Create: `src/main/stocks-api.js`

- [ ] **Step 1: Create stocks-api.js** -- Fetches from Yahoo Finance v8 quote endpoint.
- [ ] **Step 2: Create meta + config** -- Config: tickers (list), refreshInterval (number, default 60)
- [ ] **Step 3: Create index.jsx** -- Horizontal ticker cards. Price + % change. Green/red coloring.

### Task 13: NowPlaying widget

**Files:**
- Create: `src/widgets/now-playing/index.jsx`
- Create: `src/widgets/now-playing/config.js`
- Create: `src/widgets/now-playing/meta.js`
- Create: `src/main/apple-music.js`

- [ ] **Step 1: Create apple-music.js** -- Uses osascript to get current track info from Music.app (track, artist, album, artwork path, state).
- [ ] **Step 2: Create meta + config** -- No user config needed.
- [ ] **Step 3: Create index.jsx** -- Shows album art, track name, artist. Play/pause/skip controls via IPC.

### Task 14: FelixStatus widget

**Files:**
- Create: `src/widgets/felix-status/index.jsx`
- Create: `src/widgets/felix-status/config.js`
- Create: `src/widgets/felix-status/meta.js`

- [ ] **Step 1: Create meta + config** -- Config: url (text), label (text), refreshInterval (number, default 30)
- [ ] **Step 2: Create index.jsx** -- Polls URL via IPC, shows status dot (green/red) + label + response time.

---

## Chunk 6: Polish + README

### Task 15: README and final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README** -- Setup instructions, how to add custom widgets, architecture overview.
- [ ] **Step 2: Run `npm run build`** -- Verify Vite build succeeds with zero errors.
- [ ] **Step 3: Final review** -- Check all files exist, no em dashes in UI strings, no TypeScript.
