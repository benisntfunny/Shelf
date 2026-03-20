const { app, BrowserWindow, Menu, Tray, screen, nativeImage, Notification } = require('electron')
const path = require('path')
const { execSync } = require('child_process')
const { registerIpcHandlers } = require('./ipc-handlers')

Menu.setApplicationMenu(null)

let barWindow = null
let settingsWindow = null
let tray = null

function findTargetDisplay() {
  const displays = screen.getAllDisplays()
  // Look for Xeneon Edge: 2560x720 physical (1280x360 logical at 2x)
  const xeneon = displays.find((d) => {
    const { width, height } = d.size
    return (width === 1280 && height === 360) || (width === 2560 && height === 720)
  })
  if (xeneon) return xeneon
  // Fallback: smallest height display
  const sorted = [...displays].sort((a, b) => a.size.height - b.size.height)
  return sorted[0]
}

function applyCalibrationProfile() {
  try {
    execSync('/opt/homebrew/bin/m1ddc display 3 set luminance 90')
    execSync('/opt/homebrew/bin/m1ddc display 3 set contrast 60')
    execSync('/opt/homebrew/bin/m1ddc display 3 set red 50')
    execSync('/opt/homebrew/bin/m1ddc display 3 set green 41')
    execSync('/opt/homebrew/bin/m1ddc display 3 set blue 35')
  } catch (e) {
    console.error('Failed to apply calibration profile:', e.message)
  }
}

function createBarWindow(attempt = 0) {
  try {
    const target = findTargetDisplay()

    if (!target || target.size.height > 400) {
      new Notification({
        title: 'Shelf',
        body: 'No Xeneon Edge display detected. Connect the display and restart Shelf.',
      }).show()
      return
    }

    const { x, y, width, height } = target.bounds

    barWindow = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      backgroundColor: '#0f0f0f',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    barWindow.setSimpleFullScreen(true)

    const isDev = !app.isPackaged
    if (isDev) {
      barWindow.loadURL('http://localhost:5173')
    } else {
      barWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
    }

    barWindow.on('closed', () => {
      barWindow = null
    })

    barWindow.once('ready-to-show', () => {
      applyCalibrationProfile()
    })
  } catch (e) {
    console.error(`createBarWindow failed (attempt ${attempt}):`, e.message)
    if (attempt < 3) {
      setTimeout(() => createBarWindow(attempt + 1), 1000)
    }
  }
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  const primary = screen.getPrimaryDisplay()
  const { width, height } = primary.workAreaSize

  settingsWindow = new BrowserWindow({
    width: 900,
    height: 600,
    x: Math.round((width - 900) / 2) + primary.workArea.x,
    y: Math.round((height - 600) / 2) + primary.workArea.y,
    title: 'Shelf Settings',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !app.isPackaged
  if (isDev) {
    settingsWindow.loadURL('http://localhost:5173?mode=settings')
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../../dist/index.html'), {
      query: { mode: 'settings' },
    })
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setTitle('S')
  tray.setToolTip('Shelf')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Settings', click: () => createSettingsWindow() },
    {
      label: 'Restart Bar',
      click: () => {
        if (barWindow) {
          barWindow.close()
        }
        createBarWindow()
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => createSettingsWindow())
}

function notifyBarOfLayoutChange() {
  if (barWindow && !barWindow.isDestroyed()) {
    barWindow.webContents.send('layout-changed')
  }
}

function handleDisplayChange() {
  setTimeout(() => {
    const target = findTargetDisplay()
    if (!target || target.size.height > 400) return

    if (!barWindow || barWindow.isDestroyed()) {
      createBarWindow()
      return
    }

    const { x, y, width, height } = target.bounds
    barWindow.setBounds({ x, y, width, height })
  }, 2000)
}

app.whenReady().then(() => {
  registerIpcHandlers(notifyBarOfLayoutChange)
  createTray()
  createBarWindow()

  screen.on('display-metrics-changed', handleDisplayChange)
  screen.on('display-removed', handleDisplayChange)
  screen.on('display-added', handleDisplayChange)
})

app.on('activate', () => {
  if (!barWindow || barWindow.isDestroyed()) createBarWindow()
})

app.on('window-all-closed', () => {
  // Keep running in tray
})
