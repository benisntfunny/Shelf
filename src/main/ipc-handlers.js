const { ipcMain } = require('electron')
const { execSync } = require('child_process')
const { loadConfig, saveConfig, loadSecrets, saveSecrets } = require('./config-store')
const { getSystemStats } = require('./system-stats')
const { getNowPlaying, musicCommand } = require('./apple-music')
const { getStockQuotes } = require('./stocks-api')
const { getWeather } = require('./weather-api')
const { getCalendarEvents } = require('./calendar')

function registerIpcHandlers(notifyBarOfLayoutChange) {
  ipcMain.handle('get-layout', () => {
    return loadConfig()
  })

  ipcMain.handle('save-layout', (_event, config) => {
    saveConfig(config)
    if (notifyBarOfLayoutChange) notifyBarOfLayoutChange()
    return { ok: true }
  })

  ipcMain.handle('get-system-stats', () => {
    return getSystemStats()
  })

  ipcMain.handle('get-now-playing', () => {
    return getNowPlaying()
  })

  ipcMain.handle('music-command', (_event, cmd) => {
    return musicCommand(cmd)
  })

  ipcMain.handle('get-stocks', (_event, tickers) => {
    return getStockQuotes(tickers)
  })

  ipcMain.handle('get-weather', (_event, { lat, lon, units }) => {
    return getWeather(lat, lon, units)
  })

  ipcMain.handle('get-calendar-events', () => {
    return getCalendarEvents()
  })

  ipcMain.handle('get-secrets', () => {
    return loadSecrets()
  })

  ipcMain.handle('save-secrets', (_event, secrets) => {
    saveSecrets(secrets)
    return { ok: true }
  })

  ipcMain.handle('display-set', (_event, { property, value }) => {
    const allowed = ['luminance', 'contrast', 'red', 'green', 'blue']
    if (!allowed.includes(property)) return { error: 'invalid property' }
    try {
      execSync(`/opt/homebrew/bin/m1ddc display 3 set ${property} ${value}`)
      return { ok: true }
    } catch (e) {
      return { error: e.message }
    }
  })

  ipcMain.handle('display-get', () => {
    const props = ['luminance', 'contrast', 'red', 'green', 'blue']
    const result = {}
    for (const prop of props) {
      try {
        const out = execSync(`/opt/homebrew/bin/m1ddc display 3 get ${prop}`, { encoding: 'utf8' })
        result[prop] = parseInt(out.trim(), 10)
      } catch {
        result[prop] = 0
      }
    }
    return result
  })

  ipcMain.handle('fetch-url', async (_event, url) => {
    const https = require('https')
    const http = require('http')
    const mod = url.startsWith('https') ? https : http
    return new Promise((resolve) => {
      mod.get(url, { headers: { 'User-Agent': 'Shelf/1.0' } }, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      }).on('error', () => resolve({ status: 0, body: '' }))
    })
  })
}

module.exports = { registerIpcHandlers }
