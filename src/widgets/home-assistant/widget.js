import meta from './meta'
import config from './config'
import Component from './index'

export default {
  ...meta,
  version: '1.0.0',
  author: 'Shelf',
  configSchema: config.schema || [],
  secretsSchema: [
    { key: 'ha_url', label: 'Home Assistant URL', placeholder: 'http://homeassistant.local:8123' },
    { key: 'ha_token', label: 'Home Assistant Token', secret: true },
  ],
  component: Component,
}
