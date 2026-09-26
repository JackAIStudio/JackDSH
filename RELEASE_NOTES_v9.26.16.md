## 🚀 JackDSH v9.26.16 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端 **v9.26.16**。

本次是**应用自身**的更新，不涉及任何自研插件（插件清单与 v9.23.18 完全一致）。

---

### 🎯 本次重点：内置自动更新

从这一版起，JackDSH 会自己检查新版本，不必再手动来 Releases 页面下载。

- **帮助菜单新增「检查更新…」**，可随时手动检查
- 启动后会自动静默检查一次（延后 8 秒，不干扰首屏）
- 发现新版本先**问你**，不会偷偷下载：确认后才在后台下载，进度显示在 Dock 图标上
- 下载完成再问你一次，确认后才重启安装
- 安装前会先停掉 DSH 服务，避免留下占着端口的孤儿进程

为支持自动更新，macOS 构建新增了 `zip` 产物：electron-updater 只能拿 zip 当更新载荷，dmg 无法自更新。更新清单 `latest-mac.yml` 也随之修正——此前它只列 dmg，等于清单是无效的。

> ⚠️ **引导期说明**：本版是第一个带更新器的版本，因此 **v9.23.18 的用户不会被自动升上来**，需要手动装一次本版。自动更新从**再下一个版本**开始对大家生效。

---

### 🧹 移除 Preview 版本形态

Preview 是早期为「两套实例互相修复」保留的第二通道，实际已长期不用（从未发布过），且它的构建配置已与主配置漂移。本版将其清理干净，只保留单一正式通道：

- 删除 `electron-builder.preview.yml`（与主配置重复，且已漏掉部分打包排除项）
- 删除 `build:mac:preview` / `dev:preview` 脚本与 `--preview` 构建分支
- 清理应用内 5 种 Preview 身份探测、独立数据目录、独立端口 3280、通道级单实例锁

如果本机还残留 `~/Library/Application Support/jackdsh-preview`，可以放心删除。

> 💡 副作用：`pnpm dev` 现在会以正式身份启动，会与正在运行的 JackDSH 抢同一把单实例锁。本机开发前请先退出 JackDSH。

---

### ⚙️ 默认模型调整

- 默认模型改为 `deepseek-official` / `deepseek-flash`，思考档位 `max`
- 补上 `llm-deepseek.reasoningEffort: max`。这一项不能只写在 `agent-default-model`：内核在 provider 层档位缺省时会回落 `high`，而模型选择器里每行模型预挂的就是该档位，在菜单里换一次模型就会把默认打回 `high`

---

### 📄 文档修正

- 修正 README 两处与事实不符的描述：安装包**已使用 Developer ID 签名并完成 Apple 公证**（原文误称未购买证书、需手动放行）；Windows 产物是 **zip 绿色便携版**（原文误称是 .exe 安装向导）
- 内置插件清单与实际打包内容对齐：删掉早已废弃的 `DSH-better-sidebar`，补上漏写的 `dsh-fork-guard`、`dsh-image-fit`、`dsh-turn-bookmarks` 及两个社区精选包

---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-9.26.16-Mac-arm64.dmg`（已签名 + 已公证，双击零警告）
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-9.26.16-Windows-portable.zip`
- `JackDSH-9.26.16-Mac-arm64.zip` 为自动更新使用的载荷，手动安装请用 dmg

---
*JackDSH Release Helper 生成骨架，本次按 tag delta 人工重写（脚本按「近 7 天」聚合插件 commit，在无插件变更的版本里会把上一版内容重复列出）。*
