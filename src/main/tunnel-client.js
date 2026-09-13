import { request as httpRequest } from 'node:http'
import { EventEmitter } from 'node:events'
import { WebSocket } from 'ws'

export class TunnelClient extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} options.relayServer - e.g. "wss://relay.example.com/relay/tunnel"
   * @param {string} options.token - authentication token
   * @param {number} options.localPort - local port of JackDSH (e.g. 3180)
   * @param {string} [options.clientId] - client identity
   * @param {string} [options.clientInfo] - client description
   */
  constructor(options) {
    super()
    this.relayServer = (options.relayServer || '').trim()
    this.token = (options.token || '').trim()
    this.localPort = options.localPort
    this.clientId = options.clientId || `jackdsh_${Math.random().toString(36).slice(2, 8)}`
    this.clientInfo = options.clientInfo || `JackDSH Desktop (${process.platform})`

    this.ws = null
    this.stopped = false
    this.connected = false
    this.reconnectTimer = null
    this.reconnectDelay = 2000
    this.activeStreams = new Map()
    this.lastConnectedAt = null
    this.lastError = null
  }

  /**
   * 启动反向隧道客户端
   */
  start() {
    if (!this.relayServer || !this.token) {
      console.warn('[TunnelClient] relayServer or token is missing, tunnel not started.')
      return
    }
    this.stopped = false
    this.connect()
  }

  connect() {
    if (this.stopped) return
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    clearTimeout(this.reconnectTimer)

    // 格式化 WebSocket URL
    let wsUrl = this.relayServer
    if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      if (wsUrl.startsWith('https://')) {
        wsUrl = wsUrl.replace(/^https:\/\//, 'wss://')
      } else if (wsUrl.startsWith('http://')) {
        wsUrl = wsUrl.replace(/^http:\/\//, 'ws://')
      } else {
        wsUrl = `wss://${wsUrl}`
      }
    }

    // 确保 path 包含 /relay/tunnel
    const urlObj = new URL(wsUrl)
    if (!urlObj.pathname || urlObj.pathname === '/') {
      urlObj.pathname = '/relay/tunnel'
    }
    urlObj.searchParams.set('token', this.token)
    urlObj.searchParams.set('client_id', this.clientId)
    urlObj.searchParams.set('info', this.clientInfo)

    const finalUrl = urlObj.toString()
    console.log(`[TunnelClient] Connecting to relay: ${urlObj.origin}${urlObj.pathname}`)

    try {
      this.ws = new WebSocket(finalUrl, {
        headers: {
          'x-relay-token': this.token,
        },
        handshakeTimeout: 10000,
      })
    } catch (err) {
      this.lastError = err.message
      console.error('[TunnelClient] Failed to construct WebSocket:', err.message)
      this.scheduleReconnect()
      return
    }

    this.ws.on('open', () => {
      this.connected = true
      this.reconnectDelay = 2000
      this.lastConnectedAt = Date.now()
      this.lastError = null
      console.log('[TunnelClient] Tunnel successfully established with cloud relay!')
      this.emit('connected')
    })

    this.ws.on('message', (data) => {
      this.handleServerMessage(data)
    })

    this.ws.on('close', (code, reason) => {
      this.connected = false
      this.cleanupStreams()
      console.warn(`[TunnelClient] Tunnel disconnected (code: ${code}, reason: ${reason || 'none'})`)
      this.emit('disconnected', { code, reason })
      this.scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      this.lastError = err.message
      console.error('[TunnelClient] Tunnel socket error:', err.message)
    })
  }

  handleServerMessage(rawData) {
    try {
      const msg = JSON.parse(rawData.toString())

      if (msg.type === 'ping') {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'pong' }))
        }
        return
      }

      if (msg.type === 'connected') {
        console.log(`[TunnelClient] Relay confirmed connection. Client ID: ${msg.clientId}`)
        return
      }

      const { reqId } = msg
      if (!reqId) return

      if (msg.type === 'req_start') {
        this.handleReqStart(msg)
        return
      }

      if (msg.type === 'req_data') {
        const stream = this.activeStreams.get(reqId)
        if (stream && stream.req && msg.chunk) {
          stream.req.write(Buffer.from(msg.chunk, 'base64'))
        }
        return
      }

      if (msg.type === 'req_end') {
        const stream = this.activeStreams.get(reqId)
        if (stream && stream.req) {
          stream.req.end()
        }
        return
      }
    } catch (err) {
      console.error('[TunnelClient] Error handling message:', err.message)
    }
  }

  handleReqStart(msg) {
    const { reqId, method, url, headers } = msg

    // 转发请求到本地 JackDSH 实例
    const targetHeaders = { ...headers }
    // 确保保留原公网 Host 或在本地能够正确识别
    targetHeaders['host'] = headers['host'] || `127.0.0.1:${this.localPort}`

    const options = {
      hostname: '127.0.0.1',
      port: this.localPort,
      path: url,
      method: method || 'GET',
      headers: targetHeaders,
    }

    const localReq = httpRequest(options, (localRes) => {
      // 1. 发送响应元数据
      this.sendToRelay({
        type: 'res_start',
        reqId,
        status: localRes.statusCode || 200,
        headers: localRes.headers,
      })

      // 2. 流式发送响应数据（支持 SSE 和大文件流）
      localRes.on('data', (chunk) => {
        this.sendToRelay({
          type: 'res_data',
          reqId,
          chunk: chunk.toString('base64'),
        })
      })

      localRes.on('end', () => {
        this.sendToRelay({
          type: 'res_end',
          reqId,
        })
        this.activeStreams.delete(reqId)
      })

      localRes.on('error', (err) => {
        console.error(`[TunnelClient] Local response error for ${reqId}:`, err.message)
        this.sendToRelay({
          type: 'res_error',
          reqId,
          message: err.message,
        })
        this.activeStreams.delete(reqId)
      })
    })

    localReq.on('error', (err) => {
      console.error(`[TunnelClient] Local request failed for ${reqId}:`, err.message)
      this.sendToRelay({
        type: 'res_error',
        reqId,
        message: `Failed to connect to local port ${this.localPort}: ${err.message}`,
      })
      this.activeStreams.delete(reqId)
    })

    this.activeStreams.set(reqId, { req: localReq })
  }

  sendToRelay(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  cleanupStreams() {
    for (const [id, stream] of this.activeStreams.entries()) {
      try {
        if (stream.req && !stream.req.destroyed) {
          stream.req.destroy()
        }
      } catch {}
    }
    this.activeStreams.clear()
  }

  scheduleReconnect() {
    if (this.stopped) return
    clearTimeout(this.reconnectTimer)
    console.log(`[TunnelClient] Will reconnect in ${this.reconnectDelay / 1000}s...`)
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, this.reconnectDelay)
    // 指数避让，最大 15 秒
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 15000)
  }

  stop() {
    this.stopped = true
    clearTimeout(this.reconnectTimer)
    this.cleanupStreams()
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client stopped')
      } catch {}
      this.ws = null
    }
    this.connected = false
    console.log('[TunnelClient] Tunnel stopped.')
  }

  getStatus() {
    return {
      connected: this.connected,
      relayServer: this.relayServer,
      lastConnectedAt: this.lastConnectedAt ? new Date(this.lastConnectedAt).toISOString() : null,
      lastError: this.lastError,
      activeRequests: this.activeStreams.size,
    }
  }
}
