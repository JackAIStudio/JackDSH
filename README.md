# 🚀 JackDSH (开箱即用 DeepSeek Harness 桌面客户端)

> **为 AI 创作者、独立开发者量身定制的 DeepSeek Harness 桌面客户端。**  
> **无需安装 Node.js、无需手动配环境，双击即可开箱即用！内置局域网手机遥控与创作者工作台。**

---

## 📥 客户端下载 (Releases)

| 平台 | 安装包类型 | 说明 | 下载链接 |
| :--- | :--- | :--- | :--- |
| **macOS** | `.dmg` 安装包 | 支持 Apple Silicon (M系列) 与 Intel 芯片 | [下载 macOS 版](../../releases/latest) |
| **Windows** | `.exe` 安装包 | 支持 Win10 / Win11 一键安装 | [下载 Windows 安装版](../../releases/latest) |
| **Windows** | `.zip` 绿色便携版 | **免安装解压即用**，支持放在随身 U 盘，网吧/临时电脑插上即跑 | [下载 Windows 便携版](../../releases/latest) |

*(国内高速下载备用：百度网盘 / 夸克网盘 / 123云盘，提取码请见下方交流群)*

---

## ✨ 核心特色

1. **📱 手机局域网一键扫码控制**
   - 电脑启动后显示局域网二维码，手机连同一个 Wi-Fi 扫码秒连！
   - 离开电脑躺在沙发上也能随时查看任务进度、发消息、传文件。
2. **💼 预装创作者超级工作台**
   - 内置自媒体数据监控、口播稿智能整理、多平台封面生成、短视频自动化剪辑扩展。
3. **🔑 多模型免 Key 便捷登录**
   - 内置 Gemini、Grok (xAI) OAuth 授权登录与额度监控插件。
4. **🔒 沙盒隔离与数据安全**
   - 运行环境彻底独立，绝不污染系统；提供便携式模式，配置随身带走。

---

## 🧩 模块化开源生态矩阵

本项目是基于开源生态构建的**开箱即用官方发行版（Distribution）**。各子模块独立开源并持续迭代：

- 📱 **手机远程控制插件**：[`dsh-mobile-plus`](https://github.com/JackAIStudio/dsh-mobile-plus)
- 🔑 **Gemini 多账号 OAuth 插件**：[`dsh-gemini-oauth`](https://github.com/JackAIStudio/dsh-gemini-oauth)
- ⚡️ **Grok (xAI) OAuth 插件**：[`dsh-grok-oauth`](https://github.com/JackAIStudio/dsh-grok-oauth)
- 🔑 **Gemini 多账号 OAuth 插件**：[`dsh-gemini-oauth`](https://github.com/JackAIStudio/dsh-gemini-oauth)
- 💰 **DeepSeek 余额显示插件**：[`dsh-deepseek-balance`](https://github.com/JackAIStudio/dsh-deepseek-balance)
- 📅 **状态卡片插件**：[`dsh-today`](https://github.com/JackAIStudio/dsh-today)
- ⌨️ **Cmd/Ctrl+J 面板切换**：[`dsh-cmdj-toggle`](https://github.com/JackAIStudio/dsh-cmdj-toggle)
- 🔄 **Web 服务重启按钮**：[`dsh-web-restart`](https://github.com/JackAIStudio/dsh-web-restart)
- 📁 **工作区路径显示**：[`dsh-workspace-path`](https://github.com/JackAIStudio/dsh-workspace-path)
- 🌐 **真实 Chrome 浏览器附加**：[`dsh-browser-attach`](https://github.com/JackAIStudio/dsh-browser-attach)

**生态相关：**

- 🎛️ **侧栏增强**：[`DSH-better-sidebar`](https://github.com/JackAIStudio/DSH-better-sidebar)
- 🤖 **底层 Agent 框架**：[DeepSeek Harness 官方底座](https://github.com/deepseek-ai/DeepSeek-Harness)（以 npm 包 `@deepseek-ai/dsh` 形式引入编译成品，本仓库不持有其源码）

---

## 🏗️ 构建与发布模型

- **发行构建只认公开源码**：CI（[`.github/workflows/release.yml`](.github/workflows/release.yml)）按 [`plugins.manifest.yaml`](plugins.manifest.yaml) 从各插件的 **PUBLIC 仓库** clone 固定 ref 后打包——「发行包里有什么 = 开源了什么」，可复现、可对账。打 `v*` tag 自动构建 macOS / Windows 安装包并发布到 Release。
- **本地开发态**：本机存在 `../plugins/<name>` 源码时，`prepare-bundle` 默认优先用本地（改了不用推就能测）；`node scripts/prepare-bundle.js --source public` 可强制与 CI 同路径。
- **快速自测**：`pnpm run build:mac:fast` 只构建 Apple Silicon，时间减半；正式构建用 `pnpm run build:mac` / `build:win`（双架构）。

---

## 💬 交流群与创作者社群

- 欢迎加入 **「DeepSeek Harness 玩机与创作者交流群」**
- 获取高阶自媒体工作流、私有付费插件与企业定制方案

*(扫码添加主理人微信进群 / 关注公众号获取最新版本动态)*
