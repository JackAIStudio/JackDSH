/**
 * 自动更新（electron-updater）
 *
 * 设计约束：
 *  1. **绝不拖垮启动**。整条链路任何一步失败都只记日志，主流程照常开窗。
 *  2. **只在打包态生效**。开发态（`electron .`）直接 no-op。
 *  3. **不猜模块解析行为**。主进程代码跑在 `app.asar` 内，而依赖树在
 *     `Contents/Resources/node_modules`（asar 外的 extraResources）。
 *     先按常规 require 试，失败再走 `process.resourcesPath` 显式寻址。
 *  4. **用户点头才下载**。`autoDownload = false`，先问再下。
 *  5. **退让给停服编排**。安装前必须等 `beforeInstall()`（停掉 DSH 服务）跑完，
 *     否则会留下孤儿 dsh 进程占着端口。
 *
 * 注意：本文件是 ESM（package.json 为 "type": "module"），而 electron-updater 是
 * CommonJS，因此用 `createRequire` 取一个 require 出来，不能直接用全局 require。
 */

import { app, dialog } from 'electron'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/** @type {import('electron-updater').AppUpdater | null} */
let autoUpdater = null
let wired = false
let ctx = { getWindow: () => null, beforeInstall: async () => {} }
let manualCheckInFlight = false

/** 把 electron-updater 装进当前进程；所有寻址路径都失败就返回 null。 */
function loadAutoUpdater() {
  const attempts = [
    () => require('electron-updater'),
    () => require(join(process.resourcesPath || '', 'node_modules', 'electron-updater')),
    () => require(join(app.getAppPath(), '..', 'node_modules', 'electron-updater')),
  ]
  for (const attempt of attempts) {
    try {
      const mod = attempt()
      if (mod?.autoUpdater) return mod.autoUpdater
    } catch {
      // 换下一条路径继续试
    }
  }
  return null
}

function windowOrNull() {
  const win = ctx.getWindow()
  return win && !win.isDestroyed() ? win : null
}

function tell(message, detail, buttons, defaultId = 0) {
  const win = windowOrNull()
  const opts = {
    type: 'info',
    buttons,
    defaultId,
    cancelId: buttons.length - 1,
    noLink: true,
    message,
    detail,
  }
  return win ? dialog.showMessageBox(win, opts) : dialog.showMessageBox(opts)
}

function wireEvents() {
  if (wired) return
  wired = true

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('error', (err) => {
    console.error('[JackDSH updater] error:', err?.message || err)
    windowOrNull()?.setProgressBar(-1)
    if (manualCheckInFlight) {
      manualCheckInFlight = false
      tell('检查更新失败', `无法连接更新服务。\n\n${err?.message || err}`, ['知道了'])
    }
  })

  autoUpdater.on('update-not-available', () => {
    windowOrNull()?.setProgressBar(-1)
    if (manualCheckInFlight) {
      manualCheckInFlight = false
      tell('已是最新版本', `当前版本 v${app.getVersion()} 已是最新。`, ['好'])
    }
  })

  autoUpdater.on('update-available', async (info) => {
    manualCheckInFlight = false
    const res = await tell(
      `发现新版本 v${info.version}`,
      `当前版本：v${app.getVersion()}\n新版本：v${info.version}\n\n` +
        '现在下载吗？下载在后台进行，不影响你继续使用；下好后会再问你是否重启安装。',
      ['下载更新', '稍后再说'],
      0
    )
    if (res.response !== 0) return
    try {
      windowOrNull()?.setProgressBar(0)
      await autoUpdater.downloadUpdate()
    } catch (err) {
      console.error('[JackDSH updater] download failed:', err?.message || err)
      windowOrNull()?.setProgressBar(-1)
      tell('下载更新失败', `${err?.message || err}\n\n可以稍后从 GitHub Releases 手动下载。`, ['知道了'])
    }
  })

  autoUpdater.on('download-progress', (p) => {
    // 进度挂 Dock / 任务栏，不打断用户
    windowOrNull()?.setProgressBar(Math.max(0, Math.min(1, (p?.percent || 0) / 100)))
  })

  autoUpdater.on('update-downloaded', async (info) => {
    windowOrNull()?.setProgressBar(-1)
    const res = await tell(
      `v${info.version} 已下载完成`,
      '重启应用即可完成更新。\n\n重启会中断正在运行的任务（含子代理与后台任务），聊天记录不会丢失。',
      ['立即重启更新', '稍后'],
      0
    )
    if (res.response !== 0) return
    try {
      // 关键：先停掉 DSH 服务，避免留下占着端口的孤儿进程
      await ctx.beforeInstall()
    } catch (err) {
      console.error('[JackDSH updater] beforeInstall failed:', err?.message || err)
    }
    setImmediate(() => autoUpdater.quitAndInstall(false, true))
  })
}

/**
 * 启动时调用一次。
 * @param {{ getWindow: () => (import('electron').BrowserWindow | null),
 *           beforeInstall: () => Promise<void> }} options
 */
export function initAutoUpdate(options = {}) {
  ctx = { ...ctx, ...options }

  if (!app.isPackaged) {
    console.log('[JackDSH updater] 开发态，跳过自动更新')
    return
  }

  autoUpdater = loadAutoUpdater()
  if (!autoUpdater) {
    console.warn('[JackDSH updater] 未找到 electron-updater，自动更新不可用（不影响使用）')
    return
  }

  wireEvents()

  // 延后 8 秒，让窗口与 DSH 服务先把首屏跑起来
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[JackDSH updater] 启动检查失败:', err?.message || err)
    })
  }, 8000)
}

/** 菜单「检查更新」入口。 */
export async function checkForUpdatesManually() {
  if (!app.isPackaged) {
    await tell('开发态不检查更新', `当前运行的是未打包的开发版本（v${app.getVersion()}）。`, ['好'])
    return
  }
  if (!autoUpdater) {
    await tell(
      '自动更新不可用',
      '本次安装未包含更新组件。可前往 GitHub Releases 手动下载最新版本。',
      ['好']
    )
    return
  }
  manualCheckInFlight = true
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    manualCheckInFlight = false
    await tell('检查更新失败', `无法连接更新服务。\n\n${err?.message || err}`, ['知道了'])
  }
}
