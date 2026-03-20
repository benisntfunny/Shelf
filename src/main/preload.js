const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('shelf', {
  getLayout: () => ipcRenderer.invoke('get-layout'),
  saveLayout: (config) => ipcRenderer.invoke('save-layout', config),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  getNowPlaying: () => ipcRenderer.invoke('get-now-playing'),
  musicCommand: (cmd) => ipcRenderer.invoke('music-command', cmd),
  getPlaylists: () => ipcRenderer.invoke('get-playlists'),
  getPlaylistTracks: (name) => ipcRenderer.invoke('get-playlist-tracks', name),
  playTrack: ({ name, artist }) => ipcRenderer.invoke('play-track', { name, artist }),
  getAlbumArt: ({ album, artist }) => ipcRenderer.invoke('get-album-art', { album, artist }),
  searchTracks: (query) => ipcRenderer.invoke('search-tracks', query),
  getStocks: (tickers) => ipcRenderer.invoke('get-stocks', tickers),
  getWeather: (opts) => ipcRenderer.invoke('get-weather', opts),
  displaySet: (opts) => ipcRenderer.invoke('display-set', opts),
  displayGet: () => ipcRenderer.invoke('display-get'),
  fetchUrl: (url) => ipcRenderer.invoke('fetch-url', url),
  getCalendarEvents: () => ipcRenderer.invoke('get-calendar-events'),
  getSecrets: () => ipcRenderer.invoke('get-secrets'),
  saveSecrets: (secrets) => ipcRenderer.invoke('save-secrets', secrets),
  getWindowMode: () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mode') || 'bar'
  },
  onLayoutChanged: (callback) => {
    ipcRenderer.on('layout-changed', callback)
    return () => ipcRenderer.removeListener('layout-changed', callback)
  },
})
