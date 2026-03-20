import clockMeta from './clock/meta'
import clockConfig from './clock/config'
import spacerMeta from './spacer/meta'
import spacerConfig from './spacer/config'
import systemMeta from './system/meta'
import systemConfig from './system/config'
import weatherMeta from './weather/meta'
import weatherConfig from './weather/config'
import stocksMeta from './stocks/meta'
import stocksConfig from './stocks/config'
import nowPlayingMeta from './now-playing/meta'
import nowPlayingConfig from './now-playing/config'
import felixStatusMeta from './felix-status/meta'
import felixStatusConfig from './felix-status/config'
import calendarMeta from './calendar/meta'
import calendarConfig from './calendar/config'

import Clock from './clock/index'
import Spacer from './spacer/index'
import System from './system/index'
import Weather from './weather/index'
import Stocks from './stocks/index'
import NowPlaying from './now-playing/index'
import FelixStatus from './felix-status/index'
import Calendar from './calendar/index'

const widgets = [
  { meta: clockMeta, config: clockConfig, component: Clock },
  { meta: spacerMeta, config: spacerConfig, component: Spacer },
  { meta: systemMeta, config: systemConfig, component: System },
  { meta: weatherMeta, config: weatherConfig, component: Weather },
  { meta: stocksMeta, config: stocksConfig, component: Stocks },
  { meta: nowPlayingMeta, config: nowPlayingConfig, component: NowPlaying },
  { meta: felixStatusMeta, config: felixStatusConfig, component: FelixStatus },
  { meta: calendarMeta, config: calendarConfig, component: Calendar },
]

export function getAllWidgets() {
  return widgets.map((w) => w.meta)
}

export function getWidgetMeta(widgetId) {
  return widgets.find((w) => w.meta.id === widgetId)?.meta
}

export function getWidgetConfig(widgetId) {
  return widgets.find((w) => w.meta.id === widgetId)?.config
}

export function getWidgetComponent(widgetId) {
  return widgets.find((w) => w.meta.id === widgetId)?.component
}
