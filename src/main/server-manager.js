import { fork, spawn } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, lstatSync, readlinkSync, unlinkSync, symlinkSync, cpSync, createWriteStream, chmodSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { OWN_PLUGINS, ALL_BUILTIN_PLUGINS } from './own-plugins.js'
import { TunnelClient } from './tunnel-client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export class ServerManager {
  /**
   * @param {Object} options
   * @param {number} options.port
   * @param {boolean} [options.isPortable]
   * @param {string} [options.appDataPath]
   * @param {string} [options.runtimePath]
   */
  constructor(options) {
    this.port = options.port
    this.isPortable = Boolean(options.isPortable)
    this.childProcess = null
    this.runtimePath = options.runtimePath || join(__dirname, '../../bundle-runtime')

    // 确定隔离的数据存放目录（DSH_HOME），支持用户自定义，见 resolveDshHome
    this.dshHome = this.resolveDshHome(options.appDataPath)
    this.defaultWorkspace = join(this.dshHome, 'workspace')
    this.logFile = join(this.dshHome, 'dsh-web.log')
    this.lastExitCode = null
    this.relayConfigFile = join(this.dshHome, 'remote-relay.json')
    this.tunnelClient = null
  }

  /**
   * 解析数据目录（DSH_HOME），优先级从高到低：
   *  1. portable 模式：当前工作目录下 data/.dsh（既有行为，U 盘即用）；
   *  2. 启动参数 `--dsh-home <path>`；
   *  3. 环境变量 `JDS_DSH_HOME`；
   *  4. 覆盖文件 `<userData>/dsh-home.json`（{"dshHome": "..."}，
   *     预留给以后设置界面的「选择数据目录」写盘）；
   *  5. 默认隔离目录 <userData>/dsh-data。
   * 支持 ~ / ~/ 前缀展开。注意：切换目录不会自动迁移旧数据，
   * 新目录按全新隔离环境初始化（插件会自动重新注册）。
   * @param {string} [appDataPath] Electron userData 目录
   * @returns {string} 绝对路径
   */
  resolveDshHome(appDataPath) {
    if (this.isPortable) return join(process.cwd(), 'data', '.dsh')

    const expand = (p) => {
      if (p === '~') return homedir()
      if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2))
      return p
    }

    const argIndex = process.argv.indexOf('--dsh-home')
    const fromArg = argIndex !== -1 ? process.argv[argIndex + 1] : undefined
    const fromEnv = process.env.JDS_DSH_HOME
    let fromFile
    if (appDataPath) {
      try {
        const raw = readFileSync(join(appDataPath, 'dsh-home.json'), 'utf8')
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.dshHome === 'string' && parsed.dshHome.trim()) {
          fromFile = parsed.dshHome.trim()
        }
      } catch {
        fromFile = undefined
      }
    }

    const chosen = [fromArg, fromEnv, fromFile].find((v) => typeof v === 'string' && v.trim().length > 0)
    if (chosen) return resolve(expand(chosen.trim()))

    if (appDataPath) return join(appDataPath, 'dsh-data')
    const baseDir = process.platform === 'win32'
      ? (process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'))
      : (process.platform === 'darwin'
        ? join(homedir(), 'Library', 'Application Support')
        : join(homedir(), '.config'))
    return join(baseDir, 'DeepSeek-Harness-Desktop', 'data')
  }

  /**
   * 自动解析并创建当日工作区：
   * 便携模式：<dshHome>/JackDSH/days/YYYY-MM-DD
   * 常规模式：~/Documents/JackDSH/days/YYYY-MM-DD（若无 Documents 则兜底 ~/JackDSH）
   * 使得无论是网吧便携还是个人 Mac，冷启动打开直接进入当天的专属工作区。
   */
  resolveInitialWorkspace() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const today = `${y}-${m}-${d}`

    if (this.isPortable) {
      const portableDays = join(this.dshHome, 'JackDSH', 'days', today)
      try {
        mkdirSync(portableDays, { recursive: true })
        return portableDays
      } catch (err) {
        console.warn(`[ServerManager] failed to create portable workspace: ${err.message}`)
      }
    }

    const docDir = join(homedir(), 'Documents')
    if (existsSync(docDir)) {
      const todayDir = join(docDir, 'JackDSH', 'days', today)
      try {
        mkdirSync(todayDir, { recursive: true })
        return todayDir
      } catch (err) {
        console.warn(`[ServerManager] failed to create documents workspace: ${err.message}`)
      }
    }

    const fallbackDir = join(homedir(), 'JackDSH', 'days', today)
    try {
      mkdirSync(fallbackDir, { recursive: true })
      return fallbackDir
    } catch {
      return join(this.dshHome, 'workspace')
    }
  }

  /**
   * 读取公网远程中继配置
   */
  getRelayConfig() {
    try {
      if (existsSync(this.relayConfigFile)) {
        const raw = readFileSync(this.relayConfigFile, 'utf8')
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          return {
            enabled: Boolean(parsed.enabled),
            server: (parsed.server || '').trim(),
            token: (parsed.token || '').trim(),
            publicBaseUrl: (parsed.publicBaseUrl || '').trim(),
            updatedAt: parsed.updatedAt || null,
          }
        }
      }
    } catch (err) {
      console.warn(`[ServerManager] failed to read relay config: ${err.message}`)
    }
    return { enabled: false, server: '', token: '', publicBaseUrl: '' }
  }

  /**
   * 保存并应用公网远程中继配置
   */
  saveRelayConfig(config) {
    const clean = {
      enabled: Boolean(config.enabled),
      server: (config.server || '').trim(),
      token: (config.token || '').trim(),
      publicBaseUrl: (config.publicBaseUrl || '').trim().replace(/\/$/, ''),
      updatedAt: new Date().toISOString(),
    }
    try {
      writeFileSync(this.relayConfigFile, JSON.stringify(clean, null, 2) + '\n')
    } catch (err) {
      console.warn(`[ServerManager] failed to write relay config: ${err.message}`)
    }

    // 同步更新 cordis.patch.yml
    const profileDir = join(this.dshHome, 'profiles', 'web')
    const patchPath = join(profileDir, 'cordis.patch.yml')
    if (existsSync(profileDir)) {
      this.ensureCordisPatch(patchPath)
    }

    // 若服务已在运行，动态调整隧道连接
    if (this.childProcess) {
      if (clean.enabled && clean.server && clean.token) {
        console.log(`[ServerManager] Dynamic relay config updated, starting tunnel...`)
        this.startTunnelClient(clean)
      } else {
        console.log(`[ServerManager] Dynamic relay disabled, stopping tunnel...`)
        this.stopTunnelClient()
      }
    }
    return clean
  }

  /**
   * 启动反向隧道客户端
   */
  startTunnelClient(configOverride) {
    const config = configOverride || this.getRelayConfig()
    if (!config.enabled || !config.server || !config.token) {
      return
    }
    this.stopTunnelClient()
    this.tunnelClient = new TunnelClient({
      relayServer: config.server,
      token: config.token,
      localPort: this.port,
      clientId: `jackdsh_${process.platform}`,
      clientInfo: `JackDSH Desktop (${process.platform})`,
    })
    this.tunnelClient.on('connected', () => {
      console.log(`[ServerManager] Remote relay tunnel active! (${config.publicBaseUrl || config.server})`)
    })
    this.tunnelClient.on('disconnected', ({ code, reason }) => {
      console.log(`[ServerManager] Remote relay tunnel disconnected: code=${code}`)
    })
    this.tunnelClient.start()
  }

  /**
   * 停止反向隧道客户端
   */
  stopTunnelClient() {
    if (this.tunnelClient) {
      try {
        this.tunnelClient.stop()
      } catch {}
      this.tunnelClient = null
    }
  }

  /**
   * Ensure clean isolated directory structure & default settings
   */
  initIsolatedStorage() {
    mkdirSync(this.dshHome, { recursive: true })
    this.defaultWorkspace = this.resolveInitialWorkspace()
    mkdirSync(this.defaultWorkspace, { recursive: true })

    const settingsFile = join(this.dshHome, 'settings.yaml')
    if (!existsSync(settingsFile)) {
      const templatePath = join(__dirname, '../../config-templates/default-settings.yaml')
      if (existsSync(templatePath)) {
        copyFileSync(templatePath, settingsFile)
      }
    }
    this.migrateSettingsDefaults(settingsFile)

    // 确保出厂内置的「Jack 模式」预设存在于隔离环境
    const jackPresetDir = join(this.dshHome, '.agent-presets', 'jack')
    mkdirSync(jackPresetDir, { recursive: true })
    const templatePresetDir = join(__dirname, '../../config-templates/presets/jack')
    if (existsSync(templatePresetDir)) {
      for (const file of ['preset.yml', 'agent.cordis.yml']) {
        const dest = join(jackPresetDir, file)
        const src = join(templatePresetDir, file)
        if (!existsSync(dest) && existsSync(src)) {
          try {
            copyFileSync(src, dest)
          } catch (err) {
            console.warn(`[ServerManager] failed to copy preset file ${file}: ${err.message}`)
          }
        }
      }
    }

    // 权限自愈防护：确保敏感凭据符合官方 @deepseek-ai/dsh-credentials-local (mode 600) 安全标准
    if (process.platform !== 'win32') {
      const sensitiveFiles = [
        '.credentials.yaml',
        'grok-oauth.json',
        'gemini-oauth.json',
        'gemini-oauth-models.json',
      ]
      for (const file of sensitiveFiles) {
        const fullPath = join(this.dshHome, file)
        if (existsSync(fullPath)) {
          try {
            chmodSync(fullPath, 0o600)
          } catch {}
        }
      }
    }
  }

  /**
   * 存量隔离环境迁移：旧模板生成的 settings.yaml 缺少内置插件需要的
   * 配置命名空间（如 llm-grok）或默认预设设置。只补不删，绝不动用户已写的内容。
   */
  migrateSettingsDefaults(settingsFile) {
    try {
      let raw = readFileSync(settingsFile, 'utf8')
      let changed = false

      if (!raw.includes('agent-presets:')) {
        raw += '\n# 默认启用高效自主编码 Agent 预设\nagent-presets:\n  default: jack\n'
        changed = true
      }

      if (!raw.includes('llm-grok:')) {
        const block = [
          '',
          '# Jack DSH Studio 内置插件默认配置（首次升级自动补充）',
          'llm-grok:',
          '  enableImageGen: true',
          '  models:',
          '    - id: grok-4.6',
          '      name: Grok 4.6',
          '      thinking: true',
          '      vision: true',
          '      contextWindow: 500000',
          '',
        ].join('\n')
        raw = raw.endsWith('\n') ? raw + block : raw + '\n' + block
        changed = true
      }

      if (changed) {
        writeFileSync(settingsFile, raw)
      }
    } catch (error) {
      console.warn(`[ServerManager] settings migration skipped: ${error.message}`)
    }
  }

  /**
   * 把 App 内置的自研插件注册进隔离 profile（幂等，可自愈）。
   *
   * DSH 的插件机制 = profiles/web/package.json 的 dsh.profile.bundles 清单
   * + 从 profile 目录可 Node 解析到的包。这里：
   *  1. 合并 bundles 清单（保留核心默认 bundle 与用户后装的插件，只补不删）；
   *  2. 为每个内置插件在 profiles/web/node_modules 下建解析链接，
   *     指向 App 包内 runtime/plugins/<name>（真实路径向上遍历可命中
   *     App 内置 hoisted node_modules，undici / pi-ai / cordis / react 等
   *     依赖均可解析，无需目标机器安装 pnpm）。
   * 链接创建失败（如 Windows 无权限）时退化为物理复制。
   */
  initIsolatedProfile() {
    const profileDir = join(this.dshHome, 'profiles', 'web')
    mkdirSync(join(profileDir, 'node_modules'), { recursive: true })

    const pluginsRoot = join(this.runtimePath, 'plugins')
    const available = ALL_BUILTIN_PLUGINS.filter((name) => existsSync(join(pluginsRoot, name, 'package.json')))

    const manifestPath = join(profileDir, 'package.json')
    let manifest = null
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch {
      manifest = null
    }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
      manifest = { name: 'dsh-profile-web', private: true, dependencies: {} }
    }
    manifest.dsh = manifest.dsh && typeof manifest.dsh === 'object' ? manifest.dsh : {}
    manifest.dsh.profile = manifest.dsh.profile && typeof manifest.dsh.profile === 'object' ? manifest.dsh.profile : {}
    const bundles = Array.isArray(manifest.dsh.profile.bundles) ? [...manifest.dsh.profile.bundles] : []

    // 自动自愈：清理已废弃或断开的旧内置插件软链与 bundles 声明，防止 DSH 内核因找不到 bundle 崩溃黑屏
    const profileNodeModules = join(profileDir, 'node_modules')
    const userDeps = manifest.dependencies && typeof manifest.dependencies === 'object' ? Object.keys(manifest.dependencies) : []
    const cleanedBundles = []

    for (const b of bundles) {
      if (b === '@deepseek-ai/dsh-base' || b === '@deepseek-ai/dsh-web-app' || b.startsWith('@deepseek-ai/')) {
        cleanedBundles.push(b)
        continue
      }
      if (userDeps.includes(b)) {
        cleanedBundles.push(b)
        continue
      }
      if (available.includes(b)) {
        cleanedBundles.push(b)
      } else {
        // 不在当前内置列表，检查 node_modules 中是否真的存在可用包；若为坏软链或不存在则自动剔除
        const pkgPath = join(profileNodeModules, b, 'package.json')
        if (existsSync(pkgPath)) {
          cleanedBundles.push(b)
        } else {
          console.log(`[ServerManager] 自动清理失效/已废弃插件 bundle 声明: ${b}`)
          const deadLink = join(profileNodeModules, b)
          try { unlinkSync(deadLink) } catch {}
        }
      }
    }

    if (!cleanedBundles.includes('@deepseek-ai/dsh-base')) cleanedBundles.unshift('@deepseek-ai/dsh-base')
    if (!cleanedBundles.includes('@deepseek-ai/dsh-web-app')) {
      cleanedBundles.splice(cleanedBundles.indexOf('@deepseek-ai/dsh-base') + 1, 0, '@deepseek-ai/dsh-web-app')
    }
    for (const name of available) {
      if (!cleanedBundles.includes(name)) cleanedBundles.push(name)
    }
    manifest.dsh.profile.bundles = cleanedBundles
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

    const patchPath = join(profileDir, 'cordis.patch.yml')
    this.ensureCordisPatch(patchPath)

    const workspacePath = join(profileDir, 'pnpm-workspace.yaml')
    if (!existsSync(workspacePath)) {
      writeFileSync(workspacePath, 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n')
    }

    for (const name of available) {
      this.ensurePluginLink(join(profileDir, 'node_modules', name), join(pluginsRoot, name))
    }
  }

  /**
   * 确保 cordis.patch.yml 处于健康状态：
   * 在 Windows 平台上，DSH 默认的 win32-native 文件夹选择器依赖 koffi 原生模块和子进程，
   * 在 Electron 封装、跨平台打包以及包含特定中文路径（UTF-16LE 截断 Bug）时极易崩溃退出
   * （报 win32 folder dialog worker exited before reporting a result）。
   * 官方标准修复方案为挂载 @deepseek-ai/dsh-host-directory-picker-browse 纯 JS 目录浏览选择器。
   */
  ensureCordisPatch(patchPath) {
    const isWin = process.platform === 'win32' || process.env.DSH_FORCE_BROWSE_PICKER === '1'
    const browsePickerBlock = [
      '- id: directory-picker',
      "  name: '@deepseek-ai/dsh-host-directory-picker-browse'",
    ].join('\n')
    const clientHmrBlock = [
      '# 禁用官方客户端热重载 SSE 通道，彻底避免单端口多标签连接耗尽',
      '- id: client-hmr',
      '  disabled: true',
    ].join('\n')

    if (!existsSync(patchPath)) {
      const initialBlocks = [clientHmrBlock]
      if (isWin) {
        initialBlocks.unshift(`# Windows 环境下启用官方纯 JS 目录浏览选择器，避免原生 Win32 COM 对话框因原生模块或环境问题退出\n${browsePickerBlock}`)
      }
      writeFileSync(patchPath, initialBlocks.join('\n') + '\n')
      return
    }

    try {
      let raw = readFileSync(patchPath, 'utf8')
      let changed = false

      if (isWin && !raw.includes("name: '@deepseek-ai/dsh-host-directory-picker-browse'") && !raw.includes('name: "@deepseek-ai/dsh-host-directory-picker-browse"')) {
        if (raw.includes('id: directory-picker')) {
          raw = raw.replace(
            /- id: directory-picker[\r\n]+(?:\s+name:\s*['"]?[^'"\r\n]+['"]?[\r\n]*)?/g,
            `${browsePickerBlock}\n`
          )
        } else {
          raw = raw.trim() ? `${raw.trimEnd()}\n\n${browsePickerBlock}\n` : `${browsePickerBlock}\n`
        }
        changed = true
      }

      if (!raw.includes('id: client-hmr')) {
        raw = raw.trim() && raw.trim() !== '[]' ? `${raw.trimEnd()}\n\n${clientHmrBlock}\n` : `${clientHmrBlock}\n`
        changed = true
      }

      // 手机远程公网中转配置同步注入
      const relayConfig = this.getRelayConfig()
      const mobilePlusMarker = '- id: dsh-mobile-plus'
      if (relayConfig && relayConfig.enabled && relayConfig.publicBaseUrl) {
        const mobilePlusBlock = [
          '# 手机远程公网中转入口',
          '- id: dsh-mobile-plus',
          '  config:',
          `    publicBaseUrl: ${relayConfig.publicBaseUrl}`,
        ].join('\n')

        if (raw.includes(mobilePlusMarker)) {
          const reg = /- id: dsh-mobile-plus[\r\n]+(?:\s+config:[\r\n]+(?:\s+publicBaseUrl:\s*[^\r\n]+[\r\n]*)?)?/g
          const updated = raw.replace(reg, `${mobilePlusBlock}\n`)
          if (updated !== raw) {
            raw = updated
            changed = true
          }
        } else {
          raw = raw.trim() && raw.trim() !== '[]' ? `${raw.trimEnd()}\n\n${mobilePlusBlock}\n` : `${mobilePlusBlock}\n`
          changed = true
        }
      }

      if (changed) {
        writeFileSync(patchPath, raw)
      }
    } catch (error) {
      console.warn(`[ServerManager] failed to patch cordis.patch.yml: ${error.message}`)
    }
  }

  /**
   * 确保 link 是指向 target 的符号链接；指向别处的旧链接重建；
   * 真实目录/文件不破坏（可能由用户 pnpm 管理），直接跳过。
   */
  ensurePluginLink(link, target) {
    mkdirSync(dirname(link), { recursive: true })
    let stat
    try {
      stat = lstatSync(link)
    } catch {
      stat = undefined
    }
    if (stat) {
      if (!stat.isSymbolicLink()) return
      if (readlinkSync(link) === target) return
      unlinkSync(link)
    }
    try {
      symlinkSync(target, link, 'junction')
    } catch {
      try {
        cpSync(target, link, { recursive: true })
      } catch (error) {
        console.warn(`[ServerManager] failed to link plugin ${target}: ${error.message}`)
      }
    }
  }

  /**
   * Start the isolated DSH web service
   * @returns {Promise<string>} returns the web URL once ready
   */
  async start() {
    this.initIsolatedStorage()
    this.initIsolatedProfile()

    const serverUrl = `http://127.0.0.1:${this.port}`

    const nodeModulesCandidate = join(this.runtimePath, '../app/node_modules')
    const fallbackNodeModules = join(__dirname, '../../node_modules')
    const nodePath = existsSync(nodeModulesCandidate) ? nodeModulesCandidate : fallbackNodeModules

    let appVersion = '1.0.0'
    try {
      const appPkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'))
      if (appPkg.version) appVersion = appPkg.version
    } catch {}

    const augmentedPath = this.resolveAugmentedPath()
    const env = {
      ...process.env,
      PATH: augmentedPath,
      // 关键：告诉 Electron 二进制作为无界面的 Node.js 运行时执行，绝不递归弹出 GUI 窗口
      ELECTRON_RUN_AS_NODE: '1',
      NODE_PATH: nodePath,
      // 强制隔离环境变量，绝不读取日常 ~/.dsh
      DSH_HOME: this.dshHome,
      DSH_PORT: String(this.port),
      PORT: String(this.port),
      DSH_WORKSPACE: this.defaultWorkspace,
      DSH_DESKTOP_ISOLATED: '1',
      NODE_ENV: 'production',
      JACKDSH_VERSION: appVersion,
      ...(this.isPortable ? {
        JACKDSH_PORTABLE_ROOT: this.dshHome,
        DSH_IS_PORTABLE: '1',
      } : {
        JACKDSH_WORKSPACE_ROOT: dirname(dirname(this.defaultWorkspace)),
      }),
    }

    // 查找内置的官方 DSH 启动脚本 (bin.js)
    const packagedBin = process.resourcesPath ? join(process.resourcesPath, 'node_modules/@deepseek-ai/dsh/lib/bin.js') : ''
    const devBin = join(__dirname, '../../node_modules/@deepseek-ai/dsh/lib/bin.js')
    const binScript = existsSync(packagedBin) ? packagedBin : devBin

    if (!existsSync(binScript)) {
      console.warn(`[ServerManager] DSH core bin not found at ${binScript}.`)
      return serverUrl
    }

    this.childProcess = spawn(process.execPath, [
      '--expose-internals',
      binScript,
      'web',
      '--port', String(this.port),
      '--no-open',
    ], {
      env,
      cwd: this.defaultWorkspace,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let authenticatedUrl = ''
    let stdoutBuffer = ''

    const logStream = createWriteStream(this.logFile, { flags: 'a' })
    logStream.write(`\n[${new Date().toISOString()}] === JackDSH Core Starting on port ${this.port} ===\n`)

    this.childProcess.stdout?.on('data', (data) => {
      const text = data.toString()
      console.log(`[DSH-Core] ${text.trim()}`)
      logStream.write(data)
      stdoutBuffer += text
      const match = stdoutBuffer.match(/dsh web:\s+(https?:\/\/[^\s\(\)]+)/i)
      if (match && !authenticatedUrl) {
        authenticatedUrl = match[1]
        console.log(`[ServerManager] Detected 0.1.2 authenticated startup URL with token: ${authenticatedUrl}`)
      }
    })

    this.childProcess.stderr?.on('data', (data) => {
      console.error(`[DSH-Core Error] ${data.toString().trim()}`)
      logStream.write(data)
    })

    this.childProcess.on('exit', (code, signal) => {
      console.log(`[DSH-Core] Process exited with code ${code}, signal ${signal}`)
      logStream.write(`[${new Date().toISOString()}] Process exited with code ${code}, signal ${signal}\n`)
      this.lastExitCode = code
      this.childProcess = null
    })

    // 等待服务启动并捕获带 token 的认证 URL（通常在 1~2 秒内输出）
    const tokenStart = Date.now()
    while (Date.now() - tokenStart < 15000) {
      if (authenticatedUrl) break
      if (this.childProcess === null) break
      await new Promise((r) => setTimeout(r, 200))
    }

    if (!authenticatedUrl && this.childProcess === null) {
      const exitMsg = this.lastExitCode !== null ? `底层核心服务异常退出 (退出码: ${this.lastExitCode})` : '底层核心服务未能成功启动'
      throw new Error(exitMsg)
    }

    // 确保服务端口已就绪
    const ready = await this.waitForHttpReady(serverUrl, 5000)
    if (!ready && !authenticatedUrl) {
      throw new Error('服务就绪探测超时，未能建立 HTTP 连接')
    }

    // 公网中转隧道由内置的 dsh-mobile-plus 原生 RelayBridge 统一托管，避免 Electron 主进程产生重复竞争连接
    return authenticatedUrl || serverUrl
  }

  /**
   * Poll until HTTP endpoint responds or timeout expires
   */
  async waitForHttpReady(url, timeoutMs = 15000) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url, { method: 'HEAD' }).catch(() => null)
        if (res && (res.status === 200 || res.status === 302 || res.status === 401 || res.status === 404)) {
          return true
        }
      } catch {
        // waiting
      }
      await new Promise((r) => setTimeout(r, 300))
    }
    return false
  }

  /**
   * 补全子进程所需的 PATH 环境变量：
   * 1. 优先注入 App 内置的 runtime/bin 目录（最高优先级，开箱即用内置的 bsk CLI 等工具）；
   * 2. 补齐 macOS/Linux GUI 桌面应用从 Finder/Dock 启动时丢失的终端 PATH
   *    （如 /opt/homebrew/bin, /usr/local/bin, ~/.local/bin, ~/.cargo/bin 等）；
   * 3. 保留并追加原有的 process.env.PATH。
   */
  resolveAugmentedPath() {
    return augmentGlobalPath(this.runtimePath)
  }

  /**
   * Stop & clean up child process
   */
  stop() {
    this.stopTunnelClient()
    if (this.childProcess && !this.childProcess.killed) {
      try {
        this.childProcess.kill('SIGTERM')
      } catch {
        try {
          this.childProcess.kill('SIGKILL')
        } catch {}
      }
      this.childProcess = null
    }
  }
}

/**
 * 跨平台环境补全全局 PATH：
 * 解决 macOS/Linux GUI 桌面应用双击启动时丢失 shell 环境变量的通病。
 * @param {string} [runtimePath] 可选的 bundle-runtime 根目录
 * @returns {string} 增强后的 PATH 环境变量字符串
 */
export function augmentGlobalPath(runtimePath) {
  const isWin = process.platform === 'win32'
  const delimiter = isWin ? ';' : ':'
  const home = homedir()
  const extraDirs = []

  if (runtimePath) {
    const candidates = [
      join(runtimePath, 'bin'),
      join(runtimePath, 'bin', `${process.platform}-${process.arch}`),
    ]
    for (const c of candidates) {
      if (existsSync(c) && !extraDirs.includes(c)) {
        extraDirs.push(c)
      }
    }
  }

  if (!isWin) {
    const commonPosixDirs = [
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      '/usr/local/sbin',
      join(home, '.local', 'bin'),
      join(home, '.cargo', 'bin'),
      join(home, 'bin'),
    ]
    for (const d of commonPosixDirs) {
      if (existsSync(d) && !extraDirs.includes(d)) {
        extraDirs.push(d)
      }
    }
  } else {
    const commonWinDirs = [
      join(home, '.local', 'bin'),
      join(home, '.cargo', 'bin'),
    ]
    for (const d of commonWinDirs) {
      if (existsSync(d) && !extraDirs.includes(d)) {
        extraDirs.push(d)
      }
    }
  }

  const currentPaths = (process.env.PATH || '').split(delimiter).filter(Boolean)
  const merged = [...extraDirs]
  for (const p of currentPaths) {
    if (!merged.includes(p)) merged.push(p)
  }

  const finalPath = merged.join(delimiter)
  process.env.PATH = finalPath
  return finalPath
}
