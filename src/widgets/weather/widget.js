import meta from './meta'
import config from './config'
import Component from './index'

export default {
  ...meta,
  version: '1.0.0',
  author: 'Shelf',
  configSchema: config.schema || [],
  secretsSchema: [
    { key: 'openweathermap_key', label: 'OpenWeatherMap API Key', secret: true },
  ],
  component: Component,
}
