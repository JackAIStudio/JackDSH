import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { OWN_PLUGINS } from '../src/main/own-plugins.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const runtimeDir = join(rootDir, 'bundle-runtime')
const localPluginsDir = join(rootDir, '../plugins')
const cacheDir = join(rootDir, '.plugin-cache')

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
    const itemMatch = line.match(/^\s*-\s+name:\s*(\S+)\s*$/)
    const kvMatch = line.match(/^\s*(name|repo|ref):\s*(\S+)\s*$/)
    if (itemMatch) {
      current = { name: itemMatch[1] }
      plugins.push(current)
    } else if (kvMatch && current) {
      if (kvMatch[1] === 'repo') current.repo = kvMatch[2]
      if (kvMatch[1] === 'ref') current.ref = kvMatch[2]
      if (kvMatch[1] === 'name' && !itemMatch) current.name = kvMatch[2]
    }
  }
  for (const p of plugins) {
    if (!p.name || !p.repo) throw new Error(`manifest 条目不完整: ${JSON.stringify(p)}`)
    p.ref = p.ref || 'main'
  }
  return plugins
}

const manifest = parseManifest(join(rootDir, 'plugins.manifest.yaml'))

// 运行期注册清单与构建清单对账：只警告不阻断（运行期按 existsSync 自愈）
for (const name of OWN_PLUGINS) {
  if (!manifest.some((p) => p.name === name)) {
    console.warn(`  ⚠️ 运行期清单(own-plugins.js)里的 ${name} 不在 plugins.manifest.yaml 中`)
  }
}

console.log(`📦 [1/3] 初始化纯净打包暂存目录... (source=${sourceFlag})`)
if (existsSync(runtimeDir)) {
  try {
    execSync(`rm -rf "${runtimeDir}"`)
  } catch {
    rmSync(runtimeDir, { recursive: true, force: true })
  }
}
mkdirSync(runtimeDir, { recursive: true })
mkdirSync(join(runtimeDir, 'plugins'), { recursive: true })

// ---- 解析每个插件的源码目录：local 优先（auto 时），否则 clone public 固定 ref
function resolvePluginSource(entry) {
  const local = join(localPluginsDir, entry.name)
  if (sourceFlag !== 'public' && existsSync(join(local, 'package.json'))) {
    return { dir: local, origin: 'local' }
  }
  if (sourceFlag === 'local') {
    throw new Error(`--source local 但本地缺少插件源码: ${local}`)
  }
  const cache = join(cacheDir, entry.name)
  rmSync(cache, { recursive: true, force: true })
  mkdirSync(cacheDir, { recursive: true })
  console.log(`  ⬇️  clone ${entry.repo} @ ${entry.ref}`)
  execSync(`git clone --depth 1 --branch ${entry.ref} "${entry.repo}" "${cache}"`, { stdio: ['ignore', 'pipe', 'pipe'] })
  return { dir: cache, origin: `public@${entry.ref}` }
}

console.log('🧩 [2/3] 收纳精选插件与依赖...')
for (const entry of manifest) {
  const { dir: src, origin } = resolvePluginSource(entry)
  const dest = join(runtimeDir, 'plugins', entry.name)
  console.log(`  -> 复制插件: ${entry.name} (${origin})`)
  cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      // 过滤规则：严禁打包 .git, .env, credentials, 缓存, 会话
      const base = srcPath.split(/[/\\]/).pop() || ''
      if (base === '.git' || base === '.DS_Store' || base === 'node_modules') return false
      if (base.startsWith('.env') || base.includes('credential') || base.includes('token.json')) return false
      if (base === '.dsh-mobile-inbox') return false
      return true
    },
  })
}

console.log('🚀 [3/3] 生成独立运行入口 entry.js...')
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
