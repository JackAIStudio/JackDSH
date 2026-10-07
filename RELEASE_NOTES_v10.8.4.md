## 🚀 JackDSH v10.8.4 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v10.8.4**！  
本次更新全面同步了自研插件生态的最新能力，修复了多项关键体验问题，并对系统稳定性与跨平台构建进行了系统性加固。

---

### 🖥️ 客户端与构建底层更新

- **内置 BrowserSkill 升级至 0.3.1**：随包分发的 `browser-skill-dsh-plugin` 由 0.3.0 对齐到 0.3.1，内置 `bsk` CLI 同步更新，浏览器自动化能力跟进上游修复。
- **跨平台构建加固**：修复 `extraResources` 资源过滤规则长期失效的问题。iCloud FileProvider 在批量写盘时会遗留 `plugins 2` / `bin 2` 一类 `dataless` 残骸目录，导致打包以 `EDEADLK`（Resource deadlock avoided）中断。过滤规则改为「包含模式在前、排除模式在后」，并统一剔除 `<名称> <数字>` 形态的残骸，Windows 与 macOS 构建不再受本机同步状态影响。

---

### ✨ 核心更新亮点

#### 1. 🧩 `dsh-deepseek-balance` (v0.2.3)
- cebd2f9 重构(ui): 升级为统一模型配额状态条，聚合展示DeepSeek/Gemini/Grok额度 (吴杰克Jack)

#### 2. 🧩 `dsh-gemini-oauth` (v0.2.6)
- 3cc3742 重构(ui): 接入统一模型配额总线，移除独立Dock插槽注入与脆弱CSS (吴杰克Jack)

#### 3. 🧩 `dsh-grok-oauth` (v0.1.9)
- a84de9d 重构(ui): 接入统一模型配额总线，移除独立Dock插槽注入与脆弱CSS (吴杰克Jack)
- d66665f fix(host): bump spoofed Grok CLI version header 1.0.4 -> 1.0.40 to clear xAI 426 outdated-client gate (吴杰克Jack)

#### 4. 🧩 `dsh-paste-path` (v0.5.0)
- 24be8cb feat(ui): 补齐图片右键上下文菜单（支持二进制复制、新标签打开与下载） (吴杰克Jack)
- cddcb55 feat: 支持全类型附件绝对路径快速复制、访达定位与右键菜单，彻底修复图片点击灵敏度 (吴杰克Jack)

#### 5. 🧩 `dsh-session-navigator` (v0.5.0)
- c97b937 feat(v0.5.0): 修复跨端传送落列表底部与 401 空白页，新增目标端通知与自动切换 (吴杰克Jack)

#### 6. 🧩 `dsh-turn-bookmarks` (v0.1.1)
- cf43018 fix(client): 书签轨去线化极简改造，移除垂直导轨线并下沉胶囊层级避让遮挡 (吴杰克Jack)
- d30e7c1 feat: 提示词就地编辑保留会话引用，支持查看、移除与完整回填 (吴杰克Jack)
- 8605593 fix(client): 优化左侧书签轨UI，移除胶囊内冗余五角星，增加可见性与防遮挡避让机制 (吴杰克Jack)
- 2bb4490 fix: 修复 v4 格式解析，精准截断首轮与后续轮次，杜绝重复历史消息 (吴杰克Jack)
- 70a2a76 feat: 增强提示词就地编辑与分叉重新运行功能 (类似 Codex/ChatGPT) (吴杰克Jack)

#### 7. 🧩 `dsh-workbuddy-dual` (v0.1.2)
- 90246eb feat(catalog): 动态模型目录与可选思考强度 (吴杰克Jack)

#### 8. 🧩 `dsh-workspace-path` (v0.4.0)
- 91bd412 feat(dev-tools): add git-status and custom-dev-command quick launch buttons to hero, header and workspace picker (吴杰克Jack)
- bf3aba0 feat(hero): 新会话输入框上方增加一键复制路径与外部应用打开菜单 (吴杰克Jack)


---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-10.8.4-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-10.8.4-Windows-portable.zip`

---
*由 JackDSH Release Helper 自动提炼生成。*
