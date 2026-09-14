const { contextBridge, ipcRenderer } = require('electron')

// 暴露只读 native 窗口能力（备用）
try {
  contextBridge.exposeInMainWorld('jackdshNative', {
    toggleMaximize: () => ipcRenderer.send('jackdsh:window-toggle-maximize'),
  })
} catch {}

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
