import net from 'node:net'

/**
 * Check if a specific TCP port is free on localhost.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => {
      resolve(false)
    })
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, '127.0.0.1')
  })
}

/**
 * Find the next available port starting from startPort.
 * @param {number} startPort
 * @param {number} maxAttempts
 * @returns {Promise<number>}
 */
export async function findFreePort(startPort = 3180, maxAttempts = 50) {
  for (let offset = 0; offset < maxAttempts; offset++) {
    const candidate = startPort + offset
    const free = await isPortFree(candidate)
    if (free) {
      return candidate
    }
  }
  throw new Error(`Could not find a free port between ${startPort} and ${startPort + maxAttempts}`)
}
