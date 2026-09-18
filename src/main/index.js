import { app, BrowserWindow, Menu, Tray, shell, dialog, clipboard, ipcMain } from 'electron'
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findFreePort } from './port-finder.js'
import { ServerManager, augmentGlobalPath } from './server-manager.js'
import { encodeRelayToken, parseRelayToken } from './relay-token.js'

// 在启动初期增强 PATH，解决 macOS/Linux GUI 应用丢失终端环境变量的通病
augmentGlobalPath()

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let serverManager = null
let serverUrl = ''

const isPortable = process.argv.includes('--portable') || Boolean(process.env.DSH_PORTABLE)
const isPreview = process.env.JACKDSH_ENV === 'preview'
  || app.getName().includes('Preview')
  || process.execPath.includes('Preview')
  || (process.resourcesPath && process.resourcesPath.includes('Preview'))
  || process.argv.includes('--preview')

// 设置应用身份标识与单实例命名空间（Preview 与 Prod 拥有独立数据目录与单实例锁，支持双开互不干扰）
if (isPreview) {
  app.setName('JackDSH Preview')
  const previewUserData = join(app.getPath('appData'), 'jackdsh-preview')
  app.setPath('userData', previewUserData)
  app.setAppUserModelId('com.jackaistudio.jackdsh.preview')
} else {
  app.setAppUserModelId('com.jackaistudio.jackdsh')
}

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

  // 2. 默认静默就绪：零阻塞弹窗，直接确保默认数据目录就绪
  mkdirSync(defaultPath, { recursive: true })
}

// 单实例锁：防止同通道多开或子进程误开导致 Dock 图标泛滥（Preview 与 Prod 拥有独立通道锁，支持双开互不干扰）
const gotTheLock = app.requestSingleInstanceLock({ channel: isPreview ? 'preview' : 'prod' })
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

// 全局响应渲染层顶栏智能双击事件：安全切换窗口最大化与还原（macOS 原生 Zoom）
ipcMain.on('jackdsh:window-toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win.isDestroyed()) return
  if (process.platform === 'darwin') {
    if (win.isFullScreen()) {
      win.setFullScreen(false)
    } else if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  } else {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

// ==================== 原生 Dock 未读红点角标管理 ====================

/**
 * 设置或清空应用程序的程序坞未读红点角标（Badge）
 * 极简免权限设计：在 macOS 上基于 NSDockTile 原生特性，100% 免系统授权，零打扰、开箱即用
 */
function updateAppBadge(count) {
  const num = Math.max(0, Math.floor(Number(count) || 0))

  // 1. 系统级原生 setBadgeCount (Electron 官方跨平台 API)
  if (typeof app.setBadgeCount === 'function') {
    try { app.setBadgeCount(num) } catch {}
  }

  // 2. macOS 原生 app.dock.setBadge（纯正红底白字数字标，免授权、零打扰）
  if (process.platform === 'darwin' && app.dock) {
    try {
      app.dock.setBadge(num > 0 ? String(num) : '')
    } catch {}
  }
}

// 全局响应应用未读通知角标设置事件
ipcMain.on('jackdsh:set-badge', (_event, count) => {
  updateAppBadge(count)
})

/**
 * 为 macOS 沉浸式标题栏（hiddenInset）注入精细化拖拽支持与交互防护：
 * 1. 顶部全局挂载弹性拖拽条：新会话空白页提供 38px 宽裕拖拽，有会话顶栏时收敛为 6px 边缘抓手；
 * 2. 侧栏顶栏让出交通灯宽度（约 78px），支持大面积拖拽；
 * 3. 会话顶栏：整行开启拖拽，特别将不可点击的当前会话标题（crumbCurrent）也赋予拖拽能力，大幅拓宽拖拽面积；
 * 4. 交互控件精准隔离：只将真正的交互控件（Tab、按钮、链接、输入框等）设为 no-drag；
 * 5. 模态弹窗深度隔离：弹窗存在时彻底静默所有背景拖拽，保证设置中心与「打开配置文件」等 100% 灵敏；
 * 6. 顶栏双击放大变小由 preload 的 dblclick 监听器安全接管，与拖拽区域彻底解绑。
 */
function setupMacWindowDrag(win) {
  if (process.platform !== 'darwin') return

  const titlebarCss = `
    /* 1. 顶部兜底拖拽条：新会话空白页时 38px 宽裕拖拽，有会话顶栏时收敛为 6px 边缘微缝 */
    #jackdsh-titlebar-drag-strip {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 38px;
      z-index: 10;
      -webkit-app-region: drag;
    }
    :has(header:not([class*="headerHidden"])) #jackdsh-titlebar-drag-strip,
    :has([class*="wSkVaW_header"]:not([class*="headerHidden"])) #jackdsh-titlebar-drag-strip {
      height: 6px;
    }

    /* 2. 侧栏顶栏：允许拖拽，展开时避让交通灯宽度（78px） */
    [class*="logoRow"] {
      -webkit-app-region: drag !important;
    }
    [class*="logoRow"]:not([class*="collapsed"] *) {
      padding-left: 78px !important;
    }
    [class*="collapsed"] [class*="logoRow"] {
      margin-top: 28px !important;
    }

    /* 侧栏顶栏内交互元素禁止拖拽（保持折叠按钮等点击灵敏） */
    [class*="logoRow"] button,
    [class*="logoRow"] a,
    [class*="logoRow"] input,
    [class*="logoRow"] [role="button"] {
      -webkit-app-region: no-drag !important;
    }

    /* 3. 会话顶栏区域：允许整行与留白区域顺畅拖拽 */
    header,
    [class*="wSkVaW_header"] {
      -webkit-app-region: drag !important;
    }

    /* 会话标题文字：当前会话标题是不可点击的展示文本，明确赋予拖拽能力，随手抓取即可移动窗口 */
    [class*="crumbCurrent"],
    [class*="wSkVaW_crumbCurrent"],
    button[class*="crumb"][disabled] {
      -webkit-app-region: drag !important;
      cursor: default !important;
    }

    /* 4. 交互控件精准隔离（绝不误杀容器留白，确保点击 100% 灵敏） */
    button:not([class*="crumbCurrent"]):not([disabled][class*="crumb"]),
    a,
    input,
    select,
    textarea,
    [role="button"],
    [role="tab"],
    [role="menuitem"],
    [role="combobox"],
    [class*="iconButton"],
    [class*="close"],
    [class*="actions"],
    [class*="tab"]:not([class*="crumbCurrent"]),
    [class*="wSkVaW_tab"],
    [class*="headerActions"] button,
    [class*="headerUtilities"] button {
      -webkit-app-region: no-drag !important;
    }

    /* 5. 模态弹窗绝对防护（设置中心、打开配置文件、目录选择、导出等） */
    [role="dialog"],
    [role="dialog"] *,
    [aria-modal="true"],
    [aria-modal="true"] * {
      -webkit-app-region: no-drag !important;
    }

    /* 模态互斥：只要存在真实的弹窗，立刻隐藏顶部遮罩条并冻结背景拖拽 */
    body:has([role="dialog"]) #jackdsh-titlebar-drag-strip,
    body:has([aria-modal="true"]) #jackdsh-titlebar-drag-strip {
      display: none !important;
    }
    body:has([role="dialog"]) header,
    body:has([role="dialog"]) [class*="wSkVaW_header"],
    body:has([aria-modal="true"]) header,
    body:has([aria-modal="true"]) [class*="wSkVaW_header"] {
      -webkit-app-region: no-drag !important;
    }
  `

  const inject = async () => {
    try {
      await win.webContents.insertCSS(titlebarCss)
      await win.webContents.executeJavaScript(`
        (() => {
          if (!document.getElementById('jackdsh-titlebar-drag-strip')) {
            const strip = document.createElement('div');
            strip.id = 'jackdsh-titlebar-drag-strip';
            document.body.prepend(strip);
          }
        })()
      `).catch(() => {})
    } catch (err) {
      console.warn('[JackDSH] Failed to inject mac titlebar style:', err.message)
    }
  }

  win.webContents.on('dom-ready', inject)
  win.webContents.on('did-finish-load', inject)
}

function setupApplicationMenu(win) {
  const isMac = process.platform === 'darwin'
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: '文件',
      submenu: [
        {
          label: '打开数据存储目录',
          click: () => {
            if (serverManager?.dshHome) shell.openPath(serverManager.dshHome)
          },
        },
        {
          label: '打开运行日志',
          click: () => {
            if (serverManager?.logFile) shell.openPath(serverManager.logFile)
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: '公网远程中转',
      submenu: [
        {
          label: '查看中转连接状态',
          click: async () => {
            const status = serverManager?.tunnelClient?.getStatus() || { connected: false }
            const config = serverManager?.getRelayConfig() || {}
            dialog.showMessageBox(win, {
              type: status.connected ? 'info' : 'warning',
              title: '公网远程中转状态',
              message: status.connected ? '🟢 公网中继已连接' : '⚪️ 公网中继未连接',
              detail: `服务端: ${config.server || '未配置'}\n公网入口: ${config.publicBaseUrl || '自适应'}\n本地端口: ${serverManager?.port || 'N/A'}\n最近连接时间: ${status.lastConnectedAt || '无'}\n当前活动请求数: ${status.activeRequests || 0}${status.lastError ? '\n最近报错: ' + status.lastError : ''}`,
            })
          },
        },
        { type: 'separator' },
        {
          label: '从剪贴板导入中转口令 (Magic Token)...',
          click: async () => {
            const clipText = clipboard.readText().trim()
            let parsedConfig = null
            try {
              if (clipText) {
                parsedConfig = parseRelayToken(clipText)
              }
            } catch {}

            if (parsedConfig) {
              const res = await dialog.showMessageBox(win, {
                type: 'question',
                title: '检测到中转口令',
                message: '是否立即导入并激活剪贴板中的中转配置？',
                detail: `服务端: ${parsedConfig.server}\n公网入口: ${parsedConfig.publicBaseUrl || '自适应'}`,
                buttons: ['立即导入并激活', '取消'],
                defaultId: 0,
                cancelId: 1,
              })
              if (res.response === 0) {
                serverManager.saveRelayConfig(parsedConfig)
                await dialog.showMessageBox(win, {
                  type: 'info',
                  title: '导入成功',
                  message: '公网中继配置已生效并自动连通！',
                  detail: '手机远程已同步注入公网地址，扫码即可直接连接。',
                })
              }
            } else {
              await dialog.showMessageBox(win, {
                type: 'info',
                title: '导入中转口令',
                message: '未在剪贴板中检测到有效的 jds://relay 口令',
                detail: '请先在家里电脑复制中转口令，或使用命令行：\nnode tools/relay/token-cli.mjs import "<口令>"',
              })
            }
          },
        },
        {
          label: '复制当前中转口令到剪贴板',
          click: async () => {
            const config = serverManager?.getRelayConfig()
            if (!config || !config.server || !config.token) {
              dialog.showMessageBox(win, {
                type: 'warning',
                title: '未配置中转',
                message: '当前尚未配置公网中转服务器，无法生成口令。',
              })
              return
            }
            const tokenStr = encodeRelayToken(config)
            clipboard.writeText(tokenStr)
            dialog.showMessageBox(win, {
              type: 'info',
              title: '口令已复制',
              message: '中转口令已成功复制到剪贴板！',
              detail: `${tokenStr}\n\n你可以在网吧或其他电脑上直接一键导入。`,
            })
          },
        },
        {
          label: '测试云端中转连通性',
          click: async () => {
            const config = serverManager?.getRelayConfig()
            if (!config || !config.server) {
              dialog.showMessageBox(win, {
                type: 'warning',
                title: '未配置中转',
                message: '尚未配置中转服务器。',
              })
              return
            }
            try {
              let httpUrl = config.server.replace(/^wss?:\/\//, 'https://').replace(/\/relay\/tunnel.*$/, '/relay/status')
              const res = await fetch(httpUrl)
              const data = await res.json()
              dialog.showMessageBox(win, {
                type: 'info',
                title: '云端连通性测试通过',
                message: '云端中转服务工作正常！',
                detail: `云端服务返回:\n${JSON.stringify(data, null, 2)}`,
              })
            } catch (err) {
              dialog.showMessageBox(win, {
                type: 'error',
                title: '连接失败',
                message: '无法连通云端中转服务器',
                detail: err.message,
              })
            }
          },
        },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '打开 GitHub 仓库',
          click: () => shell.openExternal('https://github.com/JackAIStudio/JackDSH'),
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

async function createWindow() {
  const defaultPort = isPreview ? 3280 : 3180
  const freePort = await findFreePort(defaultPort)

  serverManager = new ServerManager({
    port: freePort,
    isPortable,
    isPreview,
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
    title: isPreview ? 'JackDSH Preview (DSH 0.1.5-rc.2)' : 'JackDSH',
    backgroundColor: '#18181b',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 12 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  setupMacWindowDrag(mainWindow)
  setupApplicationMenu(mainWindow)

  // 监听网页标题变化，仅当标题中含有未读计数 "(N)" 时单向同步至系统角标
  // 关键：当 count === 0 时绝不清空角标！因为 React 单页应用会在会话渲染完成时频繁重置 document.title，
  // 若在此处清零会瞬间将刚设置好的未读数字抹除。角标清零必须且仅由窗口聚焦激活（focus）或显式清空指令触发。
  mainWindow.on('page-title-updated', (_event, title) => {
    const match = (title || '').match(/^\((\d+)\)/)
    const count = match ? parseInt(match[1], 10) : 0
    if (count > 0) {
      updateAppBadge(count)
    }
  })

  // 窗口聚焦激活时自动清空系统角标并通知渲染层
  mainWindow.on('focus', () => {
    updateAppBadge(0)
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('jackdsh:window-focused')
      } catch {}
    }
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
      applicationName: isPreview ? 'JackDSH Preview' : 'JackDSH',
      applicationVersion: `v${app.getVersion()}`,
      version: 'DeepSeek Harness 底座 v0.1.5-rc.2',
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
