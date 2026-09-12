import { app, BrowserWindow, Menu, Tray, shell, dialog } from 'electron'
import { existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findFreePort } from './port-finder.js'
import { ServerManager } from './server-manager.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let serverManager = null
let serverUrl = ''

const isPortable = process.argv.includes('--portable') || Boolean(process.env.DSH_PORTABLE)

/**
 * Windows 首次启动引导：检测是否已有配置，未配置时弹窗引导用户选择数据盘，防止日后塞爆 C 盘
 */
async function checkWindowsDataDirectory(userDataPath) {
  if (process.platform !== 'win32') return
  const configFile = join(userDataPath, 'dsh-home.json')
  if (existsSync(configFile)) return

  const defaultPath = join(userDataPath, 'dsh-data')
  try {
    const choice = await dialog.showMessageBox({
      type: 'question',
      title: '欢迎使用 JackDSH - 存储位置确认',
      message: '请确认数据存储位置',
      detail: `为了防止日后的聊天存档与大模型生成图片占用过多系统盘空间，建议将数据存放在非系统盘（推荐 D 盘）。\n\n默认存储路径：\n${defaultPath}`,
      buttons: ['使用默认路径 (C盘)', '更改存储位置 (推荐 D 盘)'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    })

    if (choice.response === 1) {
      const result = await dialog.showOpenDialog({
        title: '选择 JackDSH 数据存放文件夹 (建议选 D 盘)',
        properties: ['openDirectory', 'createDirectory'],
      })
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedDir = join(result.filePaths[0], 'JackDSH-data')
        mkdirSync(selectedDir, { recursive: true })
        writeFileSync(configFile, JSON.stringify({ dshHome: selectedDir }, null, 2) + '\n')
        console.log(`[JackDSH] Windows custom dshHome configured: ${selectedDir}`)
        return
      }
    }

    // 默认路径：保存配置文件，标记为已确认，下次启动不再重复询问
    writeFileSync(configFile, JSON.stringify({ dshHome: defaultPath }, null, 2) + '\n')
  } catch (err) {
    console.warn(`[JackDSH] Windows data directory prompt skipped: ${err.message}`)
  }
}

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
    title: 'JackDSH',
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
    await checkWindowsDataDirectory(app.getPath('userData'))
    await createWindow()
  } catch (err) {
    console.error('[JackDSH Fatal]', err)
    const logPath = serverManager?.logFile || ''
    const dshHome = serverManager?.dshHome || ''

    const choice = await dialog.showMessageBox({
      type: 'error',
      title: 'JackDSH 启动遇到异常',
      message: '后台服务未能正常就绪',
      detail: `${err.message}\n\n可能存在端口占用、网络代理或旧版配置冲突。建议点击下方按钮查看运行日志排错。`,
      buttons: ['查看运行日志', '打开数据目录自检', '退出应用'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    })

    if (choice.response === 0) {
      if (logPath && existsSync(logPath)) {
        await shell.openPath(logPath)
      } else if (dshHome && existsSync(dshHome)) {
        await shell.openPath(dshHome)
      }
    } else if (choice.response === 1) {
      if (dshHome && existsSync(dshHome)) {
        await shell.openPath(dshHome)
      }
    }
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
