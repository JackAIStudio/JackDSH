# Jack DSH「三剑客」Profile 随身配置套件

专为 **Jack DSH** 打造的轻量级（< 15KB）、高强度加密漫游配置工具。

实现无论在异地网吧、全新 Windows 电脑还是备用 Mac 上，**3 秒内满血恢复 Grok、Gemini、DeepSeek 登录态与自主编码偏好**。

---

## 包含的核心资产（精准三剑客）

| 资产 | 说明 | 来源 |
| :--- | :--- | :--- |
| **Grok OAuth** | 组织 (Team ID)、用户 ID、长期 Refresh Token，免翻墙重新授权 | `grok-oauth.json` |
| **Gemini OAuth** | 关联 Google Cloud Project ID、账号授权状态 | `gemini-oauth.json` |
| **DeepSeek Key** | 官方原生 API Key（其余测试 Key 自动脱敏剔除） | `.credentials.yaml` |
| **Jack 模式** | 出厂级高效自主编码 Agent 预设（移除阻塞提问） | `.agent-presets/jack/` |
| **核心偏好** | 默认模型 (DeepSeek Flash Max)、全权限预设（已剥离内网私有代理） | `settings.yaml` |

---

## 使用指南

### 1. 主力机：一键导出配置（出门前）

在主力机终端运行：
```bash
node tools/profile/export.mjs
# 或运行 export.sh
```
- 会提示输入自定义解密口令（建议 6 位以上）；
- 瞬间生成单个加密文件：`jack-profile.enc`（体积仅 ~15KB）；
- 把此文件保存到微云、微信文件传输助手、私有网盘或 U 盘随身携带。

---

### 2. 网吧 / 异地电脑：一键恢复（到店后）

#### Windows 场景（便携版）
1. 从网盘下载 **Jack DSH Windows 便携版**（绿色解压即用）；
2. 解压到 `D:\JackDSH\`；
3. 将随身携带的 `jack-profile.enc` 放到解压目录下；
4. 双击运行 `tools/profile/import.bat`，输入口令；
5. **打开 `JackDSH.exe`**：
   - 顶部/侧边栏已自动挂载今日工作区 `D:\JackDSH\data\JackDSH\days\YYYY-MM-DD`；
   - 默认模式为 **Jack 模式**；
   - Grok、Gemini、DeepSeek **全部直接在线可用**！

#### macOS 场景
在终端运行：
```bash
node tools/profile/import.mjs -i /path/to/jack-profile.enc
```
输入口令，自动注入 `~/Library/Application Support/JackDSH/dsh-data/`。

---

## 安全保障
- 底层采用 Node.js 原生标准 **AES-256-GCM** 高强度加密，带 scrypt 密钥派生与随机 Salt/IV；
- 离开网吧时，永久删除解压目录或直接重启电脑，零私密凭据残留。
