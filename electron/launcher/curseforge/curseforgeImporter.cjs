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

const CF_API_BASE  = 'https://api.curseforge.com/v1'
const CF_PROXY     = 'https://api.curse.tools/v1/cf'

function inflateRawAsync(buf) {
  return new Promise((resolve, reject) => {
    zlib.inflateRaw(buf, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

async function readZipEntry(buf, entryName) {
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

function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0', ...headers }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return httpsGetJson(res.headers.location, headers).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) }
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timed out: ${url}`)) })
  })
}

async function downloadFile(url, destPath, headers = {}) {
  const dir     = path.dirname(destPath)
  await fs.promises.mkdir(dir, { recursive: true })
  const tmpPath = destPath + '.tmp'

  return new Promise((resolve, reject) => {
    let settled = false
    function done(err) {
      if (settled) return
      settled = true
      if (err) reject(err); else resolve()
    }

    const MAX_REDIRECTS = 10
    function doGet(reqUrl, redirectCount) {
      if (redirectCount > MAX_REDIRECTS) return done(new Error('Too many redirects'))
      const client = reqUrl.startsWith('https') ? https : http
      client.get(reqUrl, { headers: { 'User-Agent': 'DinoIsekai/1.0', ...headers } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return doGet(res.headers.location, redirectCount + 1)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return done(new Error(`HTTP ${res.statusCode}: ${reqUrl}`))
        }
        const out = fs.createWriteStream(tmpPath)
        res.pipe(out)
        out.on('finish', async () => {
          try { await fs.promises.rename(tmpPath, destPath) } catch {
            await fs.promises.copyFile(tmpPath, destPath).catch(() => {})
            await fs.promises.unlink(tmpPath).catch(() => {})
          }
          done()
        })
        out.on('error', async err => { await fs.promises.unlink(tmpPath).catch(() => {}); done(err) })
        res.on('error',  async err => { await fs.promises.unlink(tmpPath).catch(() => {}); done(err) })
      }).on('error', err => done(err))
    }
    doGet(url, 0)
  })
}

async function getModDownloadUrl(projectId, fileId, apiKey) {

  if (apiKey) {
    try {
      const data = await httpsGetJson(
        `${CF_API_BASE}/mods/${projectId}/files/${fileId}/download-url`,
        { 'x-api-key': apiKey }
      )
      if (data?.data) return data.data
    } catch {}
  }

  try {
    const data = await httpsGetJson(`${CF_PROXY}/mods/${projectId}/files/${fileId}/download-url`)
    if (data?.data) return data.data
  } catch {}

  return null
}

async function importCurseForgePack(zipPath, instancePath, onProgress, apiKey) {
  onProgress?.({ phase: 'read', log: 'Đọc file modpack...', percent: 2 })

  const buf = await fs.promises.readFile(zipPath)

  const manifestData = await readZipEntry(buf, 'manifest.json')
  if (!manifestData) throw new Error('manifest.json không tìm thấy trong file')

  const manifest = JSON.parse(manifestData.toString('utf8'))
  const name        = manifest.name || path.basename(zipPath, '.zip')
  const gameVersion = manifest.minecraft?.version || ''
  const loaderArr   = manifest.minecraft?.modLoaders || []
  const loaderRaw   = loaderArr[0]?.id || ''
  const iconUrl     = manifest.image || null

  let loader = 'forge', loaderVersion = ''
  if (loaderRaw.startsWith('forge-'))     { loader = 'forge';    loaderVersion = loaderRaw.replace('forge-', '') }
  else if (loaderRaw.startsWith('fabric-'))   { loader = 'fabric';   loaderVersion = loaderRaw.replace('fabric-', '') }
  else if (loaderRaw.startsWith('neoforge-')) { loader = 'neoforge'; loaderVersion = loaderRaw.replace('neoforge-', '') }

  const mods  = manifest.files || []
  const total = mods.length
  const modsDir = path.join(instancePath, 'mods')
  await fs.promises.mkdir(modsDir, { recursive: true })

  onProgress?.({ phase: 'mods', log: `Bắt đầu tải ${total} mods...`, done: 0, total, percent: 5 })

  let done = 0
  let skipped = 0

  onProgress?.({ phase: 'mods', log: `[1/${total}] Đang lấy danh sách URL...`, done: 0, total, percent: 5 })

  const urlResults = []
  for (const mod of mods) {
    const url = await getModDownloadUrl(mod.projectID, mod.fileID, apiKey)
    urlResults.push(url)
    const idx = urlResults.length
    if (idx % 10 === 0 || idx === total) {
      onProgress?.({ phase: 'mods', log: `Đã lấy URL: ${idx}/${total}`, done: idx, total, percent: 5 + Math.round((idx / total) * 15) })
      await new Promise(r => setImmediate(r))
    }
  }

  for (let i = 0; i < total; i++) {
    done++
    const pct = 20 + Math.round((done / total) * 60)

    const url = urlResults[i]
    if (!url) {
      skipped++
      onProgress?.({ phase: 'mods', log: `[${done}/${total}] Bỏ qua (không lấy được URL): projectID=${mods[i].projectID}`, done, total, percent: pct })
      if (done % 3 === 0) await new Promise(r => setImmediate(r))
      continue
    }

    const fileName = url.split('/').pop().split('?')[0]
    const destPath = path.join(modsDir, decodeURIComponent(fileName))

    const exists = await fs.promises.access(destPath).then(() => true).catch(() => false)
    if (exists) {
      onProgress?.({ phase: 'mods', log: `[${done}/${total}] Đã có: ${fileName}`, done, total, percent: pct })
      if (done % 3 === 0) await new Promise(r => setImmediate(r))
      continue
    }

    onProgress?.({ phase: 'mods', log: `[${done}/${total}] Đang tải: ${fileName}`, done, total, percent: pct })
    try {
      await downloadFile(url, destPath)
    } catch (err) {
      skipped++
      onProgress?.({ phase: 'mods', log: `[WARN] Lỗi tải ${fileName}: ${err.message}`, done, total, percent: pct })
    }

    if (done % 3 === 0) await new Promise(r => setImmediate(r))
  }

  onProgress?.({ phase: 'overrides', log: 'Giải nén overrides...', percent: 85 })

  await iterZipEntries(buf, async (fileName, getData) => {
    if (!fileName.startsWith('overrides/') || fileName.endsWith('/')) return
    const relPath  = fileName.slice('overrides/'.length)
    const destPath = path.join(instancePath, relPath)
    const destDir  = path.dirname(destPath)

    try {
      await fs.promises.mkdir(destDir, { recursive: true })
      const data = await getData()
      if (data) await fs.promises.writeFile(destPath, data)
    } catch {}
  })

  const msg = skipped > 0
    ? `Import hoàn tất: ${name} (${skipped} mod bỏ qua — cần CurseForge API key)`
    : `Import hoàn tất: ${name}`
  onProgress?.({ phase: 'done', log: msg, percent: 100 })

  return { name, gameVersion, loader, loaderVersion, iconUrl, bgUrl: iconUrl }
}

module.exports = { importCurseForgePack }
