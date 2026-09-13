import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LEN = 32
const SALT_LEN = 16
const IV_LEN = 12

/**
 * 使用口令加密纯文本或 JSON 载荷
 * @param {string|object} payload
 * @param {string} passphrase
 * @returns {string} JSON 格式的加密容器字符串
 */
export function encryptProfile(payload, passphrase) {
  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('加密口令不能为空')
  }
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const key = scryptSync(passphrase, salt, KEY_LEN)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const tag = cipher.getAuthTag()

  const envelope = {
    schema: 'jack-dsh-profile/v1',
    createdAt: new Date().toISOString(),
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted,
  }

  return JSON.stringify(envelope, null, 2)
}

/**
 * 使用口令解密 Profile 容器
 * @param {string} envelopeJson
 * @param {string} passphrase
 * @returns {object} 解密还原出的 JSON 载荷
 */
export function decryptProfile(envelopeJson, passphrase) {
  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('解密口令不能为空')
  }

  let envelope
  try {
    envelope = typeof envelopeJson === 'string' ? JSON.parse(envelopeJson) : envelopeJson
  } catch {
    throw new Error('无效的 Profile 备份文件格式（不是有效的 JSON）')
  }

  if (envelope.schema !== 'jack-dsh-profile/v1') {
    throw new Error(`不支持的 Profile 备份版本: ${envelope.schema}`)
  }

  const salt = Buffer.from(envelope.salt, 'base64')
  const iv = Buffer.from(envelope.iv, 'base64')
  const tag = Buffer.from(envelope.tag, 'base64')
  const key = scryptSync(passphrase, salt, KEY_LEN)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted
  try {
    decrypted = decipher.update(envelope.data, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
  } catch (err) {
    throw new Error('解密失败：口令错误或备份文件已损坏')
  }

  try {
    return JSON.parse(decrypted)
  } catch {
    return decrypted
  }
}
