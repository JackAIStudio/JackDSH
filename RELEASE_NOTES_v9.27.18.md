## 🚀 JackDSH v9.27.18 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v9.27.18**！  
本次更新全面同步了自研插件生态的最新能力，修复了多项关键体验问题，并对系统稳定性与跨平台构建进行了系统性加固。

---

### ✨ 核心更新亮点

#### 🌟 核心基座与架构重大升级
- **DeepSeek Harness 官方底座全面升级至 v0.1.7-rc.2**：原生解锁侧边栏会话置顶（📌 图钉）、会话归档（🗃️ 抽屉）、侧栏插件快捷入口（❖ 插件）与官方标准 ReferenceChip 会话气泡引用；
- **智能 Node.js 运行时调度体系 (`resolveNodeBinary`)**：后台服务调度优先选用系统原生纯正 Node.js 运行时，彻底解决 Electron-as-Node 模式对官方底层 C++ 原生模块 (`node-addon-require-builtin`) 的 V8 上下文指纹校验阻断，提升长期运行稳定性与冷启动速度。

#### 1. 🧩 `dsh-app-badge` (v0.1.1)
- 9b0c79f feat: add 2.5s clear delay debounce and 60s manual test hold (JKW)

#### 2. 🧩 `dsh-cut-studio` (v0.1.0)
- 59cbaa2 feat: add standalone workbench mode, dev server, and timeline playhead enhancements (JKW)

#### 3. 🧩 `dsh-fork-guard` (v0.1.0)
- a28e845 fix: declare dsh.bundle patch and add cordis.patch.yml (JKW)
- 56e6085 feat: initial commit of dsh-fork-guard (JKW)

#### 4. 🧩 `dsh-gemini-oauth` (v0.2.6)
- d585604 feat(account): show validation url on Google 403 VALIDATION_REQUIRED and filter invalid quota (JKW)
- bf63bd6 fix(chip): 状态栏额度指示只聚焦 5 小时窗口，周限额不再抢占变色 (JKW)

#### 5. 🧩 `dsh-grok-oauth` (v0.1.9)
- 3b28160 fix(client): graceful fallback when settingsScope is not injected (JKW)
- 4e71173 fix(adapter): resolve attached image paths into the tool execution world (JKW)

#### 6. 🧩 `dsh-mobile-plus` (v0.5.3)
- 4af785a feat: 升级至 0.5.3，连接中界面可直接进入最近会话 (JKW)

#### 7. 🧩 `dsh-paste-path` (v0.4.0)
- 00ae0fd feat(v0.4.0): read exact drop paths from Electron's getPathForFile bridge (JKW)

#### 8. 🧩 `dsh-plugin-dashboard` (v0.1.2)
- 08f8682 feat(badge): support persistent test badge with manual clear and permission prompt (JKW)

#### 9. 🧩 `dsh-reminder` (v0.1.5)
- aa6c4af fix(reminder): prevent audio duplicate on JackDSH native app and support cross-version events (JKW)

#### 10. 🧩 `dsh-session-navigator` (v0.4.7)
- 17b4a5d feat: release v0.4.7 aligning with DSH 0.1.7 ReferenceChip bubble style and composer paste (JKW)
- 72009b1 fix(client): 补齐 fork 会话的标题，修侧栏回退成目录名 (JKW)
- de16ab4 fix: 置顶/检索/直达改走本档案 $DSH_HOME（修跨实例串味） (JKW)

#### 11. 🧩 `dsh-turn-bookmarks` (v0.1.0)
- 459c505 feat(search): align UI with official minimalist style, add arrow key navigation and absolute scroll center (JKW)
- 576470d fix(home): 数据目录跟随 DSH_HOME，不再写死 ~/.dsh (JKW)
- e5866db fix(client): 后端同步绑定发起会话，杜绝收藏串会话 (JKW)
- 37acde2 docs: 同步 README 至双轨架构，移除已废弃的仅看收藏过滤模式说明 (JKW)
- efd8377 fix(shortcuts): 移除全局 / 与 Esc 快捷键劫持，搜索改为纯鼠标操作 (JKW)
- 1301d6d feat(client): 重构为双轨架构，左侧专属书签轨 + 独立受控浮层 (JKW)

#### 12. 🧩 `dsh-web-restart` (v0.1.1)
- 535fd36 fix: hand desktop restarts back to the JackDSH process tree (JKW)

#### 13. 🧩 `dsh-workbuddy-dual` (v0.1.1)
- 830b481 feat: broaden peerDependencies for DSH 0.1.5-rc.2+ and add settings section (JKW)
- 74eb14c fix(adapter): resolve attached image paths into the tool execution world (JKW)

#### 14. 🧩 `dsh-workspace-path` (v0.4.0)
- e1db9a3 feat(badge): redesign workspace path badge into action group with one-click copy and new session (JKW)
- 0e44a36 fix: register workspace rpc from the injected webServer context (JKW)


---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-9.27.18-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-9.27.18-Windows-portable.zip`

---
*由 JackDSH Release Helper 自动提炼生成。*
