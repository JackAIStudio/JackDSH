## 🚀 JackDSH v9.21.15 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v9.21.15**！  
本次更新全面同步了自研插件生态的最新能力，修复了多项关键体验问题，并对系统稳定性与跨平台构建进行了系统性加固。

---

### ⚠️ 重要变更：`dsh-cut-studio` 停止随包发行

`dsh-cut-studio`（JackAICut Studio 智能剪辑台）为实验性插件，经评估其 Web 形态成熟度尚不足以进入生产环境，**已暂停维护**：

- 源码已备份至 [JackAIStudio/dsh-cut-studio](https://github.com/JackAIStudio/dsh-cut-studio)（PRIVATE + ARCHIVED，只读留档，2026-09-21 归档）；
- 该插件**从未进入过发行版本**：它既不在 `plugins.manifest.yaml` 打包清单中，其配套的原生独立窗口逻辑也一直停留在本地未提交状态。本次仅将其正式登记为「有意排除」，故**对现有用户零影响**。

该插件在规划上属于「放置观察」而非废弃，后续若重启研发将从归档仓库恢复。**此变更不影响其余任何插件与功能。**

> 说明：开发态曾存在一版本地未提交的原生独立窗口代码（`openCutStudioWindow`），从未进入任何 commit 或发行包，现已一并清理。

---

### ✨ 核心更新亮点

#### 1. 🧩 `dsh-app-badge` (v0.1.1)
- f1ac027 feat: 升级至 0.1.1，JackDSH 走原生桥点亮 Dock 红点且桌面端不弹横幅 (JKW)

#### 2. 🧩 `dsh-autostart` (v0.1.1)
- 12e67e6 feat: 升级至 0.1.1，增加实例端口冲突隔离保护与 macOS 桌面应用拉起支持 (JKW)

#### 3. 🧩 `dsh-gemini-oauth` (v0.2.6)
- bf63bd6 fix(chip): 状态栏额度指示只聚焦 5 小时窗口，周限额不再抢占变色 (JKW)
- ad80b0f fix: 对齐 DSH 0.1.5 replayState 规范，消除 AST 签名污染并保证工具调用闭环 (JKW)

#### 4. 🧩 `dsh-grok-oauth` (v0.1.9)
- 474b397 fix(host): 兼容官方底座未注入 webServer 导致的 /grok 路由挂载失败 (JKW)
- 4764c53 fix(rpc): inject webServer alongside connection for cordis 4 rpc.handle (JKW)
- ab6a3ec fix(adapter): add modelErrors Map to satisfy DSH 0.1.5+ PiAiProviderProfile interface (JKW)

#### 5. 🧩 `dsh-image-fit` (v0.1.0)
- 5cdc852 feat: initial release of dsh-image-fit (scale-to-fit preview for deliverable images) (JKW)

#### 6. 🧩 `dsh-mobile-plus` (v0.5.2)
- 8f7a83c feat: support local file path attachment previews and enhance image message UI (JKW)
- 322a857 fix(mobile-plus): 适配 DSH 0.1.5 Typert 架构，修复移动端无法接收 Agent 回复与 SSE 流断开问题 (JKW)

#### 7. 🧩 `dsh-paste-path` (v0.3.1)
- f48ca7b feat(v0.3.1): support Cmd+V paste for folders and bundles with unified drop bifurcation (JKW)
- 26a3fcd feat(v0.3.0): adapt to 0.1.5 Lexical composer, passthrough native files and intercept folders/.app bundles (JKW)

#### 8. 🧩 `dsh-plugin-dashboard` (v0.1.2)
- cbe3392 feat(migrate): auto-sync gemini proxy from settings to cordis.patch.yml on profile import (JKW)
- 635333a feat: hide deprecated plugins from dashboard and add paste-path/autostart metadata (JKW)
- 8d3b530 feat: 升级至 0.1.2，设置页新增桌面通知分类与程序坞红点测试 (JKW)
- 0bd58ef feat: 升级至 0.1.1，支持自研插件生态 Git 巡检面板、配置迁移与版本号徽章 (JKW)

#### 9. 🧩 `dsh-session-navigator` (v0.4.4)
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
- caa4b7b fix(spawn): pass ELECTRON_RUN_AS_NODE and --expose-internals for Electron runtime (JKW)
- 3782dd8 feat: add launchd KeepAlive awareness to prevent port contention infinite loop (JKW)

#### 12. 🧩 `dsh-workbuddy-dual` (v0.1.1)
- d123a5b chore: update build artifacts (JKW)
- 1fa63da fix(adapter): add modelErrors Map to satisfy DSH 0.1.5+ PiAiProviderProfile interface (JKW)

#### 13. 🧩 `dsh-workspace-path` (v0.4.0)
- 9a4fc78 fix: defer rpc.handle with ctx.inject([connection, webServer]) for cordis 4 (JKW)
- 6b8a963 fix: declare webServer in inject for cordis 4 rpc handle (JKW)


---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-9.21.15-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-9.21.15-Windows-portable.zip`

---
*由 JackDSH Release Helper 自动提炼生成。*
