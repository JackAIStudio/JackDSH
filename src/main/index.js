import { app, BrowserWindow, Menu, Tray, shell, dialog } from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findFreePort } from './port-finder.js'
import { ServerManager } from './server-manager.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let serverManager = null
let serverUrl = ''

const isPortable = process.argv.includes('--portable') || Boolean(process.env.DSH_PORTABLE)

// 单实例锁：防止多开或子进程误开导致 Dock 图标泛滥
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

async function createWindow() {
  const freePort = await findFreePort(3180)

  serverManager = new ServerManager({
    port: freePort,
    isPortable,
    appDataPath: app.getPath('userData'),
    runtimePath: app.isPackaged
      ? join(process.resourcesPath, 'runtime')
      : join(__dirname, '../../bundle-runtime'),
  })

  serverUrl = await serverManager.start()

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'Jack DSH Studio',
    backgroundColor: '#18181b',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 外部链接默认用系统默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron Window] did-finish-load: URL loaded successfully:', serverUrl)
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron Window] did-fail-load:', errorCode, errorDescription, validatedURL)
  })

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer Console]', message)
  })

  mainWindow.loadURL(serverUrl)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    await createWindow()
  } catch (err) {
    dialog.showErrorBox('启动失败', `DeepSeek Harness Desktop 无法启动: ${err.message}`)
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  if (serverManager) {
    serverManager.stop()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
