import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readFileSync, readdirSync, chmodSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { ALL_BUILTIN_PLUGINS } from '../src/main/own-plugins.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const runtimeDir = join(rootDir, 'bundle-runtime')
const localPluginsDir = join(rootDir, '../plugins')
const cacheDir = process.env.CI ? join(rootDir, '.plugin-cache') : join(tmpdir(), 'jds-plugin-cache')

// ---- 参数：--source auto|local|public（默认 auto：本地有就用本地，否则按清单 clone）
const sourceFlag = (() => {
  const i = process.argv.indexOf('--source')
  const v = i !== -1 ? process.argv[i + 1] : undefined
  if (v && !['auto', 'local', 'public'].includes(v)) {
    console.error(`❌ 未知 --source: ${v}（可选 auto|local|public）`)
    process.exit(2)
  }
  return v || 'auto'
})()

// ---- 解析 plugins.manifest.yaml（固定简单 schema，零依赖）
function parseManifest(file) {
  const text = readFileSync(file, 'utf8')
  const plugins = []
  let current = null
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trimEnd()
    if (!line.trim()) continue
    const itemMatch = line.match(/^\s*-\s+name:\s*['"]?([^'"\s]+)['"]?\s*$/)
    const kvMatch = line.match(/^\s*(name|repo|ref|npm):\s*['"]?([^'"\s]+)['"]?\s*$/)
    if (itemMatch) {
      current = { name: itemMatch[1] }
      plugins.push(current)
    } else if (kvMatch && current) {
      if (kvMatch[1] === 'repo') current.repo = kvMatch[2]
      if (kvMatch[1] === 'ref') current.ref = kvMatch[2]
      if (kvMatch[1] === 'npm') current.npm = kvMatch[2]
      if (kvMatch[1] === 'name' && !itemMatch) current.name = kvMatch[2]
    }
  }
  for (const p of plugins) {
    if (!p.name || (!p.repo && !p.npm)) throw new Error(`manifest 条目不完整: ${JSON.stringify(p)}`)
    p.ref = p.ref || 'main'
  }
  return plugins
}

const manifest = parseManifest(join(rootDir, 'plugins.manifest.yaml'))

// 运行期注册清单与构建清单对账：只警告不阻断（运行期按 existsSync 自愈）
for (const name of ALL_BUILTIN_PLUGINS) {
  if (!manifest.some((p) => p.name === name)) {
    console.warn(`  ⚠️ 运行期清单(own-plugins.js)里的 ${name} 不在 plugins.manifest.yaml 中`)
  }
}

console.log(`📦 [1/4] 初始化纯净打包暂存目录... (source=${sourceFlag})`)
if (existsSync(runtimeDir)) {
  try {
    execSync(`rm -rf "${runtimeDir}"`)
  } catch {
    rmSync(runtimeDir, { recursive: true, force: true })
  }
}
mkdirSync(runtimeDir, { recursive: true })
mkdirSync(join(runtimeDir, 'plugins'), { recursive: true })

// ---- 解析每个插件的源码目录：local 优先（auto 时），否则 clone public 固定 ref 或 npm pack 解包
function resolvePluginSource(entry) {
  if (entry.npm) {
    const cache = join(cacheDir, entry.name.replace(/[@/]/g, '_'))
    if (existsSync(cache)) {
      try {
        rmSync(cache, { recursive: true, force: true })
      } catch {
        try { execSync(process.platform === 'win32' ? `rmdir /s /q "${cache}"` : `rm -rf "${cache}"`) } catch {}
      }
    }
    mkdirSync(cache, { recursive: true })
    console.log(`  ⬇️  npm pack ${entry.npm}`)
    execSync(`npm pack ${entry.npm}`, { cwd: cache, stdio: ['ignore', 'pipe', 'pipe'] })
    const tgz = readdirSync(cache).find((f) => f.endsWith('.tgz'))
    if (!tgz) throw new Error(`npm pack 未能生成 tgz 归档: ${entry.npm}`)
    execSync(`tar -xzf "${tgz}" --strip-components=1`, { cwd: cache, stdio: ['ignore', 'pipe', 'pipe'] })
    return { dir: cache, origin: `npm@${entry.npm}` }
  }

  const local = join(localPluginsDir, entry.name)
  if (sourceFlag !== 'public' && existsSync(join(local, 'package.json'))) {
    return { dir: local, origin: 'local' }
  }
  if (sourceFlag === 'local') {
    throw new Error(`--source local 但本地缺少插件源码: ${local}`)
  }
  const cache = join(cacheDir, entry.name.replace(/[@/]/g, '_'))
  if (existsSync(cache)) {
    try {
      rmSync(cache, { recursive: true, force: true })
    } catch {
      try {
        execSync(process.platform === 'win32' ? `rmdir /s /q "${cache}"` : `rm -rf "${cache}"`)
      } catch {}
    }
  }
  mkdirSync(cacheDir, { recursive: true })
  console.log(`  ⬇️  clone ${entry.repo} @ ${entry.ref}`)
  execSync(`git clone --depth 1 --branch ${entry.ref} "${entry.repo}" "${cache}"`, { stdio: ['ignore', 'pipe', 'pipe'] })
  return { dir: cache, origin: `public@${entry.ref}` }
}

console.log('🧩 [2/4] 收纳精选插件与依赖...')
for (const entry of manifest) {
  const { dir: src, origin } = resolvePluginSource(entry)
  const dest = join(runtimeDir, 'plugins', entry.name)
  mkdirSync(dirname(dest), { recursive: true })
  console.log(`  -> 复制插件: ${entry.name} (${origin})`)
  cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      // 过滤规则：严禁打包 .git, .env, credentials, 缓存, 会话
      const base = srcPath.split(/[/\\]/).pop() || ''
      if (base === '.git' || base === '.DS_Store' || base === 'node_modules') return false
      if (base === 'test' || base === 'tests' || base === '__tests__') return false
      if (base.startsWith('.env') || base.includes('credential') || base.includes('token.json')) return false
      if (base === '.dsh-mobile-inbox') return false
      return true
    },
  })

  // 关键门禁校验：严查插件入口文件（main / exports）是否真实存在，杜绝缺少 lib/ 编译产物打出空壳包
  const pluginPkgPath = join(dest, 'package.json')
  if (existsSync(pluginPkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pluginPkgPath, 'utf8'))
      if (pkg.main) {
        const entryFile = join(dest, pkg.main)
        if (!existsSync(entryFile)) {
          throw new Error(`插件 ${entry.name} 的入口文件 ${pkg.main} 不存在！请先构建该插件或将 lib/ 构建产物提交到 Git。`)
        }
      }
    } catch (e) {
      if (e.message.includes('入口文件')) throw e
    }
  }
}

// ---- [3/4] 准备内置 CLI 工具 (BrowserSkill bsk)
console.log('🛠️ [3/4] 准备内置 CLI 工具 (BrowserSkill bsk)...')

function prepareBskCli(targetDir, manifestList) {
  const binDir = join(targetDir, 'bin')
  mkdirSync(binDir, { recursive: true })

  // 1. 确定需要的 bsk 版本（跟随 browser-skill 插件版本，默认 0.2.1）
  const bskEntry = manifestList.find((p) => p.name === '@wxg-prc-cpg/browser-skill-dsh-plugin')
  let bskVersion = '0.2.1'
  if (bskEntry?.npm) {
    const match = bskEntry.npm.match(/@(\d+\.\d+\.\d+.*)$/)
    if (match) bskVersion = match[1]
  }

  const bskCacheRoot = join(cacheDir, 'bsk-bin')
  mkdirSync(bskCacheRoot, { recursive: true })

  // 2. 预设支持的目标平台架构与官方资产
  const targets = [
    {
      id: 'darwin-arm64',
      fileName: 'bsk',
      asset: `bsk-v${bskVersion}-aarch64-apple-darwin.tar.gz`,
      type: 'tar.gz',
    },
    {
      id: 'win32-x64',
      fileName: 'bsk.exe',
      asset: `bsk-v${bskVersion}-x86_64-pc-windows-msvc.zip`,
      type: 'zip',
    },
  ]

  if (process.arch === 'x64' && process.platform === 'darwin') {
    targets.unshift({
      id: 'darwin-x64',
      fileName: 'bsk',
      asset: `bsk-v${bskVersion}-x86_64-apple-darwin.tar.gz`,
      type: 'tar.gz',
    })
  }

  for (const t of targets) {
    const cachedBinary = join(bskCacheRoot, `v${bskVersion}`, t.id, t.fileName)
    const targetPlatformDir = join(binDir, t.id)
    mkdirSync(targetPlatformDir, { recursive: true })
    const destInPlatform = join(targetPlatformDir, t.fileName)

    if (!existsSync(cachedBinary)) {
      mkdirSync(dirname(cachedBinary), { recursive: true })

      // 本地极速加速：若本机 ~/.local/bin/bsk 已存在且版本匹配，直接复用
      const currentPlatformId = `${process.platform}-${process.arch}`
      const localMachineBsk = join(homedir(), '.local', 'bin', t.fileName)
      let usedLocal = false
      if (t.id === currentPlatformId && existsSync(localMachineBsk)) {
        try {
          const verOut = execSync(`"${localMachineBsk}" --version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
          if (verOut.includes(bskVersion)) {
            cpSync(localMachineBsk, cachedBinary)
            console.log(`  -> 复用本机已安装的 bsk [${t.id}] (${verOut.trim()})`)
            usedLocal = true
          }
        } catch {}
      }

      if (!usedLocal) {
        const downloadUrl = `https://github.com/Tencent/BrowserSkill/releases/download/cli-v${bskVersion}/${t.asset}`
        const tempArchive = join(bskCacheRoot, `${t.id}-${t.asset}`)
        console.log(`  ⬇️  下载 BrowserSkill [${t.id}] -> ${t.asset}`)
        try {
          execSync(`curl -fsSL "${downloadUrl}" -o "${tempArchive}"`, { stdio: ['ignore', 'pipe', 'pipe'] })
          const extractDir = join(bskCacheRoot, `extract-${t.id}`)
          rmSync(extractDir, { recursive: true, force: true })
          mkdirSync(extractDir, { recursive: true })
          if (t.type === 'tar.gz') {
            execSync(`tar -xzf "${tempArchive}" -C "${extractDir}"`, { stdio: ['ignore', 'pipe', 'pipe'] })
          } else if (t.type === 'zip') {
            execSync(`unzip -o -q "${tempArchive}" -d "${extractDir}"`, { stdio: ['ignore', 'pipe', 'pipe'] })
          }
          const found = existsSync(join(extractDir, t.fileName))
            ? join(extractDir, t.fileName)
            : readdirSync(extractDir).map((f) => join(extractDir, f)).find((p) => p.endsWith(t.fileName))
          if (!found) throw new Error(`解压包中未找到 ${t.fileName}`)
          cpSync(found, cachedBinary)
          rmSync(extractDir, { recursive: true, force: true })
          rmSync(tempArchive, { force: true })
        } catch (err) {
          console.warn(`  ⚠️ 下载/解压 ${t.id} 失败: ${err.message}`)
        }
      }
    }

    if (existsSync(cachedBinary)) {
      cpSync(cachedBinary, destInPlatform)
      if (t.fileName !== 'bsk.exe') {
        try { chmodSync(destInPlatform, 0o755) } catch {}
      }
      // 如果与当前宿主平台架构匹配，在 bin/ 根目录也放一份直接可执行文件
      const currentHostId = `${process.platform}-${process.arch}`
      if (t.id === currentHostId) {
        const topLevelDest = join(binDir, t.fileName)
        cpSync(cachedBinary, topLevelDest)
        if (t.fileName !== 'bsk.exe') {
          try { chmodSync(topLevelDest, 0o755) } catch {}
        }
        console.log(`  ✅ 内置当前宿主 bsk 就绪: ${topLevelDest}`)
      } else {
        console.log(`  ✅ 内置跨平台资产就绪: ${destInPlatform}`)
      }
    }
  }
}

prepareBskCli(runtimeDir, manifest)

console.log('🚀 [4/4] 生成独立运行入口 entry.js...')
const entryContent = `/**
 * JackDSH Embedded Core Entry
 * Boots the official DeepSeek Harness Web engine
 */
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const portIndex = process.argv.indexOf('--port')
const port = portIndex !== -1 ? process.argv[portIndex + 1] : (process.env.DSH_PORT || '3180')

console.log(\`[JackDSH] Booting DeepSeek Harness Web core on port \${port}...\`)

process.argv = [process.execPath, 'dsh', 'web', '--port', String(port), '--no-open']
await import('@deepseek-ai/dsh/lib/bin.js')
`

writeFileSync(join(runtimeDir, 'entry.js'), entryContent)
console.log('✅ 打包暂存区构建完成！')
