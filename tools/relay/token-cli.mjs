#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { encodeRelayToken, parseRelayToken } from '../../src/main/relay-token.js'

const args = process.argv.slice(2)
const command = args[0]

function resolveTargetDshHome() {
  if (process.env.DSH_HOME) return process.env.DSH_HOME

  const appData = process.platform === 'darwin'
    ? join(homedir(), 'Library', 'Application Support', 'JackDSH')
    : (process.platform === 'win32'
      ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'JackDSH')
      : join(homedir(), '.config', 'JackDSH'))

  const homeJson = join(appData, 'dsh-home.json')
  if (existsSync(homeJson)) {
    try {
      const parsed = JSON.parse(readFileSync(homeJson, 'utf8'))
      if (parsed && parsed.dshHome) return parsed.dshHome
    } catch {}
  }

  const defaultData = join(appData, 'dsh-data')
  if (existsSync(defaultData)) return defaultData

  return join(homedir(), '.dsh')
}

function showHelp() {
  console.log(`
JackDSH 公网中转口令 (Magic Token) 工具

用法:
  node token-cli.mjs encode [选项]       生成中转口令
  node token-cli.mjs decode <token>      解析中转口令
  node token-cli.mjs import <token>      一键导入中转口令到本机 JackDSH
  node token-cli.mjs current             查看本机已配置的中转口令

选项:
  -s, --server <url>   中转服务端 WebSocket 节点 (如 wss://relay.example.com/relay/tunnel)
  -t, --token <token>  中转安全密钥 Token
  -p, --public <url>   手机外网访问入口 (如 https://dsh.example.com)
  -d, --dest <dir>     目标 DSH 数据目录 (默认自动探测本机 JackDSH)
`)
}

if (!command || command === '-h' || command === '--help') {
  showHelp()
  process.exit(0)
}

if (command === 'encode') {
  let server = ''
  let token = ''
  let publicBaseUrl = ''

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '-s' || args[i] === '--server') server = args[++i]
    if (args[i] === '-t' || args[i] === '--token') token = args[++i]
    if (args[i] === '-p' || args[i] === '--public') publicBaseUrl = args[++i]
  }

  if (!server || !token) {
    console.error('❌ 错误: 必须提供 --server 和 --token 参数')
    process.exit(1)
  }

  const tokenStr = encodeRelayToken({ server, token, publicBaseUrl })
  console.log('\n✨ 生成的 JackDSH 中转口令:')
  console.log(`\n  ${tokenStr}\n`)
  console.log('💡 你可以在网吧或新电脑上的 JackDSH 中直接粘贴此口令完成一键导入！\n')
  process.exit(0)
}

if (command === 'decode') {
  const tokenStr = args[1]
  if (!tokenStr) {
    console.error('❌ 错误: 请传入要解析的口令')
    process.exit(1)
  }
  try {
    const config = parseRelayToken(tokenStr)
    console.log('\n🔍 解析成功:')
    console.log(JSON.stringify(config, null, 2))
  } catch (err) {
    console.error(`❌ 解析失败: ${err.message}`)
    process.exit(1)
  }
  process.exit(0)
}

if (command === 'import') {
  const tokenStr = args[1]
  if (!tokenStr) {
    console.error('❌ 错误: 请传入要导入的口令')
    process.exit(1)
  }

  let destDir = resolveTargetDshHome()
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '-d' || args[i] === '--dest') destDir = args[++i]
  }

  try {
    const config = parseRelayToken(tokenStr)
    mkdirSync(destDir, { recursive: true })

    const relayFile = join(destDir, 'remote-relay.json')
    writeFileSync(relayFile, JSON.stringify(config, null, 2) + '\n', 'utf8')

    // 同步更新 cordis.patch.yml
    if (config.publicBaseUrl) {
      const profileDir = join(destDir, 'profiles', 'web')
      mkdirSync(profileDir, { recursive: true })
      const patchPath = join(profileDir, 'cordis.patch.yml')
      let patchContent = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
      const mobilePlusBlock = [
        '# 手机远程公网中转入口',
        '- id: dsh-mobile-plus',
        '  config:',
        `    publicBaseUrl: ${config.publicBaseUrl}`,
      ].join('\n')

      if (patchContent.includes('- id: dsh-mobile-plus')) {
        patchContent = patchContent.replace(
          /- id: dsh-mobile-plus[\r\n]+(?:\s+config:[\r\n]+(?:\s+publicBaseUrl:\s*[^\r\n]+[\r\n]*)?)?/g,
          `${mobilePlusBlock}\n`,
        )
      } else {
        patchContent = patchContent.trim() && patchContent.trim() !== '[]' ? `${patchContent.trimEnd()}\n\n${mobilePlusBlock}\n` : `${mobilePlusBlock}\n`
      }
      writeFileSync(patchPath, patchContent, 'utf8')
    }

    console.log(`\n🎉 一键导入成功！`)
    console.log(`   目标数据目录: ${destDir}`)
    console.log(`   中继服务端: ${config.server}`)
    console.log(`   手机远程入口: ${config.publicBaseUrl || '自适应'}`)
    console.log(`   现在打开/重启 JackDSH，即可自动连通公网远程。\n`)
  } catch (err) {
    console.error(`❌ 导入失败: ${err.message}`)
    process.exit(1)
  }
  process.exit(0)
}

if (command === 'current') {
  const destDir = resolveTargetDshHome()
  const relayFile = join(destDir, 'remote-relay.json')
  if (!existsSync(relayFile)) {
    console.log(`\n⚪️ 当前目录尚未配置公网远程中继: ${destDir}\n`)
    process.exit(0)
  }
  try {
    const raw = readFileSync(relayFile, 'utf8')
    const config = JSON.parse(raw)
    const tokenStr = encodeRelayToken(config)
    console.log(`\n当前中继配置 (${destDir}):`)
    console.log(JSON.stringify(config, null, 2))
    console.log(`\n可分享的中转口令:\n  ${tokenStr}\n`)
  } catch (err) {
    console.error(`❌ 读取失败: ${err.message}`)
  }
  process.exit(0)
}
