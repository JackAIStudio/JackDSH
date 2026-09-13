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
 * 跨平台首次启动数据存储引导与外接盘容错保护
 * 支持 Windows 引导避开 C 盘、macOS 引导使用专用存储（不占 iCloud / 支持外接移动硬盘）
 */
async function checkDataDirectory(userDataPath) {
  const configFile = join(userDataPath, 'dsh-home.json')
  const defaultPath = join(userDataPath, 'dsh-data')

  // 1. 若已有配置，检查目标路径是否可用（防止外接移动硬盘被拔掉导致崩溃）
  if (existsSync(configFile)) {
    try {
      const parsed = JSON.parse(readFileSync(configFile, 'utf8'))
      const configuredPath = parsed?.dshHome
      if (configuredPath && !existsSync(configuredPath)) {
        const choice = await dialog.showMessageBox({
          type: 'warning',
          title: 'JackDSH - 数据存储目录未就绪',
          message: '未检测到配置的数据存储路径',
          detail: `当前配置的存储路径不可访问：\n${configuredPath}\n\n如果你使用的是外接移动硬盘，请连接后再点击「重试」；或者你可以选择临时使用本机默认目录启动。`,
          buttons: ['重试', '临时使用默认目录', '退出应用'],
          defaultId: 0,
          cancelId: 2,
          noLink: true,
        })
        if (choice.response === 0) {
          return checkDataDirectory(userDataPath)
        } else if (choice.response === 1) {
          mkdirSync(defaultPath, { recursive: true })
          return defaultPath
        } else {
          app.quit()
          return null
        }
      }
    } catch {}
    return
  }

  // 2. 首次启动引导
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'
  if (!isMac && !isWin) return

  const title = '欢迎使用 JackDSH - 存储位置确认'
  const message = '请确认数据与聊天存档存储位置'
  const detail = isMac
    ? `为了防止日后积累的聊天记录、大模型生成的高清图片与音视频塞满系统盘，建议确认数据存放位置。\n\n默认存储路径：\n${defaultPath}\n\n你也可以指定存储文件夹（支持外接移动硬盘，如 /Volumes/...，且绝不占用 iCloud 同步空间）。`
    : `为了防止日后的聊天存档与大模型生成图片占用过多系统盘空间，建议将数据存放在非系统盘（推荐 D 盘）。\n\n默认存储路径：\n${defaultPath}`

  const buttons = isMac
    ? ['使用默认路径 (推荐)', '更改存储位置 (外接盘/自定义)']
    : ['使用默认路径 (C盘)', '更改存储位置 (推荐 D 盘)']

  try {
    const choice = await dialog.showMessageBox({
      type: 'question',
      title,
      message,
      detail,
      buttons,
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    })

    if (choice.response === 1) {
      const result = await dialog.showOpenDialog({
        title: isMac ? '选择 JackDSH 数据存放文件夹 (支持外接移动硬盘)' : '选择 JackDSH 数据存放文件夹 (建议选 D 盘)',
        properties: ['openDirectory', 'createDirectory'],
      })
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedDir = join(result.filePaths[0], 'JackDSH-data')
        mkdirSync(selectedDir, { recursive: true })
        writeFileSync(configFile, JSON.stringify({ dshHome: selectedDir }, null, 2) + '\n')
        console.log(`[JackDSH] Custom dshHome configured: ${selectedDir}`)
        return
      }
    }

    // 默认路径：保存配置文件，标记为已确认，下次启动不再重复询问
    mkdirSync(defaultPath, { recursive: true })
    writeFileSync(configFile, JSON.stringify({ dshHome: defaultPath }, null, 2) + '\n')
  } catch (err) {
    console.warn(`[JackDSH] Data directory prompt skipped: ${err.message}`)
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
    app.setAboutPanelOptions({
      applicationName: 'JackDSH',
      applicationVersion: `v${app.getVersion()}`,
      version: 'DeepSeek Harness 底座 v0.1.2-rc.1',
      copyright: 'JackAIStudio · 基于 DeepSeek Harness 官方框架构建',
    })
    await checkDataDirectory(app.getPath('userData'))
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
