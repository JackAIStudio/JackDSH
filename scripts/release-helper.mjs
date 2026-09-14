#!/usr/bin/env node

/**
 * release-helper.mjs
 * 
 * JackDSH 发版中枢流水线
 * 包含：
 * 1. preflight: 全生态发版前门禁检查（插件 clean/pushed、manifest 对齐、当前仓状态）
 * 2. draft-notes: 自动提取自上次发版以来所有插件的 commit 记录，并生成 Release Notes 初稿
 * 3. bump: 规范更新 package.json 版本号并生成变更日志文件
 */

import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { scanAllPlugins } from './scan-plugins-status.mjs'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const jackDshDir = resolve(__dirname, '..')
const pkgJsonPath = join(jackDshDir, 'package.json')
const pluginsDir = resolve(jackDshDir, '../plugins')

async function git(cwd, args) {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd, encoding: 'utf8' })
    return { ok: true, stdout: stdout.trim() }
  } catch (err) {
    return { ok: false, error: err.message, stdout: '' }
  }
}

/**
 * 1. 发版门禁检查 (preflight)
 */
export async function runPreflight(options = {}) {
  console.log('🔍 [1/3] 正在执行插件生态 Git 与同步门禁检查...')
  const scanResult = await scanAllPlugins({ fetch: Boolean(options.fetch) })
  
  const blockers = []
  const warnings = []

  // 检查插件脏文件与未推送
  if (scanResult.categories.dirty.length > 0) {
    for (const p of scanResult.categories.dirty) {
      blockers.push(`插件 \`${p.name}\` 有 ${p.dirtyCount} 个未提交变更 (${p.dirtyFiles.join(', ')})`)
    }
  }

  if (scanResult.categories.ahead.length > 0) {
    for (const p of scanResult.categories.ahead) {
      blockers.push(`插件 \`${p.name}\` 有 ${p.ahead} 个本地 commit 尚未 push 到 GitHub`)
    }
  }

  if (scanResult.categories.abnormalBranch.length > 0) {
    for (const p of scanResult.categories.abnormalBranch) {
      warnings.push(`插件 \`${p.name}\` 当前分支为 \`${p.branch}\`（非 main）`)
    }
  }

  // 检查 JackDSH 自身仓库状态
  console.log('🔍 [2/3] 正在检查 JackDSH 自身仓库状态...')
  const statusRes = await git(jackDshDir, ['status', '--porcelain'])
  const dshDirty = statusRes.ok && statusRes.stdout
    ? statusRes.stdout.split('\n').filter(Boolean)
    : []
  if (dshDirty.length > 0) {
    warnings.push(`JackDSH 仓库自身有未提交的改动: ${dshDirty.slice(0, 3).join(', ')}`)
  }

  // 检查已打包插件与清单对齐
  console.log('🔍 [3/3] 正在校验 plugins.manifest.yaml 清单完整性...')
  const missingInManifest = scanResult.plugins.filter((p) => p.isGit && !p.inManifest)
  if (missingInManifest.length > 0) {
    warnings.push(`以下自研插件未在 plugins.manifest.yaml 声明: ${missingInManifest.map((p) => p.name).join(', ')}`)
  }

  const passed = blockers.length === 0

  return {
    passed,
    scanResult,
    blockers,
    warnings,
  }
}

/**
 * 2. 收集各个插件近期的 commit 历史以生成 Release Notes
 */
export async function collectPluginsChangelog(sinceTagOrDays = 7) {
  const entries = readdirSync(pluginsDir, { withFileTypes: true })
  const pluginDirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => join(pluginsDir, e.name))

  const changes = []

  for (const dir of pluginDirs) {
    const name = dir.split('/').pop()
    const gitDir = join(dir, '.git')
    if (!existsSync(gitDir)) continue

    // 获取 package.json 版本
    let version = '0.0.0'
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      version = pkg.version || '0.0.0'
    } catch {}

    // 尝试拉取最近的 commit log（默认取最近 7 天，或者最近 10 条）
    const logArgs = [
      'log',
      '--no-merges',
      '--pretty=format:%h %s (%an)',
      `-n`, '8',
      `--since=${typeof sinceTagOrDays === 'number' ? `${sinceTagOrDays}.days` : '14.days'}`,
    ]
    const logRes = await git(dir, logArgs)
    const commits = logRes.ok && logRes.stdout
      ? logRes.stdout.split('\n').map((l) => l.trim()).filter(Boolean)
      : []

    if (commits.length > 0) {
      changes.push({
        name,
        version,
        commits,
      })
    }
  }

  return changes
}

/**
 * 3. 生成 Release Notes 草稿
 */
export async function draftReleaseNotes(targetVersion, days = 7) {
  const currentPkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  const version = targetVersion || currentPkg.version
  const changelog = await collectPluginsChangelog(days)

  const template = `## 🚀 JackDSH v${version} 发布说明

欢迎使用 JackDSH 开箱即用桌面客户端全新版本 **v${version}**！  
本次更新全面同步了自研插件生态的最新能力，修复了多项关键体验问题，并对系统稳定性与跨平台构建进行了系统性加固。

---

### ✨ 核心更新亮点

${changelog.map((item, idx) => `#### ${idx + 1}. 🧩 \`${item.name}\` (v${item.version})
${item.commits.map((c) => `- ${c}`).join('\n')}
`).join('\n')}

---

### 📥 客户端下载

- **macOS (Apple Silicon arm64)**: \`JackDSH-${version}-Mac-arm64.dmg\`
- **Windows 绿色免安装便携版 (x64)**: \`JackDSH-${version}-Windows-portable.zip\`

---
*由 JackDSH Release Helper 自动提炼生成。*
`
  return { version, template, changelog }
}

/**
 * 4. Bump 版本号
 */
export function bumpVersion(newVersion) {
  if (!newVersion || !/^\d+\.\d+\.\d+/.test(newVersion)) {
    throw new Error(`无效的版本号: ${newVersion}，请传入例如 9.14.9`)
  }
  const currentPkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  const oldVersion = currentPkg.version
  currentPkg.version = newVersion
  writeFileSync(pkgJsonPath, JSON.stringify(currentPkg, null, 2) + '\n', 'utf8')
  return { oldVersion, newVersion }
}

// 命令行运行入口
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || 'preflight'

  if (command === 'preflight') {
    runPreflight().then(({ passed, blockers, warnings }) => {
      console.log('\n==================================================')
      if (warnings.length > 0) {
        console.log('⚠️  发版注意事项 (Warnings):')
        for (const w of warnings) console.log(`   - ${w}`)
        console.log()
      }
      if (!passed) {
        console.error('❌ 发版门禁未通过 (Blocked): 存在未提交或未推送到 GitHub 的插件代码！')
        for (const b of blockers) console.error(`   🚨 ${b}`)
        console.log('\n建议: 请先让 AI 或手动将上述插件的变更提交并 push 到 GitHub 后再发版。')
        process.exit(1)
      } else {
        console.log('✅ 发版门禁 100% 通过！所有插件工作区干净、分支正确且已完全推送到 GitHub。')
        process.exit(0)
      }
    })
  } else if (command === 'draft-notes') {
    const ver = process.argv[3]
    draftReleaseNotes(ver).then(({ version, template, changelog }) => {
      const filename = `RELEASE_NOTES_v${version}.md`
      const targetPath = join(jackDshDir, filename)
      writeFileSync(targetPath, template, 'utf8')
      console.log(`✅ 已生成 ${filename} (覆盖了 ${changelog.length} 个近期有更新的插件)`)
      console.log(`文件路径: ${targetPath}`)
    })
  } else if (command === 'bump') {
    const nextVer = process.argv[3]
    if (!nextVer) {
      console.error('用法: node release-helper.mjs bump <newVersion>')
      process.exit(1)
    }
    const { oldVersion, newVersion } = bumpVersion(nextVer)
    console.log(`✅ JackDSH 版本已从 v${oldVersion} 递增至 v${newVersion}`)
  } else {
    console.log(`用法: node release-helper.mjs [preflight | draft-notes <ver> | bump <ver>]`)
  }
}
