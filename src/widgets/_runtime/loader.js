import clockWidget from '../clock/widget'
import spacerWidget from '../spacer/widget'
import systemWidget from '../system/widget'
import weatherWidget from '../weather/widget'
import stocksWidget from '../stocks/widget'
import nowPlayingWidget from '../now-playing/widget'
import felixStatusWidget from '../felix-status/widget'
import calendarWidget from '../calendar/widget'
import displayWidget from '../display/widget'
import volumeWidget from '../volume/widget'
import pageSwitcherWidget from '../page-switcher/widget'

const builtinWidgets = [
  clockWidget,
  spacerWidget,
  systemWidget,
  weatherWidget,
  stocksWidget,
  nowPlayingWidget,
  felixStatusWidget,
  calendarWidget,
  displayWidget,
  volumeWidget,
  pageSwitcherWidget,
]

// Installed widgets (user-installed from ~/.shelf/widgets/<id>/index.js)
const installedWidgets = new Map()

// Initialize with all built-ins
const widgetMap = new Map()
builtinWidgets.forEach((w) => widgetMap.set(w.id, w))

export function getWidget(id) {
  return widgetMap.get(id) || null
}

export function getAllWidgets() {
  return Array.from(widgetMap.values())
}

export function getWidgetMeta(widgetId) {
  const w = widgetMap.get(widgetId)
  if (!w) return null
  return { id: w.id, name: w.name, description: w.description, icon: w.icon, defaultSize: w.defaultSize, sizes: w.sizes }
}

export function getWidgetConfig(widgetId) {
  const w = widgetMap.get(widgetId)
  if (!w) return null
  // Return in the legacy format for compatibility with existing ConfigPanel/SecretsPanel
  const defaults = {}
  for (const field of w.configSchema) {
    if (field.default !== undefined) defaults[field.key] = field.default
  }
  return { defaults, schema: w.configSchema }
}

export function getWidgetComponent(widgetId) {
  const w = widgetMap.get(widgetId)
  return w?.component || null
}

export function isBuiltin(widgetId) {
  return builtinWidgets.some((w) => w.id === widgetId)
}

export function installWidget(widget) {
  installedWidgets.set(widget.id, widget)
  widgetMap.set(widget.id, widget)
}

export function removeWidget(widgetId) {
  if (isBuiltin(widgetId)) return false
  installedWidgets.delete(widgetId)
  widgetMap.delete(widgetId)
  return true
}
