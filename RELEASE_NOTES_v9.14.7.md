## 🚀 JackDSH v9.14.7 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新大版本 **v9.14.7**！  
本次发布是一次里程碑式的生态大升级：不仅全面纳管并预装了本地全套自研插件与官方精选生态，更带来了模型授权随身迁移、手机远程 0.5.0 系统能力、macOS 沉浸式防穿透交互以及 Windows 便携免安装版。

---

### ✨ 核心更新亮点

#### 1. 🧩 全套自研插件与官方生态大一统（自研增至 17 款，全部 GitHub 开源同步）
- **开箱即用集成全量自研插件**：
  - **`dsh-autostart`**：跨平台开机自启动设置插件，在 Web 设置面板一键开启/关闭开机自启（支持 macOS LaunchAgent、Windows 静默 VBS 与 Linux systemd user）；
  - **`dsh-paste-path`**：Zero-UI 架构重构，移除冗余按键，常规复制后直接按系统原生快捷键（`Cmd+V` / `Ctrl+V`）静默接管填入系统绝对路径，支持 Electron 原生拖拽穿透与标准断行；
  - **`DSH-better-sidebar`**：VSCode 风格侧栏全能底座（内置资源管理器、代码编辑、终端、Git 与工作区路径检测开关）；
  - **`dsh-today`**：全新支持面向新标准的 `JackDSH` 品牌化与便携化路径解析（优先接入 `~/Documents/JackDSH/days/YYYY-MM-DD` 当日专属工作区，向下兼容存量 `dshspace`）；
  - **`dsh-workspace-path`**：对话顶栏官方 Hero 工作区选择器深度重构，直接调用原生系统选文件夹对话框并支持项目路径摘要展示。
- **结合预装社区核心插件**：
  - `@mlgbnb/dsh-archive-manager`（会话归档管理）；
  - `dsh-codex-timeline`（会话时间线分支与轮次搜索）；
  - `@wxg-prc-cpg/browser-skill-dsh-plugin`（腾讯官方 BrowserSkill 浏览器控制）。

#### 2. 📱 手机远程 0.5.0 重磅演进 (`dsh-mobile-plus`)
- **跨端会话置顶（Pins）**：支持在移动端长按/滑动一键置顶常用会话，并通过 `BroadcastChannel` 与桌面端各窗口实现毫秒级双向实时同步；
- **智能体长目标追踪（Goals System）**：新增自主长目标规划卡片，实时呈现思考阶段（Phase）、执行轮次、阻塞原因诊断与阶段推进；
- **Web Push 离线推送与 PWA 增强**：支持切后台/锁屏后接收任务执行完成通知；
- **工具调用卡片折叠（Tool Grouping）**：深度精简工具调用日志占用，多图并发生成自动以卡片集合形式优雅收纳；
- **指令系统（Slash & Commands）**：移动端输入框支持 `/` 指令快捷唤出常用 Skill 与系统命令。

#### 3. 📦 模型与敏感授权配置包随身迁移 (`dsh-plugin-dashboard`)
- 在设置中心「插件大盘」顶部新增**“全量模型与授权随身迁移”**功能卡片；
- 支持将 DeepSeek API Key、Grok OAuth、Gemini OAuth 多账号凭据及全局偏好设置一键打包导出为单文件（几 KB 大小）；
- 在新电脑或网吧打开空客户端时一键上传导入，严格执行安全白名单、原子写入与 `.bak-pre-import` 自动备份，敏感文件锁定 `0o600` 私有权限，瞬间满血复活。

#### 4. 🍏 macOS 沉浸式标题栏体验与模态交互防穿透保护
- 深度优化 macOS `hiddenInset` 沉浸式标题栏：顶部全局拖拽条支持触控板双击放大/全屏与全域平滑拖拽；
- **独创模态互斥机制**：在打开任意设置面板、下拉选择器或弹窗时，自动冻结背景拖拽区域，彻底消除以往弹窗关闭按钮无法点击、下拉菜单被底层拖拽劫持的 Electron 顽疾。

#### 5. 🪟 Windows 绿色免安装便携版（Portable Zip）
- Windows 端除标准 NSIS 安装包外，新增**绿色便携免安装版（Zip）**；
- 解压即用，配置与工作区默认锁定在当前程序便携目录下，不向系统注册表或 C 盘写入垃圾，适合移动办公与 U 盘随身携带；
- Windows 启动环境深度适配，默认启用官方纯 JS 目录选择器，避免原生 COM 异常退出。

#### 6. 🛠️ 内置跨平台 BrowserSkill `bsk` CLI 二进制
- 打包内置 macOS (Apple Silicon) 与 Windows (x64) 的 `bsk` 命令行可执行文件；
- 客户端在启动子进程时自动补齐并增强 PATH 环境变量（优先挂载内置 bin 目录，自动探测并补齐 Homebrew、`~/.local/bin` 等终端路径），无需用户再手动配置命令行。

#### 7. 🤖 出厂搭载「Jack 模式」自主编码高阶预设
- 出厂默认注入 `agent-presets: default: jack` 预设；
- 默认预设完全权限模式（`danger-full-access`）与 BusyEnter 转向，开箱即拥有极高自主度的自动化研发体验。

---

### 📥 客户端下载

| 平台 | 版本与适用架构 | 文件名与说明 | 状态 |
| :--- | :--- | :--- | :--- |
| 🍏 **macOS** | Apple Silicon (M1/M2/M3/M4) | `JackDSH-9.14.7-Mac-苹果芯片版.dmg` | CI 自动构建上传中 |
| 🪟 **Windows** | x64 (免安装便携版) | `JackDSH-9.14.7-Windows-便携免安装版.zip` | CI 自动构建上传中 |
| 🪟 **Windows** | x64 (标准安装版) | `JackDSH-9.14.7-Windows-便携免安装版.exe` | CI 自动构建上传中 |

> 💡 **首次启动说明**：  
> - **macOS**：如提示“无法验证开发者”，请前往 **系统设置 → 隐私与安全性**，点击 **“仍要打开”** 即可正常使用。  
> - **便携版**：解压至任意无中文空格路径即可双击启动。
