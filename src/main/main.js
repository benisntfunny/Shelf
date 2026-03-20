const { app, BrowserWindow, Menu, Tray, screen, nativeImage, Notification, globalShortcut } = require('electron')
const path = require('path')
const { execSync, spawn } = require('child_process')
const { registerIpcHandlers } = require('./ipc-handlers')

// Enable touch support
app.commandLine.appendSwitch('touch-events', 'enabled')
app.commandLine.appendSwitch('enable-features', 'TouchpadAndWheelScrollLatching,AsyncWheelEvents')

Menu.setApplicationMenu(null)

let barWindow = null
let settingsWindow = null
let tray = null
let touchRemapProcess = null

function findTargetDisplay() {
  const displays = screen.getAllDisplays()
  console.log('[Shelf] All displays:')
  displays.forEach((d, i) => {
    console.log(`  [${i}] id=${d.id} size=${d.size.width}x${d.size.height} bounds=(${d.bounds.x},${d.bounds.y},${d.bounds.width},${d.bounds.height}) scaleFactor=${d.scaleFactor}`)
  })
  // Look for Xeneon Edge: 2560x720 physical (1280x360 logical at 2x)
  const xeneon = displays.find((d) => {
    const { width, height } = d.size
    return (width === 1280 && height === 360) || (width === 2560 && height === 720)
  })
  if (xeneon) {
    console.log(`[Shelf] Found Xeneon: id=${xeneon.id} bounds=(${xeneon.bounds.x},${xeneon.bounds.y},${xeneon.bounds.width},${xeneon.bounds.height})`)
    return xeneon
  }
  // Fallback: smallest height display
  const sorted = [...displays].sort((a, b) => a.size.height - b.size.height)
  console.log(`[Shelf] No Xeneon found, falling back to smallest display: id=${sorted[0].id} size=${sorted[0].size.width}x${sorted[0].size.height}`)
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

    if (!target || target.size.height > 720) {
      new Notification({
        title: 'Shelf',
        body: 'No Xeneon Edge display detected. Connect the display and restart Shelf.',
      }).show()
      return
    }

    const { x, y, width, height } = target.bounds
    console.log(`[Shelf] Creating bar window at x=${x} y=${y} w=${width} h=${height}`)

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

    const isDev = !!process.env.SHELF_DEV
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

  const isDev = !!process.env.SHELF_DEV
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
  const iconPath = path.join(__dirname, '../../assets/icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  icon.setTemplateImage(true)
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
    if (!target || target.size.height > 720) return

    if (!barWindow || barWindow.isDestroyed()) {
      createBarWindow()
      return
    }

    const { x, y, width, height } = target.bounds
    barWindow.setBounds({ x, y, width, height })
  }, 2000)
}

function startTouchRemap() {
  if (touchRemapProcess) {
    touchRemapProcess.kill()
    touchRemapProcess = null
  }

  // In dev: native/touch-remap relative to project root
  // In packaged app: Resources/native/touch-remap
  const binaryPath = app.isPackaged
    ? path.join(process.resourcesPath, 'native', 'touch-remap')
    : path.join(__dirname, '../../native/touch-remap')
  const fs = require('fs')
  if (!fs.existsSync(binaryPath)) {
    console.log('[Shelf] Touch remapper binary not found at', binaryPath)
    return
  }

  const target = findTargetDisplay()
  if (!target) return

  const { x, y, width, height } = target.bounds
  console.log(`[Shelf] Starting touch remapper for display at (${x}, ${y}) ${width}x${height}`)

  touchRemapProcess = spawn(binaryPath, [String(x), String(y), String(width), String(height)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  touchRemapProcess.stdout.on('data', (data) => {
    const msg = data.toString().trim()
    if (msg === 'READY') {
      console.log('[Shelf] Touch remapper is active')
    }
  })

  touchRemapProcess.stderr.on('data', (data) => {
    console.log('[Shelf] touch-remap:', data.toString().trim())
  })

  touchRemapProcess.on('exit', (code) => {
    console.log(`[Shelf] Touch remapper exited with code ${code}`)
    touchRemapProcess = null
  })
}

app.whenReady().then(() => {
  registerIpcHandlers(notifyBarOfLayoutChange)
  createTray()
  createBarWindow()
  startTouchRemap()

  screen.on('display-metrics-changed', handleDisplayChange)
  screen.on('display-removed', handleDisplayChange)
  screen.on('display-added', handleDisplayChange)

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    createSettingsWindow()
  })
})

app.on('will-quit', () => {
  if (touchRemapProcess) {
    touchRemapProcess.kill()
    touchRemapProcess = null
  }
})

app.on('activate', () => {
  if (!barWindow || barWindow.isDestroyed()) createBarWindow()
})

app.on('window-all-closed', () => {
  // Keep running in tray
})
