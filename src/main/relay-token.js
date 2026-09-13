/**
/**
 * JackDSH 公网中转口令（Magic Token）编码与解析工具
 * 支持以下格式：
 * 1. URL Schema: jds://relay?s=<server>&t=<token>&p=<publicBaseUrl>
 * 2. 紧凑 Base64: jds-relay:<base64-json>
 * 3. 原始 JSON: {"server":"...","token":"...","publicBaseUrl":"..."}
 */

export function encodeRelayToken(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid relay config object')
  }

  const server = (config.server || '').trim()
  const token = (config.token || '').trim()
  const publicBaseUrl = (config.publicBaseUrl || '').trim()

  if (!server || !token) {
    throw new Error('server and token are required to encode relay token')
  }

  const params = new URLSearchParams()
  params.set('s', server)
  params.set('t', token)
  if (publicBaseUrl) params.set('p', publicBaseUrl)

  return `jds://relay?${params.toString()}`
}

export function parseRelayToken(input) {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }
  const text = input.trim()
  if (!text) {
    throw new Error('Empty token string')
  }

  // 1. URL Schema 格式: jds://relay?s=...&t=...&p=...
  if (text.startsWith('jds://relay')) {
    try {
      const url = new URL(text.replace(/^jds:\/\//, 'http://dummy/'))
      const server = url.searchParams.get('s')
      const token = url.searchParams.get('t')
      const publicBaseUrl = url.searchParams.get('p') || ''

      if (!server || !token) {
        throw new Error('Missing server (s) or token (t) parameter in jds:// URL')
      }

      return {
        enabled: true,
        server,
        token,
        publicBaseUrl: publicBaseUrl || (server.startsWith('ws') ? server.replace(/^wss?:\/\//, 'https://').replace(/\/relay\/tunnel.*$/, '') : ''),
      }
    } catch (err) {
      throw new Error(`Failed to parse jds:// relay URL: ${err.message}`)
    }
  }

  // 2. 紧凑 Base64 格式: jds-relay:<base64>
  if (text.startsWith('jds-relay:')) {
    try {
      const b64 = text.slice('jds-relay:'.length).trim()
      const jsonStr = Buffer.from(b64, 'base64').toString('utf8')
      const parsed = JSON.parse(jsonStr)
      if (!parsed.server || !parsed.token) {
        throw new Error('Missing server or token in decoded json')
      }
      return {
        enabled: true,
        server: parsed.server,
        token: parsed.token,
        publicBaseUrl: parsed.publicBaseUrl || '',
      }
    } catch (err) {
      throw new Error(`Failed to parse jds-relay token: ${err.message}`)
    }
  }

  // 3. 原始 JSON 格式
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text)
      if (!parsed.server || !parsed.token) {
        throw new Error('JSON missing server or token fields')
      }
      return {
        enabled: true,
        server: parsed.server,
        token: parsed.token,
        publicBaseUrl: parsed.publicBaseUrl || '',
      }
    } catch (err) {
      throw new Error(`Failed to parse JSON config: ${err.message}`)
    }
  }

  throw new Error('Unknown relay token format. Expected jds://relay?... or jds-relay:... or JSON')
}
