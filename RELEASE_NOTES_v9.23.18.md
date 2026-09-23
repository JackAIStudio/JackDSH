## 🚀 JackDSH v9.23.18 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v9.23.18**！  
本次更新全面同步了自研插件生态的最新能力，修复了多项关键体验问题，并对系统稳定性与跨平台构建进行了系统性加固。

---

### ✨ 核心更新亮点

#### 🛡️ 修复：内置 bsk 自更新不再破坏安装包代码签名

这是本次最重要的修复，直接影响发行包能否被 Gatekeeper 接受。

BrowserSkill 的 `bsk` 守护进程会定期访问
`github.com/Tencent/BrowserSkill/releases/latest`，发现新版本就**原地替换自己的
可执行文件**。客户端此前把 `runtime/bin` 放在 PATH 最前，守护进程因此从 `.app`
内部启动，自更新时把新二进制写回了包内：

```
file modified: JackDSH.app/Contents/Resources/runtime/bin/bsk
JackDSH.app: a sealed resource is missing or invalid
```

macOS 的代码签名是对整个 bundle 的密封校验（Sealed Resources），包内任何文件被
改写都会让签名失效。开发机 Gatekeeper 关闭时还能启动，但这样的包分发出去会被
Gatekeeper 拒绝，公证也必然失败。

- **搬到包外**：启动时把内置 bsk 复制到 `<DSH_HOME>/bin/bsk`，自更新从此只写
  用户目录
- **钉死路径**：自动向 `cordis.patch.yml` 注入 `browserskill.bskPath`，指向包外副本
- **PATH 前置**：`<DSH_HOME>/bin` 排在 `runtime/bin` 之前，agent 在 shell 里
  裸敲 `bsk` 也走包外那份；已有自定义配置会被保留，只校准 `bskPath` 一行
- **不反向降级**：包外副本已存在时不覆盖，避免旧包把用户已更新的 bsk 顶回去

实测验证：在包外副本上执行真实自更新（0.3.0 → 0.3.1），包内副本哈希纹丝不动，
`.app` 签名经 `codesign --verify --deep --strict` 校验依然有效。

#### 🧹 修复：配置文件重复堆积（自愈）

`cordis.patch.yml` 中 `# 手机远程公网中转入口` 这一行曾累积到 **112 份**，
把配置文件从 33 行有效内容撑到 152 行。原因是替换用的正则只匹配 `- id:` 之后的
区间，前面的注释留在原地，于是每次启动多追加一行。

新逻辑会把连续的重复注释一并吞掉再写回唯一一份：**一次启动即完成清理，之后幂等**。
实测 112 行 → 1 行。

#### 🔧 修复：全新安装首次启动即写入完整配置

`ensureCordisPatch` 在配置文件不存在时会提前返回，导致全新安装必须启动第二次
才能拿到 Gemini 代理与 BrowserSkill 配置块。现已改为首次启动一次性补齐。

#### ⭐️ 核心修复：限制子代理递归与并行，防一轮任务烧穿余额

内置「Jack 模式」预设此前未限制子代理的递归深度与并行数量，实测一轮调研任务
派生 **18 个子代理（3 层递归）**，5 分钟内耗尽账户余额并触发 402。

- **斩断递归**：`tool-subagent` / `tool-subagent-fork` 的 `maxDepth` 由官方默认
  3 降为 **1**（只有主会话能派子代理），并 deny 掉 `subagent`、`subagent_fork`、
  `ralph`、`workflow` 四个工具，从工具面再加一道保险
- **封堵并行旁路**：`workflow-worker-thread` 显式设 `maxConcurrentAgents: 3`、
  `maxTotalAgents: 24`。workflow 引擎直连 subagent 服务、**绕过工具级 maxDepth**，
  其 `maxConcurrentAgents` 默认 0 会自动解析为 `min(16, 核数-2)`（本机 11 核 = 9 个并发）
- **收紧 ralph**：`maxRounds` 64 → **8**

预期削减约 **56%** 的 token 消耗（按实测分账：3 个顶层代理自身仅占 44%，
其余全部来自它们派生出的后代代理）。本次仅压并行与递归，**不改推理档位、
不改压缩阈值**，模型能力与回答质量不受影响。

---

### 🧩 插件生态更新

#### 1. 🧩 `dsh-cut-studio` (v0.1.0)
- 59cbaa2 feat: add standalone workbench mode, dev server, and timeline playhead enhancements (JKW)
- 3339262 fix(css): adjust Twick viewport units to container heights for DSH sidebar embedding (JKW)
- ebd835b feat: initial release of dsh-cut-studio (intelligent text-based cutting & multi-track timeline studio in DSH) (JKW)

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

#### 5. 🧩 `dsh-image-fit` (v0.1.0)
- 5cdc852 feat: initial release of dsh-image-fit (scale-to-fit preview for deliverable images) (JKW)

#### 6. 🧩 `dsh-mobile-plus` (v0.5.3)
- 4af785a feat: 升级至 0.5.3，连接中界面可直接进入最近会话 (JKW)
- 8f7a83c feat: support local file path attachment previews and enhance image message UI (JKW)

#### 7. 🧩 `dsh-paste-path` (v0.4.0)
- 00ae0fd feat(v0.4.0): read exact drop paths from Electron's getPathForFile bridge (JKW)
- f48ca7b feat(v0.3.1): support Cmd+V paste for folders and bundles with unified drop bifurcation (JKW)
- 26a3fcd feat(v0.3.0): adapt to 0.1.5 Lexical composer, passthrough native files and intercept folders/.app bundles (JKW)

#### 8. 🧩 `dsh-plugin-dashboard` (v0.1.2)
- cbe3392 feat(migrate): auto-sync gemini proxy from settings to cordis.patch.yml on profile import (JKW)
- 635333a feat: hide deprecated plugins from dashboard and add paste-path/autostart metadata (JKW)

#### 9. 🧩 `dsh-session-navigator` (v0.4.6)
- 72009b1 fix(client): 补齐 fork 会话的标题，修侧栏回退成目录名 (JKW)
- de16ab4 fix: 置顶/检索/直达改走本档案 $DSH_HOME（修跨实例串味） (JKW)
- f694f37 docs: clarify DSH 0.1.5 WebSocket architecture, 12+ tabs capacity and probe timeout rationale (JKW)
- 3d9dcd7 fix(client): extend new-tab probe timeout for 0.1.5 bundle and WebSocket readiness without killing tabs (JKW)

#### 10. 🧩 `dsh-turn-bookmarks` (v0.1.0)
- 576470d fix(home): 数据目录跟随 DSH_HOME，不再写死 ~/.dsh (JKW)
- e5866db fix(client): 后端同步绑定发起会话，杜绝收藏串会话 (JKW)
- 37acde2 docs: 同步 README 至双轨架构，移除已废弃的仅看收藏过滤模式说明 (JKW)
- efd8377 fix(shortcuts): 移除全局 / 与 Esc 快捷键劫持，搜索改为纯鼠标操作 (JKW)
- 1301d6d feat(client): 重构为双轨架构，左侧专属书签轨 + 独立受控浮层 (JKW)
- 897c22e chore: add repository field pointing to JackAIStudio/dsh-turn-bookmarks (JKW)
- ecfd70c fix(layout): mount toolbar cleanly before headerCorner to never cover native sidebar (JKW)
- a28d828 fix(css): remove invasive frame pseudo-element and scope preview rules (JKW)

#### 11. 🧩 `dsh-web-restart` (v0.1.1)
- 535fd36 fix: hand desktop restarts back to the JackDSH process tree (JKW)
- caa4b7b fix(spawn): pass ELECTRON_RUN_AS_NODE and --expose-internals for Electron runtime (JKW)
- 3782dd8 feat: add launchd KeepAlive awareness to prevent port contention infinite loop (JKW)

#### 12. 🧩 `dsh-workbuddy-dual` (v0.1.1)
- 74eb14c fix(adapter): resolve attached image paths into the tool execution world (JKW)

#### 13. 🧩 `dsh-workspace-path` (v0.4.0)
- 0e44a36 fix: register workspace rpc from the injected webServer context (JKW)
- 9a4fc78 fix: defer rpc.handle with ctx.inject([connection, webServer]) for cordis 4 (JKW)
- 6b8a963 fix: declare webServer in inject for cordis 4 rpc handle (JKW)


---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-9.23.18-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-9.23.18-Windows-portable.zip`

---
*由 JackDSH Release Helper 自动提炼生成。*
