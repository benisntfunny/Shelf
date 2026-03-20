const { app } = require('electron')
const fs = require('fs')
const path = require('path')

const CONFIG_DIR = path.join(app.getPath('home'), '.shelf')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')
const SECRETS_PATH = path.join(CONFIG_DIR, 'secrets.json')

const DEFAULT_CONFIG = {
  widgets: [
    { id: 'clock-1', widgetId: 'clock', size: 'sm', config: {} },
    { id: 'spacer-1', widgetId: 'spacer', size: 'md', config: {} },
    { id: 'system-1', widgetId: 'system', size: 'md', config: {} },
  ],
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
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return DEFAULT_CONFIG
  }
}

function saveConfig(config) {
  ensureDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
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
  fs.writeFileSync(SECRETS_PATH, JSON.stringify(secrets, null, 2))
}

module.exports = { loadConfig, saveConfig, loadSecrets, saveSecrets }
