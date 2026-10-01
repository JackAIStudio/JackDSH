## 🚀 JackDSH v10.1.14 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v10.1.14**！  
自 v9.30.21 以来的变更如下。

---

### ✨ 核心更新亮点

#### 1. 🧩 `dsh-workbuddy-dual` (v0.1.2)
- 模型目录改为由 WorkBuddy `/v3/config` 动态下发（国内 / 海外各一份），不再写死模型列表。
- 按目录里的 `supportedEfforts` 暴露思考强度；只给了单个默认档的模型，按模型家族补上可选档位。
- `canDisableThinking: false` 的模型不再提供「关闭思考」。

#### 2. 🧩 `dsh-grok-oauth` (v0.1.9)
- 把伪装的 Grok CLI 版本头从 `1.0.4` 升到 `1.0.40`，避开 xAI 的 426 outdated-client 拦截。

---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: `JackDSH-10.1.14-Mac-arm64.dmg`
- **Windows 绿色免安装便携版 (x64)**: `JackDSH-10.1.14-Windows-portable.zip`

---
*由 JackDSH Release Helper 起草，并按自 v9.30.21 以来的实际提交收束。*
