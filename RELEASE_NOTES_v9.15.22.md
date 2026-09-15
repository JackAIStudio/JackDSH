## 🚀 JackDSH v9.15.22 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v9.15.22**！  
相对上一版 **v9.14.23**，内核仍为 DeepSeek Harness `0.1.2-rc.1`。本次主题是任务完成时的 **极简沉静提醒**：人在电脑前切出时靠提示音，人离开时靠程序坞红点；不弹系统横幅、不弹跳 Dock、不申请通知权限。

---

### ✨ 核心更新亮点

#### 🖥️ JackDSH 桌面主程序：原生未读红点
- **Dock / 任务栏原生角标**：主进程通过 `app.dock.setBadge`（macOS）与 `app.setBadgeCount`（跨平台）点亮红底白字数字；preload 暴露 `window.jackdshNative.setBadge` / `clearBadge`，并 polyfill `navigator.setAppBadge`。
- **窗口回来即清零**：主窗口 `focus` 时清空角标，并通知渲染层；标题里出现 `(N)` 时只向上同步、不会在 React 改标题时误清零。
- **沉静策略**：正式版不代理 `window.Notification`、不申请系统通知权限、帮助菜单不放调试项。测试红点请走设置 → 桌面通知。

#### 🧩 `dsh-app-badge` (v0.1.1)
- JackDSH 优先走原生桥，不再被浏览器多标签 peer presence 误抑制。
- 桌面端切到后台时 `document.hidden` 仍为 false，不会因此误清空红点。
- 普通浏览器 / PWA 仍保留标题角标与 Web Notification 兜底（已补回被误删的 `title` / `body`）。

#### 🧩 `dsh-plugin-dashboard` (v0.1.2)
- 设置左侧新增「桌面通知」分类：说明两重感知（轻音知当下、红点知过往），并提供点亮 / 清空红点测试。

---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-9.15.22-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-9.15.22-Windows-portable.zip`

---
*相对 v9.14.23 的真实增量起草。内核与其余自研插件版本未变。*
