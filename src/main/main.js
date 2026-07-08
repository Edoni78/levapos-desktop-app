import fs from 'node:fs'
import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDatabase, closeDatabase, persist } from './db.js'
import { seedDefaultAdmin } from './services/authService.js'
import { registerIpcHandlers } from './ipcHandlers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

if (process.platform === 'win32') {
  app.setAppUserModelId('com.levapos.desktop')
}

/** Baza SQLite duhet të jetë e shkrueshme — jo brenda app.asar */
function getDataRoot() {
  if (app.isPackaged) return path.join(app.getPath('userData'), 'LEVA FREESHOP')
  return app.getAppPath()
}

function getRendererUrl() {
  if (isDev) return 'http://localhost:5173'
  return path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')
}

/** Ikona e aplikacionit — taskbar / dritare (dev + release) */
function getAppIconPath() {
  const candidates = [
    path.join(process.resourcesPath, 'assets', 'atm.png'),
    path.join(app.getAppPath(), 'src', 'assets', 'atm.png'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return undefined
}

async function createWindow() {
  const iconPath = getAppIconPath()
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    await win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile(getRendererUrl())
  }
}

app.whenReady().then(async () => {
  const iconPath = getAppIconPath()
  if (iconPath && process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(iconPath)
  }

  await initDatabase(getDataRoot())
  seedDefaultAdmin()
  registerIpcHandlers()
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  try {
    persist()
  } catch {
    /* ignore */
  }
  closeDatabase()
})
