import assert from 'node:assert/strict'
import { hasLiveAppAncestor, listOrphanCorePids, readEnvValue } from './server-manager.js'

const sample = [
  '/Applications/JackDSH.app/Contents/MacOS/JackDSH --expose-internals',
  '/Applications/JackDSH.app/Contents/Resources/node_modules/@deepseek-ai/dsh/lib/bin.js web --port 3180 --no-open',
  'DSH_HOME=/Users/jkw/Library/Application Support/jackdsh/dsh-data',
  'DSH_PORT=3180 PORT=3180 DSH_WORKSPACE=/Users/jkw/Documents/JackDSH/days/2026-09-22',
].join(' ')

assert.equal(
  readEnvValue(sample, 'DSH_HOME'),
  '/Users/jkw/Library/Application Support/jackdsh/dsh-data',
)
assert.equal(readEnvValue(sample, 'DSH_PORT'), '3180')
assert.equal(readEnvValue('no env here', 'DSH_HOME'), '')

const rows = new Map([
  [10, { pid: 10, ppid: 1, command: '/Applications/JackDSH.app/Contents/MacOS/JackDSH' }],
  [11, { pid: 11, ppid: 10, command: '/Applications/JackDSH.app/Contents/MacOS/JackDSH --expose-internals /opt/bin.js web --port 3180' }],
  [12, { pid: 12, ppid: 1, command: '/Applications/JackDSH.app/Contents/MacOS/JackDSH --expose-internals /opt/bin.js web --port 3180' }],
])
assert.equal(hasLiveAppAncestor(10, rows, 999), true)
assert.equal(hasLiveAppAncestor(1, rows, 999), false)
assert.equal(hasLiveAppAncestor(12, rows, 999), false)
assert.deepEqual(listOrphanCorePids('', process.pid), [])
assert.deepEqual(listOrphanCorePids('/this/path/is/not/a/running/jackdsh/home', process.pid), [])
