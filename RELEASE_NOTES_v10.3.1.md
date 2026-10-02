## 🚀 JackDSH v10.3.1 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v10.3.1**！  
本次更新全面同步了自研插件生态的最新能力，修复了多项关键体验问题，并对系统稳定性与跨平台构建进行了系统性加固。

---

### 🖥️ 客户端本体更新

- **系统级原生右键菜单**：补齐图片（二进制复制、新标签页打开、下载）与文本编辑的原生右键菜单，附件支持「在访达中定位」（`952dc1e`）

---

### ✨ 核心更新亮点

#### 1. 🧩 `dsh-app-badge` (v0.1.1)
- 9b0c79f feat: add 2.5s clear delay debounce and 60s manual test hold (JKW)

#### 2. 🧩 `dsh-deepseek-balance` (v0.2.3)
- cebd2f9 重构(ui): 升级为统一模型配额状态条，聚合展示DeepSeek/Gemini/Grok额度 (吴杰克Jack)

#### 3. 🧩 `dsh-gemini-oauth` (v0.2.6)
- 3cc3742 重构(ui): 接入统一模型配额总线，移除独立Dock插槽注入与脆弱CSS (吴杰克Jack)
- d585604 feat(account): show validation url on Google 403 VALIDATION_REQUIRED and filter invalid quota (JKW)

#### 4. 🧩 `dsh-grok-oauth` (v0.1.9)
- a84de9d 重构(ui): 接入统一模型配额总线，移除独立Dock插槽注入与脆弱CSS (吴杰克Jack)
- d66665f fix(host): bump spoofed Grok CLI version header 1.0.4 -> 1.0.40 to clear xAI 426 outdated-client gate (吴杰克Jack)
- 1bf3212 fix(client): eliminate settingsScope property access on ctx to avoid Cordis proxy trap error (JKW)
- e4a670a fix(client): prune unused client injection to slots and locale only to prevent boot timeout (JKW)
- 874f0b0 fix(catalog): sync current models from host into settings and update default catalog (JKW)
- 3b28160 fix(client): graceful fallback when settingsScope is not injected (JKW)

#### 5. 🧩 `dsh-paste-path` (v0.5.0)
- 24be8cb feat(ui): 补齐图片右键上下文菜单（支持二进制复制、新标签打开与下载） (吴杰克Jack)
- cddcb55 feat: 支持全类型附件绝对路径快速复制、访达定位与右键菜单，彻底修复图片点击灵敏度 (吴杰克Jack)

#### 6. 🧩 `dsh-plugin-dashboard` (v0.1.2)
- 08f8682 feat(badge): support persistent test badge with manual clear and permission prompt (JKW)

#### 7. 🧩 `dsh-reminder` (v0.1.5)
- aa6c4af fix(reminder): prevent audio duplicate on JackDSH native app and support cross-version events (JKW)

#### 8. 🧩 `dsh-session-navigator` (v0.5.0)
- c97b937 feat(v0.5.0): 修复跨端传送落列表底部与 401 空白页，新增目标端通知与自动切换 (吴杰克Jack)
- 1c084fa fix(client): 彻底修复显式跨端口/跨源链接(如3080)在渲染会话胶囊时被抹掉origin并强行篡改成当前origin的致命Bug (吴杰克Jack)
- 187118c fix(client): 修复聊天正文中显式跨端口/跨端链接(如3080)被误改写并劫持至当前origin(3180)的问题 (吴杰克Jack)
- 7c32497 fix(transfer): 自动附加 targetToken 并走 hash 锚点直达，解决 401 鉴权阻断 (JKW)
- de7c2a9 fix(transfer): 支持文件夹类型附件递归同步与端口双向互传验证 (JKW)
- 17b4a5d feat: release v0.4.7 aligning with DSH 0.1.7 ReferenceChip bubble style and composer paste (JKW)

#### 9. 🧩 `dsh-turn-bookmarks` (v0.1.1)
- 2bb4490 fix: 修复 v4 格式解析，精准截断首轮与后续轮次，杜绝重复历史消息 (吴杰克Jack)
- 70a2a76 feat: 增强提示词就地编辑与分叉重新运行功能 (类似 Codex/ChatGPT) (吴杰克Jack)
- 1acda3e feat(rail): 支持读取官方大纲懒加载历史轮次问答摘要，消除未加载占位提示 (吴杰克Jack)
- 386d881 fix(client): 修复刷新后会话ID误识别为侧栏首项导致左侧收藏导轨瞬间消失的问题 (吴杰克Jack)
- 459c505 feat(search): align UI with official minimalist style, add arrow key navigation and absolute scroll center (JKW)

#### 10. 🧩 `dsh-workbuddy-dual` (v0.1.2)
- 90246eb feat(catalog): 动态模型目录与可选思考强度 (吴杰克Jack)
- e3456cb feat(auth): 支持新版 WorkBuddy 加密凭证解密与模型双轨并发适配 (v0.1.2) (吴杰克Jack)
- 830b481 feat: broaden peerDependencies for DSH 0.1.5-rc.2+ and add settings section (JKW)

#### 11. 🧩 `dsh-workspace-path` (v0.4.0)
- e1db9a3 feat(badge): redesign workspace path badge into action group with one-click copy and new session (JKW)


---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-10.3.1-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-10.3.1-Windows-portable.zip`

---
*由 JackDSH Release Helper 自动提炼生成。*
