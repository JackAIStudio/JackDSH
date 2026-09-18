## 🚀 JackDSH v9.16.0 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v9.16.0**！  
本次更新全面同步了自研插件生态的最新能力，修复了多项关键体验问题，并对系统稳定性与跨平台构建进行了系统性加固。

---

### ✨ 核心更新亮点

#### 1. 🧩 `dsh-app-badge` (v0.1.1)
- f1ac027 feat: 升级至 0.1.1，JackDSH 走原生桥点亮 Dock 红点且桌面端不弹横幅 (JKW)

#### 2. 🧩 `dsh-autostart` (v0.1.1)
- 12e67e6 feat: 升级至 0.1.1，增加实例端口冲突隔离保护与 macOS 桌面应用拉起支持 (JKW)
- f49cf1c fix(client): 补充 slots 依赖注入声明与异步容错注册 (JKW)
- 72fbcf4 feat: initial release of dsh-autostart cross-platform plugin (JKW)

#### 3. 🧩 `dsh-better-sidebar` (v0.18.0)
- e60f5c0 chore: 将 lib/ 构建产物纳入 Git 跟踪，确保无编译环境下开箱即用 (JKW)

#### 4. 🧩 `dsh-gemini-oauth` (v0.2.6)
- ad80b0f fix: 对齐 DSH 0.1.5 replayState 规范，消除 AST 签名污染并保证工具调用闭环 (JKW)

#### 5. 🧩 `dsh-grok-oauth` (v0.1.9)
- 4764c53 fix(rpc): inject webServer alongside connection for cordis 4 rpc.handle (JKW)
- ab6a3ec fix(adapter): add modelErrors Map to satisfy DSH 0.1.5+ PiAiProviderProfile interface (JKW)

#### 6. 🧩 `dsh-mobile-plus` (v0.5.2)
- 8f7a83c feat: support local file path attachment previews and enhance image message UI (JKW)
- 322a857 fix(mobile-plus): 适配 DSH 0.1.5 Typert 架构，修复移动端无法接收 Agent 回复与 SSE 流断开问题 (JKW)
- 57674a9 feat: 升级至 0.5.1，重构公网中转真实状态机与连通性检测，根治多实例互踢与配对码路由错位 (JKW)
- e426d55 fix(assets): 将 public/icon.png 软链接替换为实体图片文件，修复跨平台构建签名与打包异常 (JKW)
- f7d76e8 feat: 升级至 0.5.0，支持会话置顶同步、智能体长目标追踪、Web Push 离线推送与指令菜单 (JKW)
- 38bd55c feat(mobile): 升级至 0.4.8，新增移动端会话时间线导航、Token 上下文用量指示与折叠展开 (JKW)

#### 7. 🧩 `dsh-paste-path` (v0.3.0)
- 26a3fcd feat(v0.3.0): adapt to 0.1.5 Lexical composer, passthrough native files and intercept folders/.app bundles (JKW)
- 732386b refactor: Zero-UI 架构重构，原生常规粘贴（Cmd+V / Ctrl+V）静默接管与拖拽穿透 (JKW)
- c11c2a2 fix: remove duplicate trailing append so paths are cleanly inserted exactly once with linebreaks (JKW)
- c73e399 fix: enforce Shift+Enter break between each path in insertPathsToComposer (JKW)
- 756016b fix: insert multiline paths using native DSH paragraph structure <p> (JKW)
- 2bdc13c fix: keep focus on composer when clicking path button (JKW)
- 31f11d9 fix: precise single-shot multiline HTML linebreak insertion (JKW)
- f9101a9 fix: robust multiline path insertion with insertHTML and Range fallback (JKW)

#### 8. 🧩 `dsh-plugin-dashboard` (v0.1.2)
- cbe3392 feat(migrate): auto-sync gemini proxy from settings to cordis.patch.yml on profile import (JKW)
- 635333a feat: hide deprecated plugins from dashboard and add paste-path/autostart metadata (JKW)
- 8d3b530 feat: 升级至 0.1.2，设置页新增桌面通知分类与程序坞红点测试 (JKW)
- 0bd58ef feat: 升级至 0.1.1，支持自研插件生态 Git 巡检面板、配置迁移与版本号徽章 (JKW)
- 535024d feat: 支持模型与授权全量配置包随身迁移（安全导出与一键恢复） (JKW)
- 22c9a18 feat(ui): 增加 3 步新手向导 (Onboarding)，支持浏览器扩展连接指引与随时跳过/重温 (JKW)
- 4e8dbf2 feat: 初始化 JackDSH 插件与版本大盘 (v0.1.0) (JKW)

#### 9. 🧩 `dsh-session-navigator` (v0.4.4)
- 3d9dcd7 fix(client): extend new-tab probe timeout for 0.1.5 bundle and WebSocket readiness without killing tabs (JKW)
- 37de2fc feat: 支持多窗口跨标签页实时同步置顶状态与可见性静默拉取 (JKW)
- 584f0f3 feat: 升级至 0.4.4，侧栏 ⋯ 菜单支持复制会话 ID、复制规范引用与置顶会话 (JKW)
- e3ff7e9 chore: scrub local username from session-summary fixtures (JKW)

#### 10. 🧩 `dsh-today` (v0.3.0)
- e4fc004 feat: 支持 JackDSH 品牌化根路径与便携模式解析，兼顾存量 dshspace 兼容 (JKW)

#### 11. 🧩 `dsh-web-restart` (v0.1.1)
- caa4b7b fix(spawn): pass ELECTRON_RUN_AS_NODE and --expose-internals for Electron runtime (JKW)
- 3782dd8 feat: add launchd KeepAlive awareness to prevent port contention infinite loop (JKW)
- 7ae1918 fix(client): 升级至 0.1.1，增加主页面两阶段 HTML 就绪探测与等待动画，彻底消除重启 404 (JKW)

#### 12. 🧩 `dsh-web-search-follow` (v0.2.0)
- cee83d5 docs: 补全开源 README，补上 GitHub 安装与依赖说明 (JKW)

#### 13. 🧩 `dsh-workbuddy-dual` (v0.1.1)
- d123a5b chore: update build artifacts (JKW)
- 1fa63da fix(adapter): add modelErrors Map to satisfy DSH 0.1.5+ PiAiProviderProfile interface (JKW)
- b1f4ca2 chore: ship lib and GitHub install spec for public repo (JKW)

#### 14. 🧩 `dsh-workspace-path` (v0.4.0)
- 9a4fc78 fix: defer rpc.handle with ctx.inject([connection, webServer]) for cordis 4 (JKW)
- 6b8a963 fix: declare webServer in inject for cordis 4 rpc handle (JKW)
- 0cdfefa fix: 重构 Hero 工作区选择器，直接调用原生目录选择器并展示项目路径摘要 (JKW)


---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-9.16.0-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-9.16.0-Windows-portable.zip`

---
*由 JackDSH Release Helper 自动提炼生成。*
