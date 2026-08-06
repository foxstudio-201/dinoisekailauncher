/**
 * Dino Isekai — Minecraft Launcher
 * Created by FoxStudio. AI-assisted development.
 *
 * Source code : https://github.com/foxstudio-201/VoxelXLauncher
 * Website     : https://voxxelxclient.vercel.app
 *
 * NOTICE:
 *   - This software is provided as-is without warranty of any kind.
 *   - Do not redistribute or resell without explicit permission from FoxStudio.
 *   - If you use or reference this code, please credit FoxStudio.
 *   - Minecraft is a trademark of Mojang Studios / Microsoft. This project is not affiliated with Mojang.
 */

 /**
 * Dino Isekai — Minecraft Launcher
 * Created by FoxStudio. AI-assisted development.
 *
 * Source code : https://github.com/foxstudio-201/VoxelXLauncher
 * Website     : https://voxxelxclient.vercel.app
 *
 * NOTICE:
 *   - Dành cho mấy cháu cứ thích phỉ báng.
 *   - Launcher sử dụng ai đi kèm trong việc tạo, bản thân người tạo không tự nhận là code toàn bộ do có sự hỗ trợ của ai.
 *   - Giỏi giang thì tự code bằng năng lực của mình đang video làm toàn bộ từ đầu đến cuối, còn không làm được đừng có kích đểu ảnh hưởng đến người sử dụng.
 *   - Bạn chẳng phải là anh hùng mặc áo choàng đỏ mặc quần xịt như thằng trẻ trâu rồi lên mạng ra vẻ ta đây là người tốt, là anh hùng, là người bảo vệ công lý gì đâu :).
 *   - Vậy nên bớt ảo tưởng đi.
 *   - Nếu có sử dụng hoặc tham khảo code này, hãy ghi công cho FoxStudio.
 *   - Minecraft là một thương hiệu của Mojang Studios / Microsoft. Dự án này không liên kết với Mojang.
 */

'use strict'

const https  = require('https')
const http   = require('http')
const fs     = require('fs')
const path   = require('path')
const zlib   = require('zlib')

function inflateRawAsync(buf) {
  return new Promise((resolve, reject) => {
    zlib.inflateRaw(buf, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

async function readZipEntry(buf, entryName) {
  const view = new DataView(buf.buffer ?? buf)
  let eocdOffset = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break }
  }
  if (eocdOffset < 0) return null

  const cdOffset = buf.readUInt32LE(eocdOffset + 16)
  const cdCount  = buf.readUInt16LE(eocdOffset + 10)
  let pos = cdOffset

  for (let i = 0; i < cdCount; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break
    const compMethod  = buf.readUInt16LE(pos + 10)
    const compSize    = buf.readUInt32LE(pos + 20)
    const fnLen       = buf.readUInt16LE(pos + 28)
    const extraLen    = buf.readUInt16LE(pos + 30)
    const commentLen  = buf.readUInt16LE(pos + 32)
    const localOffset = buf.readUInt32LE(pos + 42)
    const fileName    = buf.slice(pos + 46, pos + 46 + fnLen).toString('utf8')

    if (fileName === entryName) {
      const lfnLen  = buf.readUInt16LE(localOffset + 26)
      const lexLen  = buf.readUInt16LE(localOffset + 28)
      const dataOff = localOffset + 30 + lfnLen + lexLen
      const comp    = buf.slice(dataOff, dataOff + compSize)
      if (compMethod === 0) return comp
      if (compMethod === 8) return inflateRawAsync(comp)
      return null
    }
    pos += 46 + fnLen + extraLen + commentLen
  }
  return null
}

async function iterZipEntries(buf, cb) {
  let eocdOffset = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break }
  }
  if (eocdOffset < 0) return

  const cdOffset = buf.readUInt32LE(eocdOffset + 16)
  const cdCount  = buf.readUInt16LE(eocdOffset + 10)
  let pos = cdOffset

  for (let i = 0; i < cdCount; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break
    const compMethod  = buf.readUInt16LE(pos + 10)
    const compSize    = buf.readUInt32LE(pos + 20)
    const fnLen       = buf.readUInt16LE(pos + 28)
    const extraLen    = buf.readUInt16LE(pos + 30)
    const commentLen  = buf.readUInt16LE(pos + 32)
    const localOffset = buf.readUInt32LE(pos + 42)
    const fileName    = buf.slice(pos + 46, pos + 46 + fnLen).toString('utf8')

    await cb(fileName, async () => {
      const lfnLen  = buf.readUInt16LE(localOffset + 26)
      const lexLen  = buf.readUInt16LE(localOffset + 28)
      const dataOff = localOffset + 30 + lfnLen + lexLen
      const comp    = buf.slice(dataOff, dataOff + compSize)
      if (compMethod === 0) return comp
      if (compMethod === 8) return inflateRawAsync(comp)
      return null
    })
    pos += 46 + fnLen + extraLen + commentLen
    if (i % 10 === 0) await new Promise(r => setImmediate(r))
  }
}

async function downloadFile(url, destPath) {
  const dir     = path.dirname(destPath)
  await fs.promises.mkdir(dir, { recursive: true })
  const tmpPath = destPath + '.tmp'

  return new Promise((resolve, reject) => {
    const client  = url.startsWith('https') ? https : http
    const req = client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
      }
      const out = fs.createWriteStream(tmpPath)
      res.pipe(out)
      out.on('finish', async () => {
        try { await fs.promises.rename(tmpPath, destPath) } catch {
          await fs.promises.copyFile(tmpPath, destPath).catch(() => {})
          await fs.promises.unlink(tmpPath).catch(() => {})
        }
        resolve()
      })
      out.on('error', async err => { await fs.promises.unlink(tmpPath).catch(() => {}); reject(err) })
      res.on('error',  async err => { await fs.promises.unlink(tmpPath).catch(() => {}); reject(err) })
    })
    req.on('error', reject)
  })
}

async function importModrinthPack(mrpackPath, instancePath, onProgress) {
  onProgress?.({ phase: 'read', log: 'Đọc file modpack...', percent: 2 })

  const buf = await fs.promises.readFile(mrpackPath)

  const indexData = await readZipEntry(buf, 'modrinth.index.json')
  if (!indexData) throw new Error('modrinth.index.json không tìm thấy trong file')

  const index = JSON.parse(indexData.toString('utf8'))
  const name        = index.name || path.basename(mrpackPath, '.mrpack')
  const gameVersion = index.dependencies?.minecraft || ''
  let loader = 'fabric', loaderVersion = ''

  if (index.dependencies?.['fabric-loader'])   { loader = 'fabric';   loaderVersion = index.dependencies['fabric-loader'] }
  else if (index.dependencies?.['forge'])       { loader = 'forge';    loaderVersion = index.dependencies['forge'] }
  else if (index.dependencies?.['neoforge'])    { loader = 'neoforge'; loaderVersion = index.dependencies['neoforge'] }
  else if (index.dependencies?.['quilt-loader']){ loader = 'quilt';    loaderVersion = index.dependencies['quilt-loader'] }

  const files = (index.files || []).filter(f =>
    !f.env || f.env.client !== 'unsupported'
  )
  const total = files.length

  onProgress?.({ phase: 'mods', log: `Bắt đầu tải ${total} mods...`, done: 0, total, percent: 5 })

  let done = 0
  for (const file of files) {
    done++
    const destPath = path.join(instancePath, file.path)
    const pct = 5 + Math.round((done / total) * 75)

    const exists = await fs.promises.access(destPath).then(() => true).catch(() => false)
    if (exists) {
      onProgress?.({ phase: 'mods', log: `[${done}/${total}] Đã có: ${path.basename(file.path)}`, done, total, percent: pct })
      if (done % 3 === 0) await new Promise(r => setImmediate(r))
      continue
    }

    const url = file.downloads?.[0]
    if (!url) {
      onProgress?.({ phase: 'mods', log: `[${done}/${total}] Bỏ qua (không có URL): ${file.path}`, done, total, percent: pct })
      if (done % 3 === 0) await new Promise(r => setImmediate(r))
      continue
    }

    onProgress?.({ phase: 'mods', log: `[${done}/${total}] Đang tải: ${path.basename(file.path)}`, done, total, percent: pct })
    try {
      await downloadFile(url, destPath)
    } catch (err) {
      onProgress?.({ phase: 'mods', log: `[WARN] Lỗi tải ${path.basename(file.path)}: ${err.message}`, done, total, percent: pct })
    }

    if (done % 3 === 0) await new Promise(r => setImmediate(r))
  }

  onProgress?.({ phase: 'overrides', log: 'Giải nén overrides...', percent: 83 })

  const overridePrefixes = ['overrides/', 'client-overrides/']
  await iterZipEntries(buf, async (fileName, getData) => {
    const prefix = overridePrefixes.find(p => fileName.startsWith(p))
    if (!prefix || fileName.endsWith('/')) return

    const relPath = fileName.slice(prefix.length)
    const destPath = path.join(instancePath, relPath)
    const destDir  = path.dirname(destPath)

    try {
      await fs.promises.mkdir(destDir, { recursive: true })
      const data = await getData()
      if (data) await fs.promises.writeFile(destPath, data)
    } catch {}
  })

  onProgress?.({ phase: 'done', log: `Import hoàn tất: ${name}`, percent: 100 })

  return { name, gameVersion, loader, loaderVersion, iconUrl: null, bgUrl: null }
}

module.exports = { importModrinthPack }
