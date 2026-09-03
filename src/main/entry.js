/**
 * JackDSH Embedded Core Entry
 * Boots the official DeepSeek Harness Web engine
 */
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const portIndex = process.argv.indexOf('--port')
const port = portIndex !== -1 ? process.argv[portIndex + 1] : (process.env.DSH_PORT || '3180')

console.log(`[JackDSH] Booting DeepSeek Harness Web core on port ${port}...`)

process.argv = [process.execPath, 'dsh', 'web', '--port', String(port), '--no-open']
await import('@deepseek-ai/dsh/lib/bin.js')
