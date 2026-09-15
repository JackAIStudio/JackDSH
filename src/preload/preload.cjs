const { contextBridge, ipcRenderer, webFrame } = require('electron')

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
