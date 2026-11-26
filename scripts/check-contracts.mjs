// 契约金样本完整性校验：副本按 LF 归一化后计算 SHA-256，与指纹文件比对。
// 跨平台确定：无论 Windows（CRLF）还是 Linux（LF）检出，哈希都一致。
// 用法：node scripts/check-contracts.mjs contracts/ws-frames.json contracts/ws-frames.sha256
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const [file, pinFile] = process.argv.slice(2)
if (!file || !pinFile) {
  console.error('用法：node scripts/check-contracts.mjs <金样本文件> <指纹文件>')
  process.exit(2)
}

const normalized = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const actual = createHash('sha256').update(normalized, 'utf8').digest('hex')

const pin = readFileSync(pinFile, 'utf8').trim().split(/\s+/)
const [expected, name] = pin
if (name && !file.endsWith(name)) {
  console.error(`指纹文件指向 ${name}，与被检文件 ${file} 不符`)
  process.exit(2)
}

if (actual !== expected) {
  console.error(`契约金样本与指纹不一致！\n  实际 ${actual}\n  指纹 ${expected}\n  请勿手改副本：从主仓库 contracts/ 重新同步并更新指纹。`)
  process.exit(1)
}

console.log(`契约金样本校验通过 ${name} sha256=${actual}`)
