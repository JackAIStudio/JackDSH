#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { decryptProfile } from './crypto.mjs'

// 尝试加载 js-yaml，缺失时走优雅降级
let yaml = null
try {
  yaml = await import('js-yaml')
} catch {}

function safeParseYaml(text) {
  if (yaml && typeof yaml.load === 'function') {
    return yaml.load(text) || {}
  }
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

function safeDumpYaml(obj) {
  if (yaml && typeof yaml.dump === 'function') {
    return yaml.dump(obj, { indent: 2 })
  }
  // 简易格式化
  return JSON.stringify(obj, null, 2)
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

function resolveTargetDir(explicit) {
  if (explicit) return resolve(explicit)
  if (process.env.DSH_HOME) return resolve(process.env.DSH_HOME)
  if (process.env.JDS_DSH_HOME) return resolve(process.env.JDS_DSH_HOME)

  // 1. 便携模式检测：当前目录下是否有 data/.dsh 或 data/
  const cwd = process.cwd()
  const portableDsh = join(cwd, 'data', '.dsh')
  if (existsSync(portableDsh)) return portableDsh
  const portableData = join(cwd, 'data')
  if (existsSync(portableData)) return portableData

  // 2. 检查 JackDSH 默认隔离目录
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'

  if (isWin) {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    const jackWin = join(appData, 'JackDSH', 'dsh-data')
    if (existsSync(jackWin)) return jackWin
    const dshWin = join(homedir(), '.dsh')
    if (existsSync(dshWin)) return dshWin
    return jackWin
  }

  if (isMac) {
    const jackMac = join(homedir(), 'Library', 'Application Support', 'JackDSH', 'dsh-data')
    if (existsSync(jackMac)) return jackMac
    const dshMac = join(homedir(), '.dsh')
    if (existsSync(dshMac)) return dshMac
    return jackMac
  }

  const dshLinux = join(homedir(), '.dsh')
  return dshLinux
}

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    input: '',
    targetDir: '',
    password: '',
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--input' || arg === '-i') {
      options.input = args[++i]
    } else if (arg === '--target' || arg === '-t') {
      options.targetDir = args[++i]
    } else if (arg === '--password' || arg === '-p') {
      options.password = args[++i]
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Jack DSH「三剑客」Profile 导入与恢复工具

用法:
  node import.mjs [选项]

选项:
  -i, --input <file>    指定加密备份文件（默认检测当前目录下 jack-profile.enc）
  -t, --target <dir>    指定目标数据目录（默认自适应便携目录或 JackDSH 隔离目录）
  -p, --password <pwd>  指定解密口令（省略时将交互式提示输入）
  -h, --help            查看帮助说明
`)
      process.exit(0)
    } else if (!options.input && !arg.startsWith('-')) {
      options.input = arg
    }
  }
  return options
}

async function main() {
  const options = parseArgs()

  // 1. 寻找输入文件
  let inputFile = options.input
  if (!inputFile) {
    const candidates = ['jack-profile.enc', 'jack-profile.json']
    for (const c of candidates) {
      if (existsSync(c)) {
        inputFile = c
        break
      }
    }
  }

  if (!inputFile || !existsSync(inputFile)) {
    console.error(`❌ 未找到备份文件！请指定 --input <path> 或将 jack-profile.enc 放置于当前目录。`)
    process.exit(1)
  }

  const targetDir = resolveTargetDir(options.targetDir)
  mkdirSync(targetDir, { recursive: true })

  console.log(`\n📥 Jack DSH「三剑客」Profile 恢复器`)
  console.log(`   备份文件: ${resolve(inputFile)}`)
  console.log(`   目标目录: ${targetDir}`)

  // 2. 读取解密口令
  let passphrase = options.password
  if (!passphrase) {
    passphrase = await promptPassword('\n🔑 请输入解密口令: ')
    if (!passphrase) {
      console.error('❌ 解密口令不能为空。')
      process.exit(1)
    }
  }

  // 3. 解密 Payload
  const rawEnvelope = readFileSync(inputFile, 'utf8')
  let payload
  try {
    payload = decryptProfile(rawEnvelope, passphrase)
  } catch (err) {
    console.error(`\n❌ ${err.message}\n`)
    process.exit(1)
  }

  console.log(`\n🔓 解密成功！开始注入凭据与偏好...`)

  // 4. 恢复 Grok OAuth
  if (payload.grokOAuth) {
    const grokDest = join(targetDir, 'grok-oauth.json')
    writeFileSync(grokDest, JSON.stringify(payload.grokOAuth, null, 2) + '\n', 'utf8')
    const count = Array.isArray(payload.grokOAuth.accounts) ? payload.grokOAuth.accounts.length : 1
    console.log(`   ✔ Grok OAuth: 已恢复 (${count} 个账号)`)
  }

  // 5. 恢复 Gemini OAuth
  if (payload.geminiOAuth) {
    const geminiDest = join(targetDir, 'gemini-oauth.json')
    writeFileSync(geminiDest, JSON.stringify(payload.geminiOAuth, null, 2) + '\n', 'utf8')
    const count = Array.isArray(payload.geminiOAuth.accounts) ? payload.geminiOAuth.accounts.length : 1
    console.log(`   ✔ Gemini OAuth: 已恢复 (${count} 个账号)`)
  }

  if (payload.geminiModels) {
    const geminiModelsDest = join(targetDir, 'gemini-oauth-models.json')
    writeFileSync(geminiModelsDest, JSON.stringify(payload.geminiModels, null, 2) + '\n', 'utf8')
  }

  // 6. 恢复 DeepSeek API Key 进 .credentials.yaml
  if (payload.deepseekKey) {
    const credPath = join(targetDir, '.credentials.yaml')
    let credContent = ''
    if (existsSync(credPath)) {
      try {
        let text = readFileSync(credPath, 'utf8')
        if (text.includes('DEEPSEEK_API_KEY:')) {
          text = text.replace(/DEEPSEEK_API_KEY:\s*['"]?[^\r\n]+['"]?/, `DEEPSEEK_API_KEY: ${payload.deepseekKey}`)
        } else if (text.includes('refs:')) {
          text = text.replace(/refs:\s*[\r\n]+/, `refs:\n  DEEPSEEK_API_KEY: ${payload.deepseekKey}\n`)
        } else {
          text += `\nrefs:\n  DEEPSEEK_API_KEY: ${payload.deepseekKey}\n`
        }
        credContent = text
      } catch {
        credContent = `version: 1\nrefs:\n  DEEPSEEK_API_KEY: ${payload.deepseekKey}\n`
      }
    } else {
      credContent = `version: 1\nrefs:\n  DEEPSEEK_API_KEY: ${payload.deepseekKey}\n`
    }
    writeFileSync(credPath, credContent, 'utf8')
    console.log(`   ✔ DeepSeek API Key: 已恢复`)
  }

  // 7. 恢复「Jack 模式」预设
  if (payload.jackPreset) {
    const presetDir = join(targetDir, '.agent-presets', 'jack')
    mkdirSync(presetDir, { recursive: true })
    if (payload.jackPreset.preset) {
      writeFileSync(join(presetDir, 'preset.yml'), payload.jackPreset.preset, 'utf8')
    }
    if (payload.jackPreset.agentCordis) {
      writeFileSync(join(presetDir, 'agent.cordis.yml'), payload.jackPreset.agentCordis, 'utf8')
    }
    console.log(`   ✔「Jack 模式」预设: 已释放至 .agent-presets/jack`)
  }

  // 8. 合并核心偏好进 settings.yaml
  const settingsPath = join(targetDir, 'settings.yaml')
  let currentSettings = {}
  if (existsSync(settingsPath)) {
    try {
      currentSettings = safeParseYaml(readFileSync(settingsPath, 'utf8'))
    } catch {}
  }

  // 深层浅合入关键偏好
  const patch = payload.settingsPatch || {}
  const merged = {
    ...currentSettings,
    'agent-presets': {
      ...(currentSettings['agent-presets'] || {}),
      default: 'jack',
    },
    permission: {
      ...(currentSettings['permission'] || {}),
      defaultPreset: 'danger-full-access',
    },
    'ui-conversation': {
      ...(currentSettings['ui-conversation'] || {}),
      busyEnter: 'steer',
    },
    'dsh-better-sidebar': {
      ...(currentSettings['dsh-better-sidebar'] || {}),
      workspaceFence: false,
    },
    'agent-default-model': patch['agent-default-model'] || currentSettings['agent-default-model'] || {
      provider: 'gemini-oauth',
      model: 'gemini-3.8-flash-tiered',
      reasoningEffort: 'high',
    },
    'llm-grok': patch['llm-grok'] || currentSettings['llm-grok'] || {
      enableImageGen: true,
      models: [
        {
          id: 'grok-4.6',
          name: 'Grok 4.6',
          thinking: true,
          vision: true,
          contextWindow: 500000,
          defaultReasoningEffort: 'high',
        },
      ],
    },
    'llm-deepseek': patch['llm-deepseek'] || currentSettings['llm-deepseek'] || {
      models: [
        {
          id: 'deepseek-flash',
          name: 'deepseek-flash',
          description: '官方对外 flash 路由（服务端实际返回 deepseek-flash，原生多模态）',
          contextWindow: 1000000,
          inputModalities: ['text', 'image'],
          imagePixelBudget: 640000,
          imageMaxBytes: 1048576,
        },
      ],
    },
  }

  writeFileSync(settingsPath, safeDumpYaml(merged), 'utf8')
  console.log(`   ✔ 偏好设置: 已同步（默认预设 -> Jack 模式, 默认主力模型 -> Gemini 3.8 Flash High）`)

  // 9. 恢复公网远程中继配置
  if (payload.remoteRelay) {
    const relayDest = join(targetDir, 'remote-relay.json')
    writeFileSync(relayDest, JSON.stringify(payload.remoteRelay, null, 2) + '\n', 'utf8')
    console.log(`   ✔ 公网远程中继: 已恢复 (${payload.remoteRelay.server})`)

    // 同步更新 cordis.patch.yml 注入 publicBaseUrl
    if (payload.remoteRelay.publicBaseUrl) {
      const profileDir = join(targetDir, 'profiles', 'web')
      mkdirSync(profileDir, { recursive: true })
      const patchPath = join(profileDir, 'cordis.patch.yml')
      let patchContent = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : ''
      const mobilePlusBlock = [
        '# 手机远程公网中转入口',
        '- id: dsh-mobile-plus',
        '  config:',
        `    publicBaseUrl: ${payload.remoteRelay.publicBaseUrl}`,
      ].join('\n')
      if (patchContent.includes('- id: dsh-mobile-plus')) {
        patchContent = patchContent.replace(
          /- id: dsh-mobile-plus[\r\n]+(?:\s+config:[\r\n]+(?:\s+publicBaseUrl:\s*[^\r\n]+[\r\n]*)?)?/g,
          `${mobilePlusBlock}\n`
        )
      } else {
        patchContent = patchContent.trim() && patchContent.trim() !== '[]' ? `${patchContent.trimEnd()}\n\n${mobilePlusBlock}\n` : `${mobilePlusBlock}\n`
      }
      writeFileSync(patchPath, patchContent, 'utf8')
      console.log(`   ✔ 手机远程公网地址: 已同步写入 cordis.patch.yml (${payload.remoteRelay.publicBaseUrl})`)
    }
  }

  console.log(`\n🎉 全部恢复就绪！`)
  console.log(`   现在打开 Jack DSH，您的 Grok / Gemini / DeepSeek 即可无缝开箱即用，手机远程亦已自动就绪。\n`)
}

main().catch((err) => {
  console.error(`❌ 导入异常:`, err)
  process.exit(1)
})
