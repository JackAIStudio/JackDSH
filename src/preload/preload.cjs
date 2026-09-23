const { contextBridge, ipcRenderer, webFrame, webUtils } = require('electron')

// 暴露 native 窗口与 Dock 角标能力（不弹系统横幅、不申请通知权限）
try {
  contextBridge.exposeInMainWorld('jackdshNative', {
    isJackDSH: true,
    toggleMaximize: () => ipcRenderer.send('jackdsh:window-toggle-maximize'),
    setBadge: (count) => {
      ipcRenderer.send('jackdsh:set-badge', count)
    },
    clearBadge: () => {
      ipcRenderer.send('jackdsh:set-badge', 0)
    },
    onWindowFocused: (cb) => {
      ipcRenderer.on('jackdsh:window-focused', () => {
        try { cb?.() } catch {}
      })
    },
    restartCore: () => ipcRenderer.invoke('jackdsh:restart-core'),
    // 拖入项的绝对路径 —— Electron 官方 API（32+ 起替代被移除的 File.path）。
    //
    // 为什么必须有它：Electron 32 移除了非标的 File.path，而 renderer 又开着
    // contextIsolation（页面 require 不到 electron 模块），所以网页**看不到**从访达
    // 拖进来的文件在磁盘上的位置。webUtils.getPathForFile 正是官方为这个场景补的 API，
    // 也是社区唯一受支持的拿路径方式；它必须由拿到真实 File 对象的桥接函数来调用。
    //
    // 没有它时，插件只能拿文件名去常见目录里猜位置（mdfind / 目录扫描），
    // 落到工作目录（例如 ~/Screen Studio Projects）就猜不中，表现为「拖进去没反应」。
    getPathForFile: (file) => {
      try {
        return webUtils.getPathForFile(file) || ''
      } catch {
        return ''
      }
    },
  })
} catch (err) {
  console.error('[JackDSH Preload] Failed to expose jackdshNative:', err)
}

// W3C Badging API → 原生 Dock / 任务栏角标（Chrome PWA 与插件共用同一条路径）
try {
  webFrame.executeJavaScript(`
    if (typeof navigator !== 'undefined') {
      navigator.setAppBadge = (count) => {
        window.jackdshNative?.setBadge(count);
        return Promise.resolve();
      };
      navigator.clearAppBadge = () => {
        window.jackdshNative?.clearBadge();
        return Promise.resolve();
      };
    }
  `)
} catch (err) {
  console.error('[JackDSH Preload] Failed to polyfill navigator.setAppBadge:', err)
}

// 智能监听窗口顶部双击事件：彻底保障「双击变大变小」100% 随时随地生效
window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener(
    'dblclick',
    (e) => {
      // 仅响应顶部 48px 区域内（沉浸式顶栏与侧栏头部区域）
      if (e.clientY > 48) return

      const target = e.target
      if (!target || !target.closest) return

      // 如果双击在模态弹窗内（设置面板、确认框等），不触发缩放
      if (target.closest('[role="dialog"], [aria-modal="true"]')) {
        return
      }

      // 当前会话标题（crumbCurrent 或 disabled 的展示标题）属于标题栏核心，允许双击缩放
      const isCurrentTitle = target.closest('[class*="crumbCurrent"], button[class*="crumb"][disabled]')
      if (isCurrentTitle) {
        ipcRenderer.send('jackdsh:window-toggle-maximize')
        return
      }

      // 真正需要阻止双击缩放的交互元素：输入框、下拉框、Tab、非标题的操作按钮、关闭叉等
      const isInteractive = target.closest(
        'input, select, textarea, [role="menuitem"], [role="combobox"], [class*="iconButton"], [class*="close"], [class*="tab"]:not([class*="crumbCurrent"]), button:not([disabled]), a[href]'
      )
      if (isInteractive) return

      // 在顶栏任意空白处、文字间隙双击，安全触发窗口缩放
      ipcRenderer.send('jackdsh:window-toggle-maximize')
    },
    { capture: true }
  )
})
