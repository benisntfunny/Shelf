# Shelf

A customizable widget bar for macOS, built for ultra-wide displays like the Corsair Xeneon Edge (2560x720). Electron + React.

## Setup

```bash
npm install
npm run dev      # Vite dev server + Electron
npm run build    # Production build (Vite only)
npm start        # Build + launch Electron
```

## How It Works

Shelf displays widgets in a horizontal bar across your secondary display. On launch it looks for a Xeneon Edge (1280x360 logical / 2560x720 physical) and falls back to the smallest-height display.

Click the gear icon (bottom-right) to enter edit mode:
- **Left panel**: Click any widget to add it to the bar
- **Right panel**: Configure the selected widget (size, settings)
- Drag widgets to reorder
- Click the X to remove a widget
- Click "Done" to exit edit mode

Layout is saved to `~/.shelf/config.json`.

## Built-in Widgets

| Widget | Description | Size | Config |
|--------|------------|------|--------|
| Clock | Time and date | sm | 24h format, show seconds |
| Weather | Current conditions, hi/lo | sm | Latitude, longitude, C/F |
| Now Playing | Apple Music track + controls | lg | None |
| Stocks | Ticker cards with price + % change | lg | Ticker list, refresh interval |
| System | CPU%, RAM%, network | md | None |
| Felix Status | URL health check | xs | URL, label, refresh interval |
| Spacer | Flexible empty space | fill | None |

## Adding a Custom Widget

Create a folder in `src/widgets/<name>/` with three files:

### meta.js

```js
export default {
  id: 'my-widget',
  name: 'My Widget',
  description: 'What it does',
  icon: '\u{1F680}',
  defaultSize: 'md',   // xs | sm | md | lg | xl | fill
}
```

### config.js

```js
export default {
  defaults: { greeting: 'Hello' },
  schema: [
    { key: 'greeting', label: 'Greeting', type: 'text' },
    // type: 'toggle' | 'text' | 'number' | 'select' | 'list'
    // For 'select', add: options: ['A', 'B']
  ],
}
```

### index.jsx

```jsx
export default function MyWidget({ config }) {
  return <div className="widget-content">{config?.greeting || 'Hello'}</div>
}
```

Then register it in `src/widgets/registry.js` by importing and adding to the `widgets` array.

## Architecture

```
src/
  main/           # Electron main process
    main.js       # Window creation, display targeting
    preload.js    # Context bridge (window.shelf API)
    config-store  # ~/.shelf/config.json read/write
    ipc-handlers  # IPC registration for all channels
    system-stats  # CPU/RAM via os module
    apple-music   # osascript bridge
    stocks-api    # Yahoo Finance
    weather-api   # Open-Meteo (free, no key)
  renderer/       # React app
    App.jsx       # Shell: widget bar + edit mode
    components/   # WidgetBar, WidgetCard, EditPanel, ConfigPanel
    hooks/        # useLayout, useEditMode
  widgets/        # Self-contained widget modules
    registry.js   # Central widget manifest
    <name>/       # meta.js + config.js + index.jsx
```

## External APIs

- **Weather**: [Open-Meteo](https://open-meteo.com/) (free, no API key)
- **Stocks**: Yahoo Finance v8 chart API
- **Now Playing**: Apple Music via osascript

## License

MIT
