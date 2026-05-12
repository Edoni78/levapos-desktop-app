import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDatabase, closeDatabase, persist } from './db.js'
import { seedDefaultAdmin } from './services/authService.js'
import { registerIpcHandlers } from './ipcHandlers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

/** Baza SQLite duhet të jetë e shkrueshme — jo brenda app.asar */
function getDataRoot() {
  if (app.isPackaged) return path.join(app.getPath('userData'), 'LevaPOS')
  return app.getAppPath()
}

function getRendererUrl() {
  if (isDev) return 'http://localhost:5173'
  return path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
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
