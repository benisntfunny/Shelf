const { ipcMain } = require('electron')
const { execSync } = require('child_process')
const { loadConfig, saveConfig, loadSecrets, saveSecrets } = require('./config-store')
const { getSystemStats } = require('./system-stats')
const { getNowPlaying, musicCommand, getPlaylists, getPlaylistTracks, playTrack, getAlbumArtByName, searchTracks } = require('./apple-music')
const { getStockQuotes } = require('./stocks-api')
const { getWeather, getWeatherByCity, geocodeCity } = require('./weather-api')
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

  ipcMain.handle('get-playlists', () => {
    return getPlaylists()
  })

  ipcMain.handle('get-playlist-tracks', (_event, name) => {
    return getPlaylistTracks(name)
  })

  ipcMain.handle('play-track', (_event, { name, artist }) => {
    return playTrack(name, artist)
  })

  ipcMain.handle('get-album-art', (_event, { album, artist }) => {
    return getAlbumArtByName(album, artist)
  })

  ipcMain.handle('search-tracks', (_event, query) => {
    return searchTracks(query)
  })

  ipcMain.handle('get-stocks', (_event, tickers) => {
    return getStockQuotes(tickers)
  })

  ipcMain.handle('get-weather', (_event, { lat, lon, units }) => {
    return getWeather(lat, lon, units)
  })

  ipcMain.handle('get-weather-by-city', (_event, { city, units }) => {
    return getWeatherByCity(city, units)
  })

  ipcMain.handle('geocode-city', (_event, name) => {
    return geocodeCity(name)
  })

  ipcMain.handle('get-volume', async () => {
    try {
      const { execSync } = require('child_process')
      const volume = parseInt(execSync('osascript -e "output volume of (get volume settings)"').toString().trim(), 10)
      const muted = execSync('osascript -e "output muted of (get volume settings)"').toString().trim() === 'true'
      return { volume, muted }
    } catch {
      return { volume: 50, muted: false }
    }
  })

  ipcMain.handle('set-volume', (_event, { volume, muted }) => {
    try {
      const { execSync } = require('child_process')
      if (volume !== undefined) execSync(`osascript -e "set volume output volume ${Math.round(volume)}"`)
      if (muted !== undefined) execSync(`osascript -e "set volume output muted ${muted}"`)
    } catch (e) {
      console.error('[Shelf] set-volume failed:', e.message)
    }
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

  ipcMain.handle('get-pages', () => {
    const config = loadConfig()
    return { pages: config.pages || [], activePage: config.activePage }
  })

  ipcMain.handle('set-active-page', (_event, pageId) => {
    const config = loadConfig()
    config.activePage = pageId
    saveConfig(config)
    if (notifyBarOfLayoutChange) notifyBarOfLayoutChange()
    return { ok: true }
  })

  ipcMain.handle('list-shortcuts', async () => {
    try {
      const { execSync } = require('child_process')
      const output = execSync('shortcuts list', { encoding: 'utf-8', timeout: 5000 })
      return output.trim().split('\n').filter(Boolean)
    } catch {
      return []
    }
  })

  ipcMain.handle('run-shortcut', async (_event, name) => {
    try {
      const { exec } = require('child_process')
      return new Promise((resolve) => {
        exec(`shortcuts run "${name.replace(/"/g, '\\"')}"`, { timeout: 30000 }, (err, stdout) => {
          resolve({ ok: !err, output: stdout || '' })
        })
      })
    } catch {
      return { ok: false, output: '' }
    }
  })

  ipcMain.handle('launch-action', async (_event, { type, value }) => {
    try {
      const { exec } = require('child_process')
      let cmd
      if (type === 'app') cmd = `open "${value.replace(/"/g, '\\"')}"`
      else if (type === 'url') cmd = `open "${value.replace(/"/g, '\\"')}"`
      else if (type === 'shell') cmd = value
      else return { ok: false }
      return new Promise((resolve) => {
        exec(cmd, { timeout: 10000 }, (err) => resolve({ ok: !err }))
      })
    } catch {
      return { ok: false }
    }
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
