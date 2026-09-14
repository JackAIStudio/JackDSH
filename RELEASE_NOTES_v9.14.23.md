## 🚀 JackDSH v9.14.23 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v9.14.23**！  
本次更新全面同步了自研插件生态的最新能力，修复了多项关键体验问题，并对系统稳定性与跨平台构建进行了系统性加固。

---

### ✨ 核心更新亮点

#### 🖥️ JackDSH 桌面主程序核心体验升级
- **macOS 沉浸式顶栏（hiddenInset）双击缩放与拖拽全面优化**：
  - **原生双击智能缩放**：新增 Preload 安全桥接（`src/preload/preload.cjs`）与 IPC 双向通道，在顶栏任意空白处或当前会话标题双击即可顺畅切换最大化与还原（macOS 原生 Zoom），彻底告别点击迟滞；
  - **弹性自适应微缝拖拽**：新会话空白页提供 38px 宽裕拖拽区，进入具体会话后精准收敛为 6px 顶部微缝，既杜绝误遮挡会话 Tab 交互，又保留随手拖动窗口的习惯；
  - **会话标题支持随手拖拽**：不可点击的当前会话标题赋予拖拽属性，大幅拓宽用户随手移动窗口的抓取面积；
  - **模态弹窗深度隔离防护**：当打开「设置中心」、「打开配置文件」等弹窗（`aria-modal="true"` / `role="dialog"`）时，动态彻底静默背景拖拽，确保所有弹窗内的按钮、输入框与关闭叉 100% 灵敏响应，杜绝被底层拖拽击穿；
  - **交互控件精准隔离**：各处 Tab、操作按钮、下拉菜单与链接均显式设置 `no-drag`，容器留白与拖拽区域井水不犯河水。
- **构建与 CI 发布全链路加固**：
  - **纯英文 ASCII 产物命名**：规范各平台安装包与绿色包命名，杜绝中文及特殊符号导致的打包冲突与 GitHub Release 截断乱码；
  - **原生 GitHub CLI 发布中枢**：CI 改用原生 `gh release` 命令行直接上传，修复资产更新异常与重复预打包问题；
  - **预打包强门禁机制**：打包前自动校验所有插件的入口文件存在性，杜绝缺失编译产物被打包进客户端。
- **内置工程发版与状态巡检中枢**：
  - 新增插件秒级并发 Git 扫描（`pnpm status:plugins`）与全自动发版门禁检查（`pnpm release:preflight`）。

---

### 🧩 自研插件生态更新列表

#### 1. 🧩 `dsh-app-badge` (v0.1.0)
- cada338 feat(client): 角标通知流改为单标签单例 (JKW)

#### 2. 🧩 `dsh-autostart` (v0.1.1)
- 12e67e6 feat: 升级至 0.1.1，增加实例端口冲突隔离保护与 macOS 桌面应用拉起支持 (JKW)
- f49cf1c fix(client): 补充 slots 依赖注入声明与异步容错注册 (JKW)
- 72fbcf4 feat: initial release of dsh-autostart cross-platform plugin (JKW)

#### 3. 🧩 `dsh-better-sidebar` (v0.18.0)
- e60f5c0 chore: 将 lib/ 构建产物纳入 Git 跟踪，确保无编译环境下开箱即用 (JKW)

#### 4. 🧩 `dsh-deepseek-balance` (v0.2.3)
- 3d30435 fix(client): 兼容 0.1.2 的 slots 注入与空白 composer 检测 (JKW)

#### 5. 🧩 `dsh-gemini-oauth` (v0.2.5)
- df6dc3a feat: 支持 Gemini 原生 Google 搜索并修复 0 结果抛错导致的批次短路问题 (JKW)
- 2f6def8 feat: 识别 session-title 请求，避免 Gemini thinking 吃光标题预算 (JKW)

#### 6. 🧩 `dsh-grok-oauth` (v0.1.8)
- b77c954 feat: 支持 Grok 原生 Responses 搜索并修复 0 结果抛错导致的批次短路问题 (JKW)
- b09c986 feat: grok_image_gen 在会话里显示缩略图，点击看大图 (JKW)

#### 7. 🧩 `dsh-mobile-plus` (v0.5.1)
- 57674a9 feat: 升级至 0.5.1，重构公网中转真实状态机与连通性检测，根治多实例互踢与配对码路由错位 (JKW)
- e426d55 fix(assets): 将 public/icon.png 软链接替换为实体图片文件，修复跨平台构建签名与打包异常 (JKW)
- f7d76e8 feat: 升级至 0.5.0，支持会话置顶同步、智能体长目标追踪、Web Push 离线推送与指令菜单 (JKW)
- 38bd55c feat(mobile): 升级至 0.4.8，新增移动端会话时间线导航、Token 上下文用量指示与折叠展开 (JKW)
- e9090c6 feat: 拆分 host RPC，并加上聊天顶栏面包屑与工作区上下文 (JKW)

#### 8. 🧩 `dsh-paste-path` (v0.2.0)
- 732386b refactor: Zero-UI 架构重构，原生常规粘贴（Cmd+V / Ctrl+V）静默接管与拖拽穿透 (JKW)
- c11c2a2 fix: remove duplicate trailing append so paths are cleanly inserted exactly once with linebreaks (JKW)
- c73e399 fix: enforce Shift+Enter break between each path in insertPathsToComposer (JKW)
- 756016b fix: insert multiline paths using native DSH paragraph structure <p> (JKW)
- 2bdc13c fix: keep focus on composer when clicking path button (JKW)
- 31f11d9 fix: precise single-shot multiline HTML linebreak insertion (JKW)
- f9101a9 fix: robust multiline path insertion with insertHTML and Range fallback (JKW)
- 7cdf427 fix: insert line breaks using Lexical dispatchCommand directly (JKW)

#### 9. 🧩 `dsh-plugin-dashboard` (v0.1.1)
- 0bd58ef feat: 升级至 0.1.1，支持自研插件生态 Git 巡检面板、配置迁移与版本号徽章 (JKW)
- 535024d feat: 支持模型与授权全量配置包随身迁移（安全导出与一键恢复） (JKW)
- 22c9a18 feat(ui): 增加 3 步新手向导 (Onboarding)，支持浏览器扩展连接指引与随时跳过/重温 (JKW)
- 4e8dbf2 feat: 初始化 JackDSH 插件与版本大盘 (v0.1.0) (JKW)

#### 10. 🧩 `dsh-reminder` (v0.1.5)
- e9fde21 fix(client): 本机 GUI 不再叠播完成提示音 (JKW)

#### 11. 🧩 `dsh-session-navigator` (v0.4.4)
- 37de2fc feat: 支持多窗口跨标签页实时同步置顶状态与可见性静默拉取 (JKW)
- 584f0f3 feat: 升级至 0.4.4，侧栏 ⋯ 菜单支持复制会话 ID、复制规范引用与置顶会话 (JKW)
- e3ff7e9 chore: scrub local username from session-summary fixtures (JKW)
- 845bc19 feat: 标签容量问题在根上解决，下线换地址分流（0.4.0 → 0.4.1） (JKW)
- 4b6f265 feat: 侧栏复制规范 @会话引用，普通点击不再弹窗 (JKW)
- ae6b2f5 fix(client): single-touch on trackpad via pointerdown/up and inject arrows into official search results (JKW)

#### 12. 🧩 `dsh-today` (v0.3.0)
- e4fc004 feat: 支持 JackDSH 品牌化根路径与便携模式解析，兼顾存量 dshspace 兼容 (JKW)

#### 13. 🧩 `dsh-web-restart` (v0.1.1)
- 7ae1918 fix(client): 升级至 0.1.1，增加主页面两阶段 HTML 就绪探测与等待动画，彻底消除重启 404 (JKW)

#### 14. 🧩 `dsh-web-search-follow` (v0.2.0)
- cee83d5 docs: 补全开源 README，补上 GitHub 安装与依赖说明 (JKW)
- 517a945 feat: 实现会话模型跟随搜索插件，支持 Grok、Gemini 与 DeepSeek 原生搜索及空结果平滑降级 (JKW)

#### 15. 🧩 `dsh-workbuddy-dual` (v0.1.0)
- b1f4ca2 chore: ship lib and GitHub install spec for public repo (JKW)
- 6c3621c chore: add gitignore and clean build artifacts (JKW)
- 501a508 feat: initial commit for dsh-workbuddy-dual (JKW)

#### 16. 🧩 `dsh-workspace-path` (v0.4.0)
- 0cdfefa fix: 重构 Hero 工作区选择器，直接调用原生目录选择器并展示项目路径摘要 (JKW)
- 6303361 feat: 工作区选择器默认只列项目，按天目录收在第二步 (JKW)
- 113bd2a feat: add SessionIdBadge with hover popover and quick copy to header (JKW)


---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-9.14.23-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-9.14.23-Windows-portable.zip`

---
*由 JackDSH Release Helper 自动提炼生成。*
