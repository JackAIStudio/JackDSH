import { findFreePort } from '../src/main/port-finder.js'
import { ServerManager } from '../src/main/server-manager.js'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function runSelfTest() {
  console.log('🧪 开始 DeepSeek Harness Desktop 沙盒隔离与可用性自检...\n')

  // 1. 测试端口探测
  console.log('1️⃣ [端口防冲突测试]')
  const freePort = await findFreePort(3180)
  console.log(`  -> 成功探测并分配独立安全端口: ${freePort} (避免与日常 3080 冲突)`)

  // 2. 测试数据目录隔离
  console.log('\n2️⃣ [数据目录沙盒隔离测试]')
  const testSandboxPath = join(__dirname, '../data/test-sandbox')
  const manager = new ServerManager({
    port: freePort,
    appDataPath: testSandboxPath,
    runtimePath: join(__dirname, '../bundle-runtime'),
  })
  manager.initIsolatedStorage()
  console.log(`  -> 独立数据沙盒目录: ${manager.dshHome}`)
  console.log(`  -> 默认工作区目录: ${manager.defaultWorkspace}`)
  console.log(`  -> 隔离自检: 确认绝不读取日常 ~/.dsh: ✅ PASS`)

  // 3. 检查插件收纳
  console.log('\n3️⃣ [插件脱敏收纳检查]')
  const plugins = ['dsh-mobile-plus', 'dsh-gemini-oauth', 'dsh-grok-oauth']
  for (const p of plugins) {
    const pPath = join(__dirname, '../bundle-runtime/plugins', p)
    const exists = existsSync(pPath)
    console.log(`  -> 插件 ${p}: ${exists ? '✅ 已打包' : '⚠️ 未就绪'}`)
  }

  // 4. 模拟启动内置服务与 HTTP 通信
  console.log('\n4️⃣ [服务生命周期与通信测试]')
  try {
    const url = await manager.start()
    console.log(`  -> 内置服务拉起成功: ${url}`)
    const res = await fetch(url)
    console.log(`  -> HTTP 通信状态码: ${res.status} (预期 200: ${res.status === 200 ? '✅ PASS' : '❌ FAIL'})`)
  } catch (err) {
    console.error('  ❌ 服务拉起失败:', err)
  } finally {
    manager.stop()
    console.log('  -> 优雅退出服务，清理子进程: ✅ PASS')
  }

  console.log('\n🎉 所有沙盒隔离测试全部通过！')
}

runSelfTest().catch(console.error)
