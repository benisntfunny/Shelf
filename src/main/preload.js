const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('shelf', {
  getLayout: () => ipcRenderer.invoke('get-layout'),
  saveLayout: (config) => ipcRenderer.invoke('save-layout', config),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  getSystemStatsFull: () => ipcRenderer.invoke('get-system-stats-full'),
  getNowPlaying: () => ipcRenderer.invoke('get-now-playing'),
  musicCommand: (cmd) => ipcRenderer.invoke('music-command', cmd),
  getPlaylists: () => ipcRenderer.invoke('get-playlists'),
  getPlaylistTracks: (name) => ipcRenderer.invoke('get-playlist-tracks', name),
  playTrack: ({ name, artist }) => ipcRenderer.invoke('play-track', { name, artist }),
  getAlbumArt: ({ album, artist }) => ipcRenderer.invoke('get-album-art', { album, artist }),
  searchTracks: (query) => ipcRenderer.invoke('search-tracks', query),
  getStocks: (tickers) => ipcRenderer.invoke('get-stocks', tickers),
  getWeather: (opts) => ipcRenderer.invoke('get-weather', opts),
  getWeatherByCity: (opts) => ipcRenderer.invoke('get-weather-by-city', opts),
  getVolume: () => ipcRenderer.invoke('get-volume'),
  setVolume: (opts) => ipcRenderer.invoke('set-volume', opts),
  geocodeCity: (name) => ipcRenderer.invoke('geocode-city', name),
  displaySet: (opts) => ipcRenderer.invoke('display-set', opts),
  displayGet: () => ipcRenderer.invoke('display-get'),
  fetchUrl: (url) => ipcRenderer.invoke('fetch-url', url),
  getCalendarEvents: () => ipcRenderer.invoke('get-calendar-events'),
  getSecrets: () => ipcRenderer.invoke('get-secrets'),
  saveSecrets: (secrets) => ipcRenderer.invoke('save-secrets', secrets),
  listShortcuts: () => ipcRenderer.invoke('list-shortcuts'),
  runShortcut: (name) => ipcRenderer.invoke('run-shortcut', name),
  launchAction: (action) => ipcRenderer.invoke('launch-action', action),
  getPages: () => ipcRenderer.invoke('get-pages'),
  setActivePage: (pageId) => ipcRenderer.invoke('set-active-page', pageId),
  onPageChanged: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('page-changed', handler)
    return () => ipcRenderer.removeListener('page-changed', handler)
  },
  getWindowMode: () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mode') || 'bar'
  },
  onLayoutChanged: (callback) => {
    ipcRenderer.on('layout-changed', callback)
    return () => ipcRenderer.removeListener('layout-changed', callback)
  },
})
