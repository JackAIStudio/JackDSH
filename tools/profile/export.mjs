#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { encryptProfile } from './crypto.mjs'

// 尝试加载 js-yaml，缺失时走优雅降级
let yaml = null
try {
  yaml = await import('js-yaml')
} catch {}

function safeParseYaml(text) {
  if (yaml && typeof yaml.load === 'function') {
    return yaml.load(text) || {}
  }
  // 简易退化解析：针对纯键值或基础列表
  const result = {}
  for (const line of text.split('\n')) {
    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (match) {
      const key = match[1]
      const val = match[2].trim()
      result[key] = val
    }
  }
  return result
}

function promptPassword(promptText) {
  return new Promise((resolvePrompt) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(promptText, (answer) => {
      rl.close()
      resolvePrompt(answer.trim())
    })
  })
}

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    sourceDir: process.env.DSH_HOME || join(homedir(), '.dsh'),
    output: 'jack-profile.enc',
    password: '',
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--source' || arg === '-s') {
      options.sourceDir = args[++i]
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i]
    } else if (arg === '--password' || arg === '-p') {
      options.password = args[++i]
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Jack DSH「三剑客」Profile 导出工具

用法:
  node export.mjs [选项]

选项:
  -s, --source <dir>    指定源 DSH 配置目录（默认 ~/.dsh）
  -o, --output <file>   输出加密备份文件路径（默认 ./jack-profile.enc）
  -p, --password <pwd>  指定加密口令（省略时将交互式提示输入）
  -h, --help            查看帮助说明
`)
      process.exit(0)
    }
  }
  return options
}

async function main() {
  const options = parseArgs()
  const sourceDir = resolve(options.sourceDir)

  console.log(`\n📦 Jack DSH「三剑客」Profile 导出器`)
  console.log(`   源数据目录: ${sourceDir}`)

  if (!existsSync(sourceDir)) {
    console.error(`❌ 未找到源数据目录: ${sourceDir}`)
    process.exit(1)
  }

  // 1. 提取 Grok OAuth 凭据
  let grokOAuth = null
  const grokPath = join(sourceDir, 'grok-oauth.json')
  if (existsSync(grokPath)) {
    try {
      grokOAuth = JSON.parse(readFileSync(grokPath, 'utf8'))
      const accountCount = Array.isArray(grokOAuth.accounts) ? grokOAuth.accounts.length : 0
      console.log(`   ✔ 已提取 Grok OAuth 授权态 (${accountCount} 个账号)`)
    } catch (e) {
      console.warn(`   ⚠️ 读取 Grok OAuth 失败: ${e.message}`)
    }
  } else {
    console.warn(`   ⚠️ 未检测到 grok-oauth.json`)
  }

  // 2. 提取 Gemini OAuth 凭据
  let geminiOAuth = null
  let geminiModels = null
  const geminiPath = join(sourceDir, 'gemini-oauth.json')
  if (existsSync(geminiPath)) {
    try {
      geminiOAuth = JSON.parse(readFileSync(geminiPath, 'utf8'))
      const accountCount = Array.isArray(geminiOAuth.accounts) ? geminiOAuth.accounts.length : 0
      console.log(`   ✔ 已提取 Gemini OAuth 授权态 (${accountCount} 个账号)`)
    } catch (e) {
      console.warn(`   ⚠️ 读取 Gemini OAuth 失败: ${e.message}`)
    }
  } else {
    console.warn(`   ⚠️ 未检测到 gemini-oauth.json`)
  }

  const geminiModelsPath = join(sourceDir, 'gemini-oauth-models.json')
  if (existsSync(geminiModelsPath)) {
    try {
      geminiModels = JSON.parse(readFileSync(geminiModelsPath, 'utf8'))
    } catch {}
  }

  // 3. 提取 DeepSeek API Key (从 .credentials.yaml 精准提取)
  let deepseekKey = null
  const credPath = join(sourceDir, '.credentials.yaml')
  if (existsSync(credPath)) {
    try {
      const credText = readFileSync(credPath, 'utf8')
      const match = credText.match(/DEEPSEEK_API_KEY:\s*['"]?([a-zA-Z0-9_-]+)['"]?/)
      if (match && match[1]) {
        deepseekKey = match[1]
        console.log(`   ✔ 已提取 DeepSeek API Key`)
      }
    } catch (e) {
      console.warn(`   ⚠️ 读取 .credentials.yaml 失败: ${e.message}`)
    }
  }

  // 4. 提取「Jack 模式」预设
  let jackPreset = null
  const presetDir = join(sourceDir, '.agent-presets', 'jack')
  const presetYmlPath = join(presetDir, 'preset.yml')
  const agentCordisPath = join(presetDir, 'agent.cordis.yml')
  if (existsSync(presetYmlPath) && existsSync(agentCordisPath)) {
    try {
      jackPreset = {
        preset: readFileSync(presetYmlPath, 'utf8'),
        agentCordis: readFileSync(agentCordisPath, 'utf8'),
      }
      console.log(`   ✔ 已提取「Jack 模式」完整预设定义`)
    } catch (e) {
      console.warn(`   ⚠️ 读取 Jack 预设失败: ${e.message}`)
    }
  }

  // 5. 提取并脱敏 settings.yaml 核心偏好
  let settingsPatch = null
  const settingsPath = join(sourceDir, 'settings.yaml')
  if (existsSync(settingsPath)) {
    try {
      const settingsText = readFileSync(settingsPath, 'utf8')
      const parsed = safeParseYaml(settingsText)

      // 仅提取三剑客与高效自主编码核心配置，过滤掉局域网代理、设备列表与无关内容
      settingsPatch = {
        'agent-presets': { default: 'jack' },
        permission: { defaultPreset: 'danger-full-access' },
        'ui-conversation': { busyEnter: 'steer' },
        'dsh-better-sidebar': { workspaceFence: false },
        'agent-default-model': parsed['agent-default-model'] || {
          provider: 'deepseek-official',
          model: 'deepseek-flash',
          reasoningEffort: 'max',
        },
        'llm-grok': parsed['llm-grok'] ? {
          enableImageGen: parsed['llm-grok'].enableImageGen ?? true,
          models: parsed['llm-grok'].models || [],
        } : undefined,
        'llm-deepseek': parsed['llm-deepseek'] || undefined,
      }
      console.log(`   ✔ 已提取三剑客偏好配置并完成脱敏（已剥离私有网络代理等绑定项）`)
    } catch (e) {
      console.warn(`   ⚠️ 提取 settings.yaml 失败: ${e.message}`)
    }
  }

  // 6. 提取公网远程中继配置 (remote-relay.json)
  let remoteRelay = null
  const relayPath = join(sourceDir, 'remote-relay.json')
  if (existsSync(relayPath)) {
    try {
      remoteRelay = JSON.parse(readFileSync(relayPath, 'utf8'))
      if (remoteRelay && remoteRelay.server) {
        console.log(`   ✔ 已提取公网远程中继配置 (${remoteRelay.server})`)
      }
    } catch (e) {
      console.warn(`   ⚠️ 读取 remote-relay.json 失败: ${e.message}`)
    }
  }

  // 组合最终 Payload
  const payload = {
    exportedAt: new Date().toISOString(),
    sourceHost: process.env.USER || process.env.USERNAME || 'unknown',
    grokOAuth,
    geminiOAuth,
    geminiModels,
    deepseekKey,
    jackPreset,
    settingsPatch,
    remoteRelay,
  }

  // 口令输入与确认
  let passphrase = options.password
  if (!passphrase) {
    passphrase = await promptPassword('\n🔑 请输入加密口令 (建议 6 位以上): ')
    if (!passphrase) {
      console.error('❌ 加密口令不能为空，导出终止。')
      process.exit(1)
    }
    const confirm = await promptPassword('🔑 请再次确认口令: ')
    if (passphrase !== confirm) {
      console.error('❌ 两次输入的口令不一致，导出终止。')
      process.exit(1)
    }
  }

  // 加密并输出
  const encrypted = encryptProfile(payload, passphrase)
  const outputPath = resolve(options.output)
  writeFileSync(outputPath, encrypted, 'utf8')

  console.log(`\n🎉 导出成功！`)
  console.log(`   产物文件: ${outputPath}`)
  console.log(`   文件体积: ${(Buffer.byteLength(encrypted) / 1024).toFixed(2)} KB`)
  console.log(`   安全提示: 该文件包含您的私密登录态与 API Key，请妥善保管并牢记加密口令。\n`)
}

main().catch((err) => {
  console.error(`❌ 导出异常:`, err)
  process.exit(1)
})
