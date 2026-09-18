// 跨平台构建包装器：解析输出目录后转发给 electron-builder。
// 输出目录优先级：DSH_BUILD_OUT 环境变量 > CI 默认 release/ > 本机 ~/.jds-build-out
// （本机必须躲开 iCloud「桌面与文稿」同步范围，否则 codesign 报 detritus）。
// 用 Node 解析是为了避开 npm 在 Windows 上用 cmd.exe 不认 ${VAR:-x} 的坑。
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const rawArgs = process.argv.slice(2)
const isPreview = rawArgs.includes('--preview')
const args = rawArgs.filter((a) => a !== '--preview')

const out =
  process.env.DSH_BUILD_OUT ||
  (process.env.CI ? 'release' : join(homedir(), '.jds-build-out'))

const configFile = isPreview ? 'electron-builder.preview.yml' : 'electron-builder.yml'

console.log(`📦 electron-builder ${args.join(' ')} ${isPreview ? '(Channel: PREVIEW) ' : ''}-> output: ${out}`)
// --publish never：发布由 workflow 的 action-gh-release 负责，
// 禁掉 electron-builder 自带的 GitHub publish（否则它要 GH_TOKEN 并重复发版）
const result = spawnSync(
  'npx',
  ['electron-builder', ...args, `--config=${configFile}`, `-c.directories.output=${out}`, '--publish', 'never'],
  { stdio: 'inherit', shell: true }
)
process.exit(result.status ?? 1)
