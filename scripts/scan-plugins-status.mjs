#!/usr/bin/env node

/**
 * scan-plugins-status.mjs
 * 
 * JackDSH 插件生态 Git 同步状态秒级并发扫描引擎
 * 用于快速排查 ~/Documents/dshspace/plugins 下所有自研插件的：
 * 1. 工作区未提交改动 (isDirty / dirtyCount)
 * 2. 待推送到 GitHub 的提交 (ahead)
 * 3. 待拉取的远程更新 (behind，支持 --fetch 探测)
 * 4. 当前分支是否为主干 main
 * 5. package.json 声明版本号
 * 6. 与 JackDSH/plugins.manifest.yaml 的对齐状态
 */

import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const jackDshDir = resolve(__dirname, '..')
const defaultPluginsDir = resolve(jackDshDir, '../plugins')

// 解析 plugins.manifest.yaml 中的插件名单
function readManifestPlugins() {
  const manifestPath = join(jackDshDir, 'plugins.manifest.yaml')
  const set = new Set()
  if (!existsSync(manifestPath)) return set
  try {
    const text = readFileSync(manifestPath, 'utf8')
    for (const rawLine of text.split('\n')) {
      const match = rawLine.match(/^\s*-\s+name:\s*['"]?([^'"\s]+)['"]?\s*$/)
      if (match) set.add(match[1])
    }
  } catch {}
  return set
}

// 执行单一 Git 命令（带超时与静默容错）
async function git(cwd, args, timeout = 3000) {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      timeout,
      encoding: 'utf8',
      env: { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' },
    })
    return { ok: true, stdout: stdout.trim() }
  } catch (err) {
    return { ok: false, error: err.message, stdout: '' }
  }
}

/**
 * 扫描单个插件目录
 */
export async function scanSinglePlugin(dirPath, options = {}) {
  const name = dirPath.split('/').pop()
  const gitDir = join(dirPath, '.git')
  const pkgPath = join(dirPath, 'package.json')

  let version = '0.0.0'
  let description = ''
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      if (pkg.version) version = pkg.version
      if (pkg.description) description = pkg.description
    } catch {}
  }

  if (!existsSync(gitDir)) {
    return {
      name,
      path: dirPath,
      version,
      description,
      isGit: false,
      synced: false,
      reason: 'not_git_repo',
    }
  }

  // 若传了 --fetch，发起带超时的 git fetch
  if (options.fetch) {
    await git(dirPath, ['fetch', '--quiet'], 5000)
  }

  // 1. 获取当前分支
  const branchRes = await git(dirPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
  const branch = branchRes.ok ? branchRes.stdout : 'unknown'

  // 2. 获取 remote url
  const remoteRes = await git(dirPath, ['config', '--get', 'remote.origin.url'])
  const remoteUrl = remoteRes.ok ? remoteRes.stdout : ''
  const hasRemote = Boolean(remoteUrl)

  // 3. 检查未提交状态 (porcelain)
  const statusRes = await git(dirPath, ['status', '--porcelain'])
  const dirtyLines = statusRes.ok && statusRes.stdout
    ? statusRes.stdout.split('\n').filter(Boolean)
    : []
  const isDirty = dirtyLines.length > 0
  const dirtyFiles = dirtyLines.slice(0, 5).map((l) => l.trim())

  // 4. 检查 ahead 与 behind
  let ahead = 0
  let behind = 0
  let hasUpstream = false

  const upstreamRes = await git(dirPath, ['rev-parse', '--abbrev-ref', '@{u}'])
  if (upstreamRes.ok && upstreamRes.stdout) {
    hasUpstream = true
    const revCountRes = await git(dirPath, ['rev-list', '--left-right', '--count', '@{u}...HEAD'])
    if (revCountRes.ok) {
      // 格式: behind\tahead
      const parts = revCountRes.stdout.split(/\s+/)
      if (parts.length >= 2) {
        behind = parseInt(parts[0], 10) || 0
        ahead = parseInt(parts[1], 10) || 0
      }
    }
  }

  const synced = !isDirty && ahead === 0 && behind === 0 && hasRemote && branch === 'main'

  return {
    name,
    path: dirPath,
    version,
    description,
    isGit: true,
    branch,
    hasRemote,
    remoteUrl,
    hasUpstream,
    isDirty,
    dirtyCount: dirtyLines.length,
    dirtyFiles,
    ahead,
    behind,
    synced,
  }
}

/**
 * 全量扫描所有插件
 */
export async function scanAllPlugins(options = {}) {
  const pluginsDir = options.pluginsDir || defaultPluginsDir
  if (!existsSync(pluginsDir)) {
    throw new Error(`插件目录不存在: ${pluginsDir}`)
  }

  const manifestPlugins = readManifestPlugins()
  const entries = readdirSync(pluginsDir, { withFileTypes: true })
  const pluginDirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => join(pluginsDir, e.name))

  // 并发探测
  const results = await Promise.all(
    pluginDirs.map((dir) => scanSinglePlugin(dir, options))
  )

  // 标记是否在 plugins.manifest.yaml
  for (const item of results) {
    item.inManifest = manifestPlugins.has(item.name)
  }

  // 分类归纳
  const dirty = results.filter((r) => r.isDirty)
  const ahead = results.filter((r) => !r.isDirty && r.ahead > 0)
  const behind = results.filter((r) => r.behind > 0)
  const abnormalBranch = results.filter((r) => r.isGit && r.branch !== 'main')
  const synced = results.filter((r) => r.synced)

  return {
    timestamp: new Date().toISOString(),
    pluginsDir,
    total: results.length,
    summary: {
      syncedCount: synced.length,
      dirtyCount: dirty.length,
      aheadCount: ahead.length,
      behindCount: behind.length,
      abnormalBranchCount: abnormalBranch.length,
      isAllClean: dirty.length === 0 && ahead.length === 0,
    },
    categories: {
      dirty,
      ahead,
      behind,
      abnormalBranch,
      synced,
    },
    plugins: results,
  }
}

/**
 * 格式化为 Markdown 看板
 */
export function formatAsMarkdown(scanResult) {
  const { summary, categories, total } = scanResult
  const lines = []

  lines.push(`### 📊 JackDSH 插件 GitHub 同步大盘`)
  lines.push(`**插件总数**: ${total} ｜ 🟢 **完全同步**: ${summary.syncedCount} ｜ 🚨 **未提交**: ${summary.dirtyCount} ｜ ⬆️ **待推送**: ${summary.aheadCount} ｜ ⬇️ **待拉取**: ${summary.behindCount}`)
  lines.push('')

  if (categories.dirty.length > 0) {
    lines.push(`#### 🚨 本地有未提交改动 (${categories.dirty.length})`)
    for (const p of categories.dirty) {
      const sample = p.dirtyFiles.length > 0 ? ` (例: ${p.dirtyFiles.join(', ')})` : ''
      lines.push(`- **\`${p.name}\`** [${p.branch}] v${p.version}: ${p.dirtyCount} 个文件修改${sample}`)
    }
    lines.push('')
  }

  if (categories.ahead.length > 0) {
    lines.push(`#### ⬆️ 待推送到 GitHub (${categories.ahead.length})`)
    for (const p of categories.ahead) {
      lines.push(`- **\`${p.name}\`** [${p.branch}] v${p.version}: 领先远程 **${p.ahead}** 个 commit`)
    }
    lines.push('')
  }

  if (categories.behind.length > 0) {
    lines.push(`#### ⬇️ 远程有新更新待拉取 (${categories.behind.length})`)
    for (const p of categories.behind) {
      lines.push(`- **\`${p.name}\`** [${p.branch}] v${p.version}: 落后远程 **${p.behind}** 个 commit`)
    }
    lines.push('')
  }

  if (categories.abnormalBranch.length > 0) {
    lines.push(`#### ⚠️ 非主干 main 分支 (${categories.abnormalBranch.length})`)
    for (const p of categories.abnormalBranch) {
      lines.push(`- **\`${p.name}\`**: 当前分支为 \`${p.branch}\``)
    }
    lines.push('')
  }

  if (categories.synced.length > 0) {
    lines.push(`#### ✅ 已与 GitHub 完全同步 (${categories.synced.length})`)
    const syncedNames = categories.synced.map((p) => `\`${p.name}\` (v${p.version})`).join('、')
    lines.push(syncedNames)
    lines.push('')
  }

  return lines.join('\n')
}

// 命令行直接执行
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isJson = process.argv.includes('--json')
  const isMarkdown = process.argv.includes('--markdown')
  const doFetch = process.argv.includes('--fetch')

  const start = Date.now()
  scanAllPlugins({ fetch: doFetch })
    .then((result) => {
      const elapsed = Date.now() - start
      if (isJson) {
        console.log(JSON.stringify(result, null, 2))
      } else if (isMarkdown) {
        console.log(formatAsMarkdown(result))
      } else {
        // 友好彩色输出
        console.log(`\n📦 JackDSH 插件生态 Git 同步扫描 (${elapsed}ms)`)
        console.log(`--------------------------------------------------`)
        console.log(`总计: ${result.total} 个插件 ｜ 同步: \x1b[32m${result.summary.syncedCount}\x1b[0m ｜ 未提交: \x1b[33m${result.summary.dirtyCount}\x1b[0m ｜ 待推送: \x1b[34m${result.summary.aheadCount}\x1b[0m ｜ 待拉取: \x1b[35m${result.summary.behindCount}\x1b[0m\n`)

        if (result.categories.dirty.length > 0) {
          console.log(`\x1b[33m🚨 本地有未提交改动 (${result.categories.dirty.length})\x1b[0m:`)
          for (const p of result.categories.dirty) {
            console.log(`  - ${p.name.padEnd(25)} [${p.branch}] ${p.dirtyCount} 个未提交变更`)
          }
          console.log()
        }

        if (result.categories.ahead.length > 0) {
          console.log(`\x1b[34m⬆️ 待推送到 GitHub (${result.categories.ahead.length})\x1b[0m:`)
          for (const p of result.categories.ahead) {
            console.log(`  - ${p.name.padEnd(25)} [${p.branch}] ahead +${p.ahead}`)
          }
          console.log()
        }

        if (result.categories.behind.length > 0) {
          console.log(`\x1b[35m⬇️ 远程待拉取 (${result.categories.behind.length})\x1b[0m:`)
          for (const p of result.categories.behind) {
            console.log(`  - ${p.name.padEnd(25)} [${p.branch}] behind -${p.behind}`)
          }
          console.log()
        }

        if (result.categories.synced.length > 0) {
          console.log(`\x1b[32m✅ 完全同步 (${result.categories.synced.length})\x1b[0m:`)
          console.log(`  ${result.categories.synced.map((p) => p.name).join(', ')}`)
          console.log()
        }
      }
    })
    .catch((err) => {
      console.error('扫描失败:', err)
      process.exit(1)
    })
}
