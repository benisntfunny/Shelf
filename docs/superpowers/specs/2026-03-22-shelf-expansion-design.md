# Shelf Expansion Design Spec

## Overview

Six features that expand Shelf from a single-page widget bar into a multi-page, highly customizable dashboard with home automation, system monitoring, and quick-launch capabilities.

**Build order**: Multi-page system → App-level secrets → Computer Stats widget → Shortcuts widget → Home Assistant widget → Apple Home widget

---

## 1. Multi-Page System

### Problem
The Xeneon Edge has a fixed 12x6 grid. Users need more widgets than fit on one screen.

### Design

**Config structure** changes from `{ widgets: [...] }` to:
```js
{
  pages: [
    { id: 'page-1', name: 'Dashboard', widgets: [...] },
    { id: 'page-2', name: 'Home', widgets: [...] },
  ],
  activePage: 'page-1'
}
```

**Grid change: 12x3 → 12x6**: The grid expands from 3 rows to 6 rows. This doubles vertical granularity — widgets can be taller, shorter, or stacked more flexibly on the 360px display. All grid math, CSS, collision detection, and widget sizes updated accordingly.

**Size migration**: Existing `Wx3` sizes become `Wx6` (full height). This preserves current widget behavior — a widget that was "full height" at 3 rows stays "full height" at 6 rows. Widgets can then be resized to use fewer rows (e.g., `2x3` for a half-height clock). The migration also handles old string sizes (`sm` → `2x6`, `md` → `3x6`, `lg` → `4x6`, etc.).

**Migration**: Runs in `config-store.js` (main process) at load time:
1. Old string sizes (`sm`, `md`, etc.) → `Wx6` format
2. Old `Wx3` sizes → `Wx6` (multiply row count by 2)
3. Old flat `{ widgets: [...] }` → `{ pages: [{ id, name, widgets }], activePage }`

The existing client-side `migrateLayout` in `useLayout.js` is removed — all migration happens in `config-store.js`. No data loss.

**Swipe navigation**: A `useSwipe` hook on the bar container detects horizontal swipes via touch events.

Swipe detection rules:
- Minimum horizontal distance: 50px
- Horizontal movement must exceed vertical by 3:1 ratio
- Must complete within 300ms (velocity threshold)
- Ignores touches that originate on interactive controls — if the `touchstart` target or any ancestor is a `button`, `input`, `select`, `[role="slider"]`, or has `data-no-swipe` attribute, the swipe is suppressed
- Page transition animates with a CSS horizontal slide (transform + opacity)

**Built-in page indicator**: A small persistent dot row or page name renders at the bottom edge of the bar (outside the widget grid, in the bar chrome). Always visible when more than one page exists. Shows which page is active. This is separate from the Page Switcher widget — no configuration needed.

**No page limit**: Widgets on inactive pages are fully unmounted (no polling, no subscriptions, no timers). Only their config and last-known state are retained. This means pages have zero performance cost when not visible, so there is no need for an artificial limit.

**App-triggered pages (future)**: Pages can optionally be linked to a macOS application. When that app becomes the frontmost window, Shelf auto-switches to its page. For example, a "Photoshop" page with relevant shortcuts and tools activates when Photoshop is focused. Configured per-page in settings with an app picker. Uses `NSWorkspace` notifications via a main-process listener (`did-activate-application` or polling `NSWorkspace.shared.frontmostApplication`). Out of scope for v1 but the page data model includes an optional `triggerApp` field now to avoid future migration:
```js
{ id: 'page-3', name: 'Photoshop', triggerApp: 'com.adobe.Photoshop', widgets: [...] }
```
When `triggerApp` is set, manual swipe/nav still works — the auto-switch only fires on app focus changes. A "return to default" behavior activates when no trigger matches (returns to the last manually selected page).

**Settings changes**:
- Layout tab gets a page selector bar at the top (tabs with page names)
- "+" button to add a new page (prompts for name)
- Right-click or long-press on page tab to rename/delete
- Each page has its own independent 12x6 grid preview
- Deleting a page with widgets shows a confirmation

**Files affected**:
- `config-store.js` — migration logic (consolidate all migration here), new config shape
- `useLayout.js` — page-aware state management (addPage, removePage, renamePage, setActivePage, per-page widget CRUD). Remove old client-side migration. Update all grid bounds from 3 → 6 rows.
- `App.jsx` / `WidgetBar` — render active page, swipe handler, page indicator
- `SettingsApp.jsx` — page selector UI in Layout tab. Update grid preview from `repeat(3, 1fr)` → `repeat(6, 1fr)`.
- `src/core/styles.css` — grid CSS from 3 → 6 rows
- `src/core/settings.css` — preview grid from 3 → 6 rows
- All widget `meta.js` files — update sizes from `Wx3` → `Wx6`
- New: `src/core/hooks/useSwipe.js`

### Page Switcher Widget

A small widget (sizes: 1x2, 1x3, 1x6, 2x2, 2x3) for manual page navigation.

**Rendering**: Left arrow, subtle page name/dots, right arrow. Arrows are large touch targets filling most of the cell. Arrows dim (reduced opacity) at first/last page. Tapping an arrow calls `setActivePage` for the adjacent page.

**Behavior**: Can be placed on any page like a normal widget. If the user wants it visible on all pages, they add it to each page's layout individually.

**Files**: `src/widgets/page-switcher/` (meta.js, config.js, widget.js, index.jsx)

---

## 2. App-Level Secrets Schema

### Problem
API keys shouldn't live in widget config. Multiple widget instances should share the same credentials. Users need a clear place to manage all their keys.

### Current state
The existing `SecretsPanel.jsx` discovers secrets from `configSchema` fields with `secret: true` and stores them namespaced as `{widgetId}.{key}` (e.g., `weather.openweathermap_key`). This namespacing prevents sharing between widget instances.

### Design

**Transition to `secretsSchema`**: Introduce a new optional `secretsSchema` field on the widget export. This replaces the old pattern of marking `configSchema` fields with `secret: true`.

```js
// In widget.js (alongside existing fields)
export default {
  id: 'home-assistant',
  name: 'Home Assistant',
  // ...existing fields...
  secretsSchema: [
    { key: 'ha_url', label: 'Home Assistant URL', placeholder: 'http://homeassistant.local:8123' },
    { key: 'ha_token', label: 'Home Assistant Token', secret: true },
  ]
}
```

**Storage**: `secretsSchema` keys are stored as global flat keys in `~/.shelf/secrets.json` (e.g., `ha_token`, not `home-assistant.ha_token`). This enables sharing across widget instances.

**Migration of existing secrets**: On first load, `SecretsPanel` checks for old namespaced keys (e.g., `weather.openweathermap_key`) and migrates them to flat keys (e.g., `openweathermap_key`). Existing widgets (weather, stocks) will have their `configSchema` `secret` fields moved to `secretsSchema`. The old namespaced keys are kept as a fallback during a transition period — `getSecrets()` checks flat key first, then falls back to `{widgetId}.{key}`.

**Keys tab behavior**:
- Collects `secretsSchema` from all registered widgets (via new `getAllSecretsSchema()` in loader.js)
- Also collects any legacy `configSchema` fields with `secret: true` for backward compatibility
- Merges into a unified list, deduped by key
- Renders each as a form field (password input if `secret: true`, text input otherwise)
- Shows which widget(s) need each key
- Visual indicator (warning icon) for keys that are required but not yet set

**Widget access**: Widgets call `window.shelf.getSecrets()` to read their keys at runtime. No changes to this API.

**Missing key detection**: When a widget is added to the layout and it has `secretsSchema` with unset keys, the Settings window auto-switches to the Keys tab with a prompt. Gentle nudge, not a blocker.

**Files affected**:
- Widget exports for weather, stocks (move `secret` fields to `secretsSchema`)
- `src/widgets/_runtime/loader.js` — new export `getAllSecretsSchema()`
- `src/core/components/SecretsPanel.jsx` — rewrite to use `secretsSchema`, handle migration
- `src/core/SettingsApp.jsx` — auto-switch to Keys tab on missing secrets

---

## 3. Computer Stats Widget

### Problem
The existing system widget shows basic CPU/RAM/NET percentages. Users want detailed, customizable system monitoring with visual gauges.

### Design

**Data collection** — expand `src/main/system-stats.js`:

**Always available (no special privileges)**:

| Stat | Source | Default display |
|------|--------|----------------|
| CPU (overall) | `os.cpus()` delta calculation | Radial gauge |
| CPU (per-core) | `os.cpus()` per-core | Radial gauge |
| RAM | `os.totalmem()` / `os.freemem()` | Bar |
| Disk usage | `child_process.exec('df -k')` per volume | Bar |
| Network throughput | `networkInterfaces()` delta (replace current stub) | Number |
| Battery | `pmset -g batt` parsing | Bar |

**Best-effort (may not be available)**:

| Stat | Source | Fallback |
|------|--------|----------|
| CPU temperature | `ioreg` SMC queries | Hidden if unavailable |
| GPU temperature | `ioreg` SMC queries | Hidden if unavailable |
| Fan speed | `ioreg` SMC queries | Hidden if unavailable |

Note: `powermetrics` requires root and will NOT be used. All temperature/fan data comes from `ioreg` SMC key queries which work without elevated privileges on most Macs. If a stat cannot be read, it is hidden from the stat picker entirely. GPU usage is not reliably available without `powermetrics` and is excluded from v1.

New IPC handler: `get-system-stats-full` returns all available stats. Existing `get-system-stats` unchanged.

**Config**:
```js
{
  stats: [
    { id: 'cpu', display: 'radial', thresholds: { warn: 50, crit: 80 } },
    { id: 'ram', display: 'bar', thresholds: { warn: 60, crit: 85 } },
    { id: 'cpu-temp', display: 'number', thresholds: { warn: 70, crit: 90 } },
  ],
  pollInterval: 2,  // seconds
  showSparklines: false,
}
```

Config schema provides:
- Stat picker (checklist of available stats)
- Per-stat display style override (radial / bar / number)
- Per-stat threshold overrides
- Poll interval (1-10 seconds)
- Sparkline toggle (shows last 60 data points as a tiny line graph behind each stat)

**Sparkline data persistence**: Sparkline history is stored in the main process (a simple in-memory ring buffer per stat in `system-stats.js`). The IPC response includes history arrays. This means history survives page switches and widget remounts. History resets on app restart (acceptable — no disk persistence needed).

**Rendering**:
- Stats arranged in a flex-wrap grid within the widget
- **Radial gauge**: SVG arc, colored by threshold (green → yellow → red), percentage in center, label below
- **Bar**: Horizontal fill bar, colored by threshold, value + label
- **Number**: Large styled number with unit, colored by threshold, label below
- **Sparkline**: Tiny SVG polyline behind the stat, last 60 samples, subtle gray
- Adapts to widget size — auto-wraps, hides labels at very small sizes

**Sizes**: 1x2, 1x3, 2x2, 2x3, 2x6, 3x3, 3x6, 4x6, 6x6

**Files**:
- `src/main/system-stats.js` — expand with full stats collection + history ring buffers
- `src/main/ipc-handlers.js` — new `get-system-stats-full` handler
- `src/main/preload.js` — expose `getSystemStatsFull()`
- `src/widgets/computer-stats/` — new widget (meta.js, config.js, widget.js, index.jsx)
- `src/widgets/computer-stats/gauges/` — RadialGauge.jsx, BarGauge.jsx, NumberDisplay.jsx, Sparkline.jsx

---

## 4. Shortcuts Widget

### Problem
Users want quick-launch buttons for macOS Shortcuts and custom actions (apps, URLs, shell commands).

### Design

**Action types**:
- `shortcut` — runs a macOS Shortcut by name via `shortcuts run "Name"`
- `app` — opens an app via `open "/path/to/App.app"` or `open -a "App Name"`
- `url` — opens a URL via `open "https://..."`
- `shell` — runs a shell command via `child_process.exec(cmd)` with 10s timeout

**Security note for shell actions**: `~/.shelf/config.json` should be set to mode 0600 (owner-only read/write) when written by `config-store.js`. This prevents other processes from injecting commands via config modification. The save function will `chmod` after write.

**Config**:
```js
{
  actions: [
    { type: 'shortcut', name: 'Lights On', icon: '💡', value: 'Turn On Living Room' },
    { type: 'app', name: 'Spotify', icon: '🎵', value: '/Applications/Spotify.app' },
    { type: 'url', name: 'GitHub', icon: '🐙', value: 'https://github.com' },
    { type: 'shell', name: 'Deploy', icon: '🚀', value: 'cd ~/project && make deploy' },
  ],
  columns: 0,  // 0 = auto based on widget size
}
```

Config schema:
- Action list with structured itemSchema (type dropdown, name, icon, value)
- For `shortcut` type: a dropdown populated by `shortcuts list` output (new IPC handler)
- Column count override (0 = auto)

**IPC handlers** (new):
- `list-shortcuts` — runs `shortcuts list`, returns array of names
- `run-shortcut` — runs `shortcuts run "Name"`, returns stdout
- `launch-action` — dispatches app/url/shell actions

**Rendering**: Grid of square buttons, each with:
- Emoji/icon (large, centered)
- Label underneath (small text)
- Tap highlight animation (brief scale + opacity pulse)
- At small sizes, icons only (labels hidden)
- Grid columns auto-calculated from widget width, or user-specified

**Sizes**: 1x2, 1x3, 1x6, 2x2, 2x3, 2x6, 3x3, 3x6, 4x6, 6x6

**Files**:
- `src/main/ipc-handlers.js` — new handlers for shortcuts/launch
- `src/main/preload.js` — expose new APIs
- `src/widgets/shortcuts/` — new widget

---

## 5. Home Assistant Widget

### Problem
Users want to monitor and control Home Assistant entities from the Xeneon bar.

### Design

**Secrets**: Declares via `secretsSchema`:
```js
secretsSchema: [
  { key: 'ha_url', label: 'Home Assistant URL', placeholder: 'http://homeassistant.local:8123' },
  { key: 'ha_token', label: 'Home Assistant Token', secret: true },
]
```

**Entity picker** — new config field type `entity-picker`:
- Widget config includes an `entities` field of type `entity-picker`
- When rendered in settings, this field calls the HA REST API (`GET /api/states`) to fetch all entities
- Presents a searchable list with checkboxes, grouped by domain (lights, sensors, switches, etc.)
- Filtered by search text matching entity_id or friendly_name
- **Requires valid credentials**: If HA URL or token is not yet configured in Keys tab, the entity picker shows a message "Configure Home Assistant credentials in the Keys tab first" instead of attempting to fetch. No silent failures.

**Entity grouping**:
- Config allows creating named groups: `{ groups: [{ name: 'Living Room', entities: ['light.living_room', 'sensor.living_room_temp'] }] }`
- Entities not in any group get their own card
- Groups render as a single card with the group name as header and all entities inside

**Auto-rendering by domain**:

| Domain | Control |
|--------|---------|
| `switch`, `input_boolean` | Toggle button |
| `light` | Toggle + brightness slider (if supported) + color (if supported) |
| `fan` | Toggle + speed dropdown (if supported) |
| `sensor` | Value display with unit and icon |
| `binary_sensor` | Status indicator (icon + on/off label) |
| `climate` | Current temp, target temp with +/- buttons, mode selector |
| `cover` | Open/close/stop buttons |
| `lock` | Lock/unlock toggle |
| `scene`, `script`, `automation` | Tap-to-activate button |
| (other) | Friendly name + state text |

**Communication**:
- New IPC module: `src/main/ha-client.js`
- Reads HA URL + token from secrets
- Uses HA WebSocket API (`ws://{url}/api/websocket`) for real-time state updates — subscribes to `state_changed` events for configured entities only (not all entities)
- Falls back to REST polling (every 10s) if WebSocket connection fails
- `ha-get-states` — fetches current state of configured entities
- `ha-call-service` — `POST /api/services/{domain}/{service}` with entity_id and data
- WebSocket reconnects automatically with exponential backoff (1s, 2s, 4s, max 30s)

**Error states**:
- **Loading**: Spinner with "Connecting to Home Assistant..."
- **Auth error (401/403)**: "Invalid token — check Keys tab" with link/button
- **Connection error**: "Cannot reach Home Assistant" with retry countdown
- **Partial failure**: Individual entity cards show "unavailable" state (gray) if their state is unknown

**Rendering**:
- Cards in a flex-wrap grid
- Each card: header (group name or entity name), entity controls stacked vertically
- Compact — toggles are small pill buttons, sensors are inline value+unit
- Colors follow HA conventions (yellow for lights on, blue for climate, green for on, gray for off)
- Adapts to widget size

**Sizes**: 2x3, 2x6, 3x3, 3x6, 4x6, 6x6, 8x6

**Files**:
- `src/main/ha-client.js` — HA WebSocket + REST API wrapper
- `src/main/ipc-handlers.js` — new HA handlers
- `src/main/preload.js` — expose HA APIs
- `src/widgets/home-assistant/` — new widget
- `src/core/components/EntityPicker.jsx` — reusable entity picker for settings
- `src/widgets/home-assistant/controls/` — Toggle.jsx, Slider.jsx, ClimateCard.jsx, SensorDisplay.jsx, etc.

---

## 6. Apple Home Widget (HomeKit)

### Problem
Users want to see and control Apple HomeKit devices directly, without Home Assistant.

### Design

**Dependency**: `hap-controller` npm package (by mrstegeman) for HomeKit Accessory Protocol communication. This package supports discovery, PIN-based pairing as a controller, characteristic reads/writes, and event subscriptions. (Note: `hap-node-client` is a different package that connects to existing bridges — `hap-controller` is what provides the full controller pairing flow.)

**Pairing flow**:
1. User adds Apple Home widget
2. Widget detects no pairing data exists
3. Settings shows "Pair with HomeKit" button
4. On click, the main process starts HAP discovery on the local network via mDNS
5. Discovered bridges/accessories shown in a list with names and types
6. User selects one and enters the 8-digit PIN from the accessory/Home app
7. Shelf pairs as a HomeKit controller
8. Pairing credentials stored in `~/.shelf/homekit/` (persists across restarts)
9. Multiple bridges can be paired

**State management**:
- After pairing, HAP client subscribes to characteristic change events
- Near real-time updates (event-driven, not polling)
- Accessories and their services/characteristics cached in memory
- Reconnects automatically on network changes with exponential backoff

**Error states**:
- **No pairings**: "No HomeKit devices paired — tap Pair to get started"
- **Discovery running**: Spinner with "Searching for HomeKit devices..."
- **Pairing failed**: "Pairing failed — check PIN and try again"
- **Bridge offline**: Individual accessory shows "Offline" state (gray)
- **Network error**: "Cannot reach HomeKit devices" with retry

**Config**: Similar to HA widget:
- Accessory picker shows paired accessories with friendly names
- Grouping support (named groups of accessories)
- Ungrouped accessories get individual cards

**Rendering by service type**:

| HomeKit Service | Control |
|----------------|---------|
| Lightbulb | Toggle + brightness slider |
| Switch / Outlet | Toggle |
| Thermostat | Current temp, target temp +/-, mode |
| Lock Mechanism | Lock/unlock toggle |
| Garage Door Opener | Open/close button with state |
| Contact Sensor | Open/closed indicator |
| Temperature Sensor | Value display |
| Humidity Sensor | Value display |
| Motion Sensor | Detected/clear indicator |
| (other) | Name + raw characteristic values |

**IPC layer** — new module `src/main/homekit-manager.js`:
- `homekit-discover` — scan for accessories on local network
- `homekit-pair` — pair with an accessory using PIN
- `homekit-accessories` — list all paired accessories with current state
- `homekit-control` — set a characteristic value (e.g., turn on light, set brightness)
- `homekit-unpair` — remove pairing

**Sizes**: 2x3, 2x6, 3x3, 3x6, 4x6, 6x6, 8x6

**Files**:
- `src/main/homekit-manager.js` — HAP client wrapper, discovery, pairing, subscriptions
- `src/main/ipc-handlers.js` — new HomeKit handlers
- `src/main/preload.js` — expose HomeKit APIs
- `src/widgets/apple-home/` — new widget
- `src/widgets/apple-home/controls/` — reuse patterns from HA widget controls where possible

---

## Cross-Cutting Concerns

### Config migration
All migration logic consolidates in `config-store.js` (main process, runs at load time):
1. Old size strings (`sm`, `md`, etc.) → `WxH` format (moved from `useLayout.js`)
2. Old flat `{ widgets: [...] }` → `{ pages: [{ id, name, widgets }], activePage }`
3. Old namespaced secrets (`{widgetId}.{key}`) → flat keys

`useLayout.js` migration code is removed — it receives already-migrated data from main.

### Config file permissions
`config-store.js` sets `~/.shelf/config.json` and `~/.shelf/secrets.json` to mode 0600 (owner-only) on every write. This mitigates the command injection risk from shell actions in the Shortcuts widget.

### Widget contract changes
New optional fields on widget exports:
- `secretsSchema: [{ key, label, placeholder?, secret? }]` — declared in `widget.js`
- No breaking changes to existing widgets

### Shared control components
HA and Apple Home widgets share common UI patterns. Extract reusable components:
- `src/widgets/_shared/Toggle.jsx`
- `src/widgets/_shared/Slider.jsx`
- `src/widgets/_shared/SensorValue.jsx`
- `src/widgets/_shared/CardGrid.jsx`

### New config field types
- `entity-picker` — searchable multi-select populated by API (used by HA and Apple Home). Requires valid credentials before rendering; shows prompt if credentials missing.
- `stat-picker` — checklist with per-item options (used by Computer Stats)

These are rendered by `ConfigField.jsx` with new type handlers.

### Performance
- **Inactive pages are inert**: Widgets on non-visible pages are unmounted. No polling, no timers, no subscriptions. Only config and last-known state are stored.
- **System stats sparkline history**: The main process maintains ring buffers for stat history regardless of widget mount state. When the stats widget mounts, it receives the full history. When unmounted, the main process continues collecting (lightweight — just CPU/RAM reads into a small buffer). This is the one exception to "inactive = inert" because the data is cheap to collect and losing history on page switch would be annoying.
- **HA WebSocket**: Connects on widget mount, disconnects on unmount. Reconnects when the widget is shown again. State is fetched fresh on mount.
- **HomeKit subscriptions**: Same pattern — subscribe on mount, unsubscribe on unmount. Accessories are re-queried on mount.
- **Page transitions**: CSS transforms (GPU-accelerated, no layout thrash)

### Registry
The widget registry at `registry/registry.json` still uses old size names (`xs`, `sm`, etc.). Update to `WxH` format as part of the migration work.
