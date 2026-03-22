const { app } = require('electron')
const fs = require('fs')
const path = require('path')

const CONFIG_DIR = path.join(app.getPath('home'), '.shelf')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')
const SECRETS_PATH = path.join(CONFIG_DIR, 'secrets.json')

const CURRENT_VERSION = 2

const SIZE_MIGRATION = {
  xs: '1x6', sm: '2x6', md: '3x6', lg: '4x6', xl: '6x6', full: '12x6', fill: '2x6'
}

function migrateWidgetSizes(widgets) {
  return widgets.map(w => {
    if (SIZE_MIGRATION[w.size]) {
      return { ...w, size: SIZE_MIGRATION[w.size] }
    }
    const match = (w.size || '').match(/^(\d+)x3$/)
    if (match) {
      return { ...w, size: `${match[1]}x6` }
    }
    return w
  })
}

function migrateConfig(config) {
  if (!config) return null
  if (config._version >= CURRENT_VERSION) return config

  let result = { ...config }

  // Size migration within widgets (flat or paged)
  if (result.pages) {
    result.pages = result.pages.map(page => ({
      ...page,
      widgets: migrateWidgetSizes(page.widgets || [])
    }))
  } else if (result.widgets) {
    // Flat → paged migration (preserves other top-level config fields)
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

const DEFAULT_CONFIG = {
  _version: CURRENT_VERSION,
  pages: [
    {
      id: 'page-1',
      name: 'Dashboard',
      triggerApp: null,
      widgets: [
        { id: 'clock-1', widgetId: 'clock', size: '2x6', col: 1, row: 1, config: {} },
      ]
    }
  ],
  activePage: 'page-1'
}

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

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
      saveConfig(migrated)
    }
    return migrated
  } catch {
    return DEFAULT_CONFIG
  }
}

function saveConfig(config) {
  ensureDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 })
}

function loadSecrets() {
  ensureDir()
  if (!fs.existsSync(SECRETS_PATH)) {
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function saveSecrets(secrets) {
  ensureDir()
  fs.writeFileSync(SECRETS_PATH, JSON.stringify(secrets, null, 2), { mode: 0o600 })
}

module.exports = { loadConfig, saveConfig, loadSecrets, saveSecrets }
