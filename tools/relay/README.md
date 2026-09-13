# 🔌 JackDSH Relay (云端独立中继服务)

极轻量、跨平台的通用反向中继中转服务。专为 **JackDSH 手机远程** 提供安全、即开即用的公网穿透能力。

---

## 🌟 特性

1. **零机器绑定**：任何拥有公网 IP 的云服务器（阿里云、腾讯云、搬瓦工、AWS、甲骨文云等）10 秒即可部署；
2. **极高安全性**：客户端仅持有一个专用的应用层 Token，**没有任何服务器 Shell/SSH 执行权限**，在网吧或公用电脑随意使用无需担心服务器安全；
3. **全双工流式传输**：支持 HTTP 请求流、大文件上传（20MB）、SSE（Server-Sent Events）持续事件流；
4. **自适应端口**：客户端无论分配到 3080、3180 还是动态端口，连上中转即自动打通。

---

## 🚀 部署指南

### 方式 A：Docker 极简一键部署（推荐）

在你的任意 VPS 上执行：
```bash
docker run -d --name jackdsh-relay \
  --restart always \
  -p 13080:13080 \
  -e PORT=13080 \
  -e RELAY_TOKEN=设置你的专属安全Token \
  jackaistudio/jackdsh-relay
```

### 方式 B：Node.js / PM2 直接运行

在服务器上克隆代码或上传本目录，执行：
```bash
npm install --omit=dev
RELAY_TOKEN="设置你的专属安全Token" PORT=13080 pm2 start server.mjs --name jackdsh-relay
```

### 方式 C：挂载在现有 Caddy / Nginx 后面（带 HTTPS 证书）

Caddyfile 示例：
```caddy
your-domain.com {
    reverse_proxy 127.0.0.1:13080 {
        flush_interval -1
    }
}
```

---

## 📡 接口说明

- **Tunnel 客户端连接端点**：`wss://your-domain.com/relay/tunnel?token=YOUR_TOKEN`
- **状态探测**：`https://your-domain.com/relay/status`
- **健康检查**：`https://your-domain.com/relay/health`
- **手机远程入口**：`https://your-domain.com/mp/`
