#!/usr/bin/env node
import { createServer } from 'node:http'
import { parse as parseUrl } from 'node:url'
import { WebSocketServer, WebSocket } from 'ws'

const PORTS = (process.env.PORTS || process.env.PORT || '13080,13081')
  .split(',')
  .map((p) => parseInt(p.trim(), 10))
  .filter(Boolean)

const HOST = process.env.HOST || '0.0.0.0'
const RELAY_TOKEN = (process.env.RELAY_TOKEN || 'jackdsh-default-secret-token').trim()
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true'

function log(...args) {
  const time = new Date().toISOString()
  console.log(`[${time}] [JackDSH-Relay]`, ...args)
}

function debug(...args) {
  if (DEBUG) log('[DEBUG]', ...args)
}

// 核心：多客户端独立管道池 (Clients Pool)
// 键为 clientId (如 dsh_darwin, jackdsh_darwin)，各客户端独立共存，绝不互相挤下线！
const clients = new Map()
const pendingRequests = new Map()
const startTime = Date.now()

function resolveTargetClient(req) {
  if (clients.size === 0) return null

  const parsed = parseUrl(req.url, true)

  // 1. 显式 Query 参数: ?node=xxx 或 ?client_id=xxx
  const queryNode = parsed.query.node || parsed.query.client_id
  if (queryNode && clients.has(queryNode)) {
    const c = clients.get(queryNode)
    if (c.ws.readyState === WebSocket.OPEN) return c
  }

  // 2. 显式 Header: x-dsh-node
  const headerNode = req.headers['x-dsh-node']
  if (headerNode && clients.has(headerNode)) {
    const c = clients.get(headerNode)
    if (c.ws.readyState === WebSocket.OPEN) return c
  }

  // 3. 设备绑定的 Cookie: dsh_node=xxx
  const cookieHeader = req.headers.cookie || ''
  const match = cookieHeader.match(/dsh_node=([^;]+)/)
  if (match && clients.has(match[1])) {
    const c = clients.get(match[1])
    if (c.ws.readyState === WebSocket.OPEN) return c
  }

  // 4. 兜底策略：选择最新连接的活跃客户端，绝不断开其他客户端
  let latest = null
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!latest || client.connectedAt > latest.connectedAt) {
        latest = client
      }
    }
  }
  return latest
}

function createRelayApp(port) {
  const server = createServer((req, res) => {
    const parsed = parseUrl(req.url, true)
    const pathname = parsed.pathname || '/'

    // 1. 健康检查与状态端点
    if (pathname === '/relay/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, port, timestamp: Date.now() }))
      return
    }

    if (pathname === '/relay/status') {
      const onlineList = []
      for (const [id, c] of clients.entries()) {
        if (c.ws.readyState === WebSocket.OPEN) {
          onlineList.push({ id, info: c.info, connectedAt: new Date(c.connectedAt).toISOString() })
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: true,
          clientConnected: onlineList.length > 0,
          onlineCount: onlineList.length,
          clients: onlineList,
          activeRequests: pendingRequests.size,
          uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
          port,
        }),
      )
      return
    }

    // 2. 匹配目标客户端
    const targetClient = resolveTargetClient(req)

    if (!targetClient) {
      const isHtml = (req.headers.accept || '').includes('text/html')
      if (isHtml) {
        res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JackDSH 手机远程 · 客户端未就绪</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; max-width: 440px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
    p { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 20px; }
    .tag { display: inline-block; background: #27272a; color: #fbbf24; font-size: 12px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 20px; font-weight: 500; }
    .btn { display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; }
    .btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔌</div>
    <div class="tag">中继服务在线 · 电脑端离线</div>
    <h1>JackDSH 客户端未在线</h1>
    <p>云端中转服务器工作正常，但尚未检测到已连接的电脑端。<br>请确认电脑上的 JackDSH 已打开并开启了公网远程中转。</p>
    <button class="btn" onclick="location.reload()">刷新重试</button>
  </div>
</body>
</html>`)
      } else {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'client_offline', message: 'No JackDSH client is currently connected' }))
      }
      return
    }

    // 3. 将 HTTP 请求转发给目标客户端
    const reqId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    debug(`Proxying ${req.method} ${req.url} -> [${targetClient.id}] (id: ${reqId})`)

    const timeoutTimer = setTimeout(() => {
      if (pendingRequests.has(reqId)) {
        pendingRequests.delete(reqId)
        if (!res.headersSent) {
          res.writeHead(504, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'gateway_timeout', message: 'Client response timed out' }))
        } else {
          res.destroy()
        }
        log(`Request ${reqId} to [${targetClient.id}] timed out`)
      }
    }, 60000)

    pendingRequests.set(reqId, { req, res, timeoutTimer, targetClientId: targetClient.id })

    const headers = { ...req.headers }
    headers['x-forwarded-for'] = req.socket.remoteAddress || ''
    headers['x-forwarded-proto'] = 'https'
    headers['x-relay-target-node'] = targetClient.id

    targetClient.send({
      type: 'req_start',
      reqId,
      method: req.method,
      url: req.url,
      headers,
    })

    req.on('data', (chunk) => {
      if (targetClient.ws.readyState === WebSocket.OPEN) {
        targetClient.send({
          type: 'req_data',
          reqId,
          chunk: chunk.toString('base64'),
        })
      }
    })

    req.on('end', () => {
      if (targetClient.ws.readyState === WebSocket.OPEN) {
        targetClient.send({
          type: 'req_end',
          reqId,
        })
      }
    })

    req.on('error', (err) => {
      log(`Request ${reqId} error:`, err.message)
      if (pendingRequests.has(reqId)) {
        clearTimeout(timeoutTimer)
        pendingRequests.delete(reqId)
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'request_error', message: err.message }))
        }
      }
    })
  })

  // WebSocket Server 接收客户端长连
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const parsed = parseUrl(req.url, true)
    const pathname = parsed.pathname || '/'

    if (pathname !== '/relay/tunnel') {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
      socket.destroy()
      return
    }

    const token =
      parsed.query.token ||
      req.headers['x-relay-token'] ||
      (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''))

    if (!token || token !== RELAY_TOKEN) {
      log(`Unauthorized tunnel attempt from ${req.socket.remoteAddress}`)
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', (ws, req) => {
    const parsed = parseUrl(req.url, true)
    const clientId = parsed.query.client_id || `client_${Math.random().toString(36).slice(2, 8)}`
    const clientInfo = parsed.query.info || ''

    log(`Client connected: ${clientId} (${clientInfo || 'no info'}) on port ${port}`)

    // 核心改进：若同一客户端断线重连，仅平滑替换它自己的旧连接；若不同客户端，并存不踢！
    if (clients.has(clientId)) {
      const old = clients.get(clientId)
      if (old.ws !== ws) {
        log(`Replacing stale connection for same clientId: ${clientId}`)
        try { old.ws.close(1000, 'Replaced by newer connection with same clientId') } catch {}
      }
    }

    const clientHandle = {
      id: clientId,
      info: clientInfo,
      port,
      ws,
      connectedAt: Date.now(),
      isAlive: true,
      send(obj) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(obj))
        }
      },
    }

    clients.set(clientId, clientHandle)
    log(`Active clients count: ${clients.size} [${Array.from(clients.keys()).join(', ')}]`)

    clientHandle.send({
      type: 'connected',
      clientId,
      serverTime: Date.now(),
      version: '1.2.0',
    })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'pong') {
          clientHandle.isAlive = true
          return
        }
        if (msg.type === 'ping') {
          clientHandle.send({ type: 'pong' })
          return
        }

        const { reqId } = msg
        if (!reqId || !pendingRequests.has(reqId)) return

        const pending = pendingRequests.get(reqId)

        if (msg.type === 'res_start') {
          clearTimeout(pending.timeoutTimer)
          const cleanHeaders = { ...msg.headers }
          delete cleanHeaders['transfer-encoding']
          delete cleanHeaders['connection']

          // 注入节点识别 Cookie，让手机后续自动保持对该客户端的连贯访问
          const existingCookies = cleanHeaders['set-cookie']
          const nodeCookie = `dsh_node=${clientId}; Path=/; SameSite=Lax; Max-Age=2592000`
          if (Array.isArray(existingCookies)) {
            cleanHeaders['set-cookie'] = [...existingCookies, nodeCookie]
          } else if (typeof existingCookies === 'string') {
            cleanHeaders['set-cookie'] = [existingCookies, nodeCookie]
          } else {
            cleanHeaders['set-cookie'] = [nodeCookie]
          }

          pending.res.writeHead(msg.status || 200, cleanHeaders)
          return
        }

        if (msg.type === 'res_data') {
          if (msg.chunk) {
            pending.res.write(Buffer.from(msg.chunk, 'base64'))
          }
          return
        }

        if (msg.type === 'res_end') {
          pending.res.end()
          pendingRequests.delete(reqId)
          debug(`Completed request ${reqId}`)
          return
        }

        if (msg.type === 'res_error') {
          clearTimeout(pending.timeoutTimer)
          log(`Client ${clientId} error for ${reqId}:`, msg.message)
          if (!pending.res.headersSent) {
            pending.res.writeHead(502, { 'Content-Type': 'application/json' })
            pending.res.end(JSON.stringify({ error: 'client_proxy_error', message: msg.message }))
          } else {
            pending.res.destroy()
          }
          pendingRequests.delete(reqId)
          return
        }
      } catch (err) {
        log('Failed to parse client message:', err.message)
      }
    })

    ws.on('close', (code, reason) => {
      log(`Client ${clientId} disconnected: code=${code}, reason=${reason || 'none'}`)
      if (clients.get(clientId)?.ws === ws) {
        clients.delete(clientId)
      }
      log(`Remaining active clients: ${clients.size} [${Array.from(clients.keys()).join(', ')}]`)

      // 仅终止属于该客户端且未完成的请求，绝不波及其他客户端
      for (const [id, pending] of pendingRequests.entries()) {
        if (pending.targetClientId === clientId) {
          clearTimeout(pending.timeoutTimer)
          if (!pending.res.headersSent) {
            pending.res.writeHead(502, { 'Content-Type': 'application/json' })
            pending.res.end(JSON.stringify({ error: 'client_disconnected', message: 'Target client closed connection' }))
          } else {
            pending.res.destroy()
          }
          pendingRequests.delete(id)
        }
      }
    })

    ws.on('error', (err) => {
      log(`Client ${clientId} socket error:`, err.message)
    })
  })

  server.listen(port, HOST, () => {
    log(`Relay channel listening on ${HOST}:${port}`)
  })

  return server
}

// 启动配置的所有端口通道
const runningServers = PORTS.map((port) => createRelayApp(port))

// 定时全客户端心跳
const heartbeatInterval = setInterval(() => {
  for (const [id, client] of clients.entries()) {
    if (!client.isAlive) {
      log(`Client ${id} missed heartbeat, terminating`)
      client.ws.terminate()
      clients.delete(id)
      continue
    }
    client.isAlive = false
    client.send({ type: 'ping' })
  }
}, 20000)

process.on('SIGTERM', () => {
  clearInterval(heartbeatInterval)
  for (const s of runningServers) s.close()
  process.exit(0)
})
