// 跨平台构建包装器：解析输出目录后转发给 electron-builder。
// 输出目录优先级：DSH_BUILD_OUT 环境变量 > CI 默认 release/ > 本机 ~/.jds-build-out
// （本机必须躲开 iCloud「桌面与文稿」同步范围，否则 codesign 报 detritus）。
// 用 Node 解析是为了避开 npm 在 Windows 上用 cmd.exe 不认 ${VAR:-x} 的坑。
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const out =
  process.env.DSH_BUILD_OUT ||
  (process.env.CI ? 'release' : join(homedir(), '.jds-build-out'))

console.log(`📦 electron-builder ${args.join(' ')} -> output: ${out}`)
const result = spawnSync(
  'npx',
  ['electron-builder', ...args, `-c.directories.output=${out}`],
  { stdio: 'inherit', shell: true }
)
process.exit(result.status ?? 1)
