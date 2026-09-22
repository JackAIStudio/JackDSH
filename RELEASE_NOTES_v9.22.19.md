## 🚀 JackDSH v9.22.19 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v9.22.19**！  
本次更新全面同步了自研插件生态的最新能力，修复了多项关键体验问题，并对系统稳定性与跨平台构建进行了系统性加固。

---

### 🎯 本次重点

- **置顶会话不再跨实例串味**（`dsh-session-navigator` v0.4.6）：置顶、会话检索库、深链摘要三处默认路径以前写死成 `~/.dsh`，而会话是按档案（profile）分开存的——于是打包版钉的会话会在命令行/dev 实例里显示成「会话不可用」。现在三处都按运行实例自己的 `$DSH_HOME` 解析，各实例只看自己的置顶。
- **fork 出来的会话不再顶着目录名**（`dsh-session-navigator` v0.4.6）：侧栏里有几条会话以前只显示 `2026-09-21` 这种项目目录名，点开一次才有真标题。原因是宿主的会话列表对「未打开的 fork 会话」不读投影缓存里的标题，于是显示标题逐级回退到目录名。插件改用宿主自己的增量通道把标题补齐，标题不再需要点开才出现。
- **新增内置插件 `dsh-fork-guard`**（v0.1.0）：fork 会话时剥离种子历史里未消费的排队消息，根治「发一条消息跳出两条排队消息」的幽灵轮次。
- **移动端连接中界面可直接进最近会话**（`dsh-mobile-plus` v0.5.3）：宿主重启后不必干等，也不会再被自动拉回上次那条会话。

---

### ✨ 核心更新亮点

#### 1. 🧩 `dsh-app-badge` (v0.1.1)
- f1ac027 feat: 升级至 0.1.1，JackDSH 走原生桥点亮 Dock 红点且桌面端不弹横幅 (JKW)

#### 2. 🧩 `dsh-fork-guard` (v0.1.0)
- a28e845 fix: declare dsh.bundle patch and add cordis.patch.yml (JKW)
- 56e6085 feat: initial commit of dsh-fork-guard (JKW)

#### 3. 🧩 `dsh-gemini-oauth` (v0.2.6)
- bf63bd6 fix(chip): 状态栏额度指示只聚焦 5 小时窗口，周限额不再抢占变色 (JKW)
- ad80b0f fix: 对齐 DSH 0.1.5 replayState 规范，消除 AST 签名污染并保证工具调用闭环 (JKW)

#### 4. 🧩 `dsh-grok-oauth` (v0.1.9)
- 4e71173 fix(adapter): resolve attached image paths into the tool execution world (JKW)
- 474b397 fix(host): 兼容官方底座未注入 webServer 导致的 /grok 路由挂载失败 (JKW)
- 4764c53 fix(rpc): inject webServer alongside connection for cordis 4 rpc.handle (JKW)
- ab6a3ec fix(adapter): add modelErrors Map to satisfy DSH 0.1.5+ PiAiProviderProfile interface (JKW)

#### 5. 🧩 `dsh-image-fit` (v0.1.0)
- 5cdc852 feat: initial release of dsh-image-fit (scale-to-fit preview for deliverable images) (JKW)

#### 6. 🧩 `dsh-mobile-plus` (v0.5.3)
- 4af785a feat: 升级至 0.5.3，连接中界面可直接进入最近会话 (JKW)
- 8f7a83c feat: support local file path attachment previews and enhance image message UI (JKW)
- 322a857 fix(mobile-plus): 适配 DSH 0.1.5 Typert 架构，修复移动端无法接收 Agent 回复与 SSE 流断开问题 (JKW)

#### 7. 🧩 `dsh-paste-path` (v0.3.1)
- f48ca7b feat(v0.3.1): support Cmd+V paste for folders and bundles with unified drop bifurcation (JKW)
- 26a3fcd feat(v0.3.0): adapt to 0.1.5 Lexical composer, passthrough native files and intercept folders/.app bundles (JKW)

#### 8. 🧩 `dsh-plugin-dashboard` (v0.1.2)
- cbe3392 feat(migrate): auto-sync gemini proxy from settings to cordis.patch.yml on profile import (JKW)
- 635333a feat: hide deprecated plugins from dashboard and add paste-path/autostart metadata (JKW)
- 8d3b530 feat: 升级至 0.1.2，设置页新增桌面通知分类与程序坞红点测试 (JKW)

#### 9. 🧩 `dsh-session-navigator` (v0.4.6)
- 72009b1 fix(client): 补齐 fork 会话的标题，修侧栏回退成目录名 (JKW)
- de16ab4 fix: 置顶/检索/直达改走本档案 $DSH_HOME（修跨实例串味） (JKW)
- f694f37 docs: clarify DSH 0.1.5 WebSocket architecture, 12+ tabs capacity and probe timeout rationale (JKW)
- 3d9dcd7 fix(client): extend new-tab probe timeout for 0.1.5 bundle and WebSocket readiness without killing tabs (JKW)

#### 10. 🧩 `dsh-turn-bookmarks` (v0.1.0)
- 37acde2 docs: 同步 README 至双轨架构，移除已废弃的仅看收藏过滤模式说明 (JKW)
- efd8377 fix(shortcuts): 移除全局 / 与 Esc 快捷键劫持，搜索改为纯鼠标操作 (JKW)
- 1301d6d feat(client): 重构为双轨架构，左侧专属书签轨 + 独立受控浮层 (JKW)
- 897c22e chore: add repository field pointing to JackAIStudio/dsh-turn-bookmarks (JKW)
- ecfd70c fix(layout): mount toolbar cleanly before headerCorner to never cover native sidebar (JKW)
- a28d828 fix(css): remove invasive frame pseudo-element and scope preview rules (JKW)
- 4f28d7a fix(client): robust turn bookmarking, in-session search navigation and bridge (JKW)
- c2ed0b0 feat: initial commit for dsh-turn-bookmarks (JKW)

#### 11. 🧩 `dsh-web-restart` (v0.1.1)
- 535fd36 fix: hand desktop restarts back to the JackDSH process tree (JKW)
- caa4b7b fix(spawn): pass ELECTRON_RUN_AS_NODE and --expose-internals for Electron runtime (JKW)
- 3782dd8 feat: add launchd KeepAlive awareness to prevent port contention infinite loop (JKW)

#### 12. 🧩 `dsh-workbuddy-dual` (v0.1.1)
- 74eb14c fix(adapter): resolve attached image paths into the tool execution world (JKW)
- d123a5b chore: update build artifacts (JKW)
- 1fa63da fix(adapter): add modelErrors Map to satisfy DSH 0.1.5+ PiAiProviderProfile interface (JKW)

#### 13. 🧩 `dsh-workspace-path` (v0.4.0)
- 0e44a36 fix: register workspace rpc from the injected webServer context (JKW)
- 9a4fc78 fix: defer rpc.handle with ctx.inject([connection, webServer]) for cordis 4 (JKW)
- 6b8a963 fix: declare webServer in inject for cordis 4 rpc handle (JKW)


---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-9.22.19-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-9.22.19-Windows-portable.zip`

---
*由 JackDSH Release Helper 自动提炼生成。*
