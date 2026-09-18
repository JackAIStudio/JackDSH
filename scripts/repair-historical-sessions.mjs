#!/usr/bin/env node
/**
 * repair-historical-sessions.mjs
 * 
 * JackDSH 历史会话三维全自动自愈与安全修复工具
 * 彻底解决 DSH 0.1.5 历史会话迁移中的三大拦路虎：
 * 1. 白名单拒绝 (Refusal): 清除 thoughtSignature, thinkingSignature, textSignature, abort stack 等非标字段；
 * 2. 原始真实源 (SSOT): 强制以原始纯净的 .bak 文件为基础进行清洗，绝不污染原始结构；
 * 3. 多帧断言 (Zstd Frame): 严格采用 Frame 1 (仅Header) + Frame 2 (全部Body) 的级联压缩格式，100% 满足 assertZstdHeaderFrame。
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { sessionFormatCatalog } from '@deepseek-ai/dsh-session-format-catalog';

const SESSIONS_ROOT = join(homedir(), 'Library/Application Support/jackdsh/dsh-data/sessions');

function cleanObject(obj, stats) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObject(item, stats));
  }
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'thoughtSignature' || k === 'thinkingSignature' || k === 'textSignature') {
      stats.signaturesRemoved++;
      continue;
    }
    if (k === 'stack' && obj.kind && ['user', 'parent', 'disposed', 'legacy'].includes(obj.kind)) {
      stats.stacksRemoved++;
      continue;
    }
    res[k] = cleanObject(v, stats);
  }
  return res;
}

function processSession(sessionDir) {
  const v0Path = join(sessionDir, 'session.jsonl.zstd');
  const bakPath = join(sessionDir, 'session.jsonl.zstd.bak');

  if (!existsSync(v0Path) && !existsSync(bakPath)) return null;

  // 备份原件（若已存在 .bak 则不覆盖，保留最原始历史）
  if (!existsSync(bakPath)) {
    copyFileSync(v0Path, bakPath);
  }

  // 优先从原始纯净的 bakPath 读取
  const readSource = existsSync(bakPath) ? bakPath : v0Path;

  let rawText;
  try {
    rawText = execSync(`zstd -dc "${readSource}"`, { maxBuffer: 100 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
  } catch (err) {
    return { status: 'error', error: `解压失败: ${err.message}` };
  }

  const lines = rawText.trim().split('\n');
  if (lines.length === 0) return null;

  let headerJson;
  try {
    headerJson = JSON.parse(lines[0]);
  } catch (err) {
    return { status: 'error', error: `解析 Header 失败: ${err.message}` };
  }

  if (headerJson.type !== 'session' || headerJson.version !== 0) {
    return { status: 'skipped', reason: `已是 v${headerJson.version} 格式` };
  }

  const stats = { signaturesRemoved: 0, stacksRemoved: 0 };
  const cleanedRows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = JSON.parse(lines[i]);
    const cleaned = cleanObject(row, stats);
    cleanedRows.push(cleaned);
  }

  // 严格执行官方迁移管线审计
  try {
    const restore = sessionFormatCatalog.createRestore(headerJson, { recovery: 'recoverable', validation: 'transformed' });
    for (const row of cleanedRows) {
      restore.decodeRow(row);
    }
    restore.finish();
  } catch (err) {
    return { status: 'error', error: `迁移预检失败: ${err.message}` };
  }

  // 写入标准双帧 Zstandard 文件（Frame 1: 仅 Header; Frame 2: 全部 Body 行）
  const headerText = JSON.stringify(headerJson) + '\n';
  const bodyText = cleanedRows.map(r => JSON.stringify(r)).join('\n') + '\n';

  const uid = randomUUID();
  const tmpHead = join(tmpdir(), `dsh_h_${uid}.jsonl`);
  const tmpBody = join(tmpdir(), `dsh_b_${uid}.jsonl`);
  const tmpHeadZst = join(tmpdir(), `dsh_h_${uid}.zst`);
  const tmpBodyZst = join(tmpdir(), `dsh_b_${uid}.zst`);

  try {
    writeFileSync(tmpHead, headerText, 'utf8');
    writeFileSync(tmpBody, bodyText, 'utf8');
    execSync(`zstd -f -q -19 "${tmpHead}" -o "${tmpHeadZst}"`);
    execSync(`zstd -f -q -19 "${tmpBody}" -o "${tmpBodyZst}"`);

    const headBuf = readFileSync(tmpHeadZst);
    const bodyBuf = readFileSync(tmpBodyZst);
    const combined = Buffer.concat([headBuf, bodyBuf]);
    writeFileSync(v0Path, combined);
  } finally {
    try { unlinkSync(tmpHead); } catch {}
    try { unlinkSync(tmpBody); } catch {}
    try { unlinkSync(tmpHeadZst); } catch {}
    try { unlinkSync(tmpBodyZst); } catch {}
  }

  return {
    status: 'repaired',
    signaturesRemoved: stats.signaturesRemoved,
    stacksRemoved: stats.stacksRemoved,
  };
}

async function main() {
  console.log('🔍 开始全量扫描并三维自愈 JackDSH 本地历史会话...');
  if (!existsSync(SESSIONS_ROOT)) {
    console.error(`❌ 未找到会话根目录: ${SESSIONS_ROOT}`);
    process.exit(1);
  }

  const dayDirs = readdirSync(SESSIONS_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => join(SESSIONS_ROOT, d.name));

  const allSessionDirs = dayDirs.flatMap(dayDir => {
    return readdirSync(dayDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => join(dayDir, d.name));
  });

  console.log(`📁 找到 ${allSessionDirs.length} 个历史会话。开始修复...\n`);

  let repairedCount = 0;
  let cleanCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const sessionDir of allSessionDirs) {
    const sessionName = basename(sessionDir);
    const dayName = basename(dirname(sessionDir));
    const res = processSession(sessionDir);

    if (!res) continue;

    if (res.status === 'repaired') {
      repairedCount++;
      const detail = `清除签名: ${res.signaturesRemoved}, 清除stack: ${res.stacksRemoved}`;
      console.log(`  ✅ 已安全自愈: [${dayName}] ${sessionName} (${detail})`);
    } else if (res.status === 'clean') {
      cleanCount++;
    } else if (res.status === 'skipped') {
      skippedCount++;
    } else if (res.status === 'error') {
      errorCount++;
      console.error(`  ❌ 修复失败: [${dayName}] ${sessionName}: ${res.error}`);
    }
  }

  console.log('\n================ 修复统计 ================');
  console.log(`总会话数:       ${allSessionDirs.length}`);
  console.log(`成功自愈会话:   ${repairedCount}`);
  console.log(`跳过/已升级:    ${skippedCount}`);
  console.log(`失败会话:       ${errorCount}`);
  console.log('==========================================');

  if (errorCount === 0) {
    console.log('\n🎉 所有历史会话已全部通过官方迁移管线审计并完成双帧打包！');
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('致命异常:', err);
  process.exit(1);
});
