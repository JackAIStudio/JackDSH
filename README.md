# 🚀 JackDSH

> **一个基于 DeepSeek Harness 官方框架打包的桌面客户端。**  
> 免去手动安装 Node.js、配置运行环境与敲终端命令行的繁琐过程，下载安装包即可开箱运行，并内置了局域网手机遥控等自研实用插件。

---

## 📥 客户端下载 (Releases)

直接前往 GitHub 的 [Releases 页面](../../releases/latest) 下载适合你系统的安装包：

| 平台 | 安装包格式 | 适用说明 | 下载直达 |
| :--- | :--- | :--- | :--- |
| 🍏 **macOS** | `.dmg` 镜像安装包 | 专为 Apple Silicon (M1/M2/M3/M4 芯片) 深度适配，双击拖拽安装 | [前往 Releases 下载](../../releases/latest) |
| 🪟 **Windows** | `.exe` 标准安装包 | 标准安装向导，支持自由选择安装与数据目录（推荐 D 盘），自动生成桌面图标 | [前往 Releases 下载](../../releases/latest) |

> 💡 **初次打开说明**：  
> 本项目为个人独立开源构建，未购买商业开发者企业证书。macOS 用户首次打开如提示“无法验证开发者”，请在 **系统设置 → 隐私与安全性** 中点击 **“仍要打开”** 即可正常使用。

---

## ✨ 核心功能与特性

1. **开箱即用，免配环境**
   - 内部已封装好运行所需的依赖与运行环境，无需自行安装 Node.js 或执行 npm 命令，双击即可启动。
2. **局域网手机扫码控制（自研插件）**
   - 电脑端启动后提供配对二维码。在**同一局域网（同一 Wi-Fi）**环境下，手机扫码即可建立连接，方便在移动设备上查看任务执行进度、输入消息。*(注：受限于网络拓扑，若路由器开启了 AP 隔离，局域网连接可能受阻)*。
3. **内置实用插件集成**
   - 预装了多模型便捷登录（Gemini / Grok OAuth）、DeepSeek 官方 API 余额监控、工作区路径显式标注等实用功能，减少初期折腾成本。
4. **数据本地隔离**
   - 运行时配置与数据存放于用户本地应用专属目录，不污染系统的其他全局全局开发环境。

---

## 🧩 模块与开源来源说明

本项目本质上是一个面向终端用户的**打包整合发行版**，严格遵循开源规范，明确区分底层核心与自研插件：

### 1. 底层框架核心
- **底座内核**：[DeepSeek Harness 官方项目](https://github.com/deepseek-ai/DeepSeek-Harness)（通过官方公开的 npm 包 `@deepseek-ai/dsh` 引入，本仓库不持有其底层框架源码）。

### 2. 自研与集成插件矩阵（全部独立开源）
发行版内置的插件清单均在各开源仓库公开维护，并在构建时自动拉取公开代码：

- 📱 **局域网手机控制**：[`dsh-mobile-plus`](https://github.com/JackAIStudio/dsh-mobile-plus)
- ⚡️ **Grok (xAI) 授权登录**：[`dsh-grok-oauth`](https://github.com/JackAIStudio/dsh-grok-oauth)
- 🔑 **Gemini 授权登录**：[`dsh-gemini-oauth`](https://github.com/JackAIStudio/dsh-gemini-oauth)
- 💰 **DeepSeek 余额监控**：[`dsh-deepseek-balance`](https://github.com/JackAIStudio/dsh-deepseek-balance)
- 📅 **今日工作区拦截**：[`dsh-today`](https://github.com/JackAIStudio/dsh-today)
- 🔄 **服务快速重启**：[`dsh-web-restart`](https://github.com/JackAIStudio/dsh-web-restart)
- 📁 **工作区路径中心**：[`dsh-workspace-path`](https://github.com/JackAIStudio/dsh-workspace-path)
- 🔍 **增强检索扩展**：[`dsh-robust-search`](https://github.com/JackAIStudio/dsh-robust-search)
- 🔔 **任务完成提示音**：[`dsh-reminder`](https://github.com/JackAIStudio/dsh-reminder)
- 🔴 **应用未读红点角标**：[`dsh-app-badge`](https://github.com/JackAIStudio/dsh-app-badge)
- 🧭 **会话深层导航**：[`dsh-session-navigator`](https://github.com/JackAIStudio/dsh-session-navigator)
- 🔎 **模型跟随联网搜索**：[`dsh-web-search-follow`](https://github.com/JackAIStudio/dsh-web-search-follow)
- 🤝 **WorkBuddy 双轨并发直连**：[`dsh-workbuddy-dual`](https://github.com/JackAIStudio/dsh-workbuddy-dual)

---

## 🏗️ 自动化构建机制

- **构建源完全透明**：GitHub Actions（[`.github/workflows/release.yml`](.github/workflows/release.yml)）依照 [`plugins.manifest.yaml`](plugins.manifest.yaml) 中的公开清单拉取插件并自动打包。
- **本地开发**：若本机存在对应插件源码，`scripts/prepare-bundle.js` 会优先复用本地开发目录；正式发版则一律以公开仓库的特定分支为准。

---

## 📄 开源许可

本项目采用 [MIT 许可证](LICENSE) 开源。各引用插件及依赖库遵循其各自的开源许可协议。欢迎在 GitHub Issues 提交问题反馈与改进建议。
