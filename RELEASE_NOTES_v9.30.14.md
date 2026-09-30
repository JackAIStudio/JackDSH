## 🚀 JackDSH v9.30.14 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v9.30.14**！  
本次更新全面同步了自研插件生态的最新能力，修复了多项关键体验问题，并对系统稳定性与跨平台构建进行了系统性加固。

---

### ✨ 核心更新亮点

#### 🌟 社区开源精选：`dsh-better-sidebar` (v0.22.1) 正式接入
- **全面升级至开源社区稳定版**：100% 接入社区针对 DSH 0.1.7-rc 内核打磨的官方最终稳定版本 `0.22.1`，告别私有分支维护负担；
- **全方位 UIUX 重构**：带来全新的文件变动树 (ChangesTab / DiffPane / GitLens)、任务图与任务看板 (TasksGraph / TeamBoard)，深度对齐官方极简视觉规范；
- **多标签开箱即用**：开箱支持 CodeMirror 多语言代码查看编辑、Markdown 与 Mermaid 流程图实时渲染、会话级独立右侧栏与子代理状态抽屉。

#### 1. 🧩 `dsh-app-badge` (v0.1.1)
- 9b0c79f feat: add 2.5s clear delay debounce and 60s manual test hold (JKW)

#### 2. 🧩 `dsh-gemini-oauth` (v0.2.6)
- d585604 feat(account): show validation url on Google 403 VALIDATION_REQUIRED and filter invalid quota (JKW)

#### 3. 🧩 `dsh-grok-oauth` (v0.1.9)
- 1bf3212 fix(client): eliminate settingsScope property access on ctx to avoid Cordis proxy trap error (JKW)
- e4a670a fix(client): prune unused client injection to slots and locale only to prevent boot timeout (JKW)
- 874f0b0 fix(catalog): sync current models from host into settings and update default catalog (JKW)
- 3b28160 fix(client): graceful fallback when settingsScope is not injected (JKW)

#### 4. 🧩 `dsh-plugin-dashboard` (v0.1.2)
- 08f8682 feat(badge): support persistent test badge with manual clear and permission prompt (JKW)

#### 5. 🧩 `dsh-reminder` (v0.1.5)
- aa6c4af fix(reminder): prevent audio duplicate on JackDSH native app and support cross-version events (JKW)

#### 6. 🧩 `dsh-session-navigator` (v0.4.7)
- 7c32497 fix(transfer): 自动附加 targetToken 并走 hash 锚点直达，解决 401 鉴权阻断 (JKW)
- de7c2a9 fix(transfer): 支持文件夹类型附件递归同步与端口双向互传验证 (JKW)
- 17b4a5d feat: release v0.4.7 aligning with DSH 0.1.7 ReferenceChip bubble style and composer paste (JKW)

#### 7. 🧩 `dsh-turn-bookmarks` (v0.1.0)
- 459c505 feat(search): align UI with official minimalist style, add arrow key navigation and absolute scroll center (JKW)
- 576470d fix(home): 数据目录跟随 DSH_HOME，不再写死 ~/.dsh (JKW)
- e5866db fix(client): 后端同步绑定发起会话，杜绝收藏串会话 (JKW)

#### 8. 🧩 `dsh-workbuddy-dual` (v0.1.1)
- 830b481 feat: broaden peerDependencies for DSH 0.1.5-rc.2+ and add settings section (JKW)

#### 9. 🧩 `dsh-workspace-path` (v0.4.0)
- e1db9a3 feat(badge): redesign workspace path badge into action group with one-click copy and new session (JKW)


---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-9.30.14-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-9.30.14-Windows-portable.zip`

---
*由 JackDSH Release Helper 自动提炼生成。*
