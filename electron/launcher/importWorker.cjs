'use strict'
const https  = require('https')
const http   = require('http')
const fs     = require('fs')
const path   = require('path')
const zlib   = require('zlib')

process.on('message', async (msg) => {
  if (msg.type === 'start') {
    try {
      if (msg.source === 'curseforge') {
        await importCurseForgePack(msg.filePath, msg.instancePath, msg.apiKey)
      } else if (msg.source === 'modrinth') {
        await importModrinthPack(msg.filePath, msg.instancePath)
      }
      process.send({ type: 'done' })
    } catch (err) {
      process.send({ type: 'error', message: err.message })
    }
  }
})

function sendProgress(data) {
  if (process.send) process.send({ type: 'progress', data })
}

function inflateRawAsync(buf) {
  return new Promise((resolve, reject) => {
    zlib.inflateRaw(buf, (err, result) => {
      if (err) reject(err); else resolve(result)
    })
  })
}

function readZipEntry(buf, entryName) {
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
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath)
    fs.mkdirSync(dir, { recursive: true })
    const tmpPath = destPath + '.tmp'
    let settled = false
    function done(err) { if (settled) return; settled = true; if (err) reject(err); else resolve() }
    function doGet(reqUrl, redirectCount) {
      if (redirectCount > 10) return done(new Error('Too many redirects'))
      const client = reqUrl.startsWith('https') ? https : http
      client.get(reqUrl, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume(); return doGet(res.headers.location, redirectCount + 1)
        }
        if (res.statusCode !== 200) { res.resume(); return done(new Error(`HTTP ${res.statusCode}: ${reqUrl}`)) }
        const out = fs.createWriteStream(tmpPath)
        res.pipe(out)
        out.on('finish', () => { try { fs.renameSync(tmpPath, destPath) } catch { try { fs.copyFileSync(tmpPath, destPath); fs.unlinkSync(tmpPath) } catch {} }; done() })
        out.on('error', (err) => { try { fs.unlinkSync(tmpPath) } catch {}; done(err) })
        res.on('error', (err) => { try { fs.unlinkSync(tmpPath) } catch {}; done(err) })
      }).on('error', (err) => done(err))
    }
    doGet(url, 0)
  })
}

async function getCurseForgeDownloadUrl(projectId, fileId) {
  const CF_PROXY = 'https://api.curse.tools/v1/cf'
  try {
    const data = await httpsGetJson(`${CF_PROXY}/mods/${projectId}/files/${fileId}/download-url`)
    if (data?.data) return data.data
  } catch {}
  return null
}

function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0', ...headers }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return httpsGetJson(res.headers.location, headers).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) }
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function importCurseForgePack(zipPath, instancePath, apiKey) {
  sendProgress({ phase: 'read', log: 'Đọc file modpack...', percent: 2 })
  const buf = fs.readFileSync(zipPath)
  const manifestData = await readZipEntry(buf, 'manifest.json')
  if (!manifestData) throw new Error('manifest.json không tìm thấy trong file')
  const manifest = JSON.parse(manifestData.toString('utf8'))
  const mods  = manifest.files || []
  const total = mods.length
  const modsDir = path.join(instancePath, 'mods')
  fs.mkdirSync(modsDir, { recursive: true })

  sendProgress({ phase: 'mods', log: `Bắt đầu tải ${total} mods...`, done: 0, total, percent: 5 })

  let done = 0
  let skipped = 0
  for (const mod of mods) {
    done++
    const pct = 20 + Math.round((done / total) * 60)
    const url = await getCurseForgeDownloadUrl(mod.projectID, mod.fileID)
    if (!url) {
      skipped++
      sendProgress({ phase: 'mods', log: `[${done}/${total}] Bỏ qua projectID=${mod.projectID}`, done, total, percent: pct })
      continue
    }
    const fileName = url.split('/').pop().split('?')[0]
    const destPath = path.join(modsDir, decodeURIComponent(fileName))
    const exists = fs.existsSync(destPath)
    if (exists) {
      sendProgress({ phase: 'mods', log: `[${done}/${total}] Đã có: ${fileName}`, done, total, percent: pct })
      continue
    }
    sendProgress({ phase: 'mods', log: `[${done}/${total}] Đang tải: ${fileName}`, done, total, percent: pct })
    try { await downloadFile(url, destPath) } catch (err) { skipped++; sendProgress({ phase: 'mods', log: `[WARN] Lỗi tải ${fileName}: ${err.message}`, done, total, percent: pct }) }
  }

  sendProgress({ phase: 'overrides', log: 'Giải nén overrides...', percent: 85 })
  await iterZipEntries(buf, async (fileName, getData) => {
    if (!fileName.startsWith('overrides/') || fileName.endsWith('/')) return
    const relPath  = fileName.slice('overrides/'.length)
    const destPath = path.join(instancePath, relPath)
    const destDir  = path.dirname(destPath)
    try { fs.mkdirSync(destDir, { recursive: true }); const data = await getData(); if (data) fs.writeFileSync(destPath, data) } catch {}
  })

  const msg = skipped > 0 ? `Import hoàn tất: (${skipped} mod bỏ qua)` : 'Import hoàn tất'
  sendProgress({ phase: 'done', log: msg, percent: 100 })
  return { name: manifest.name, gameVersion: manifest.minecraft?.version || '' }
}

async function importModrinthPack(mrpackPath, instancePath) {
  sendProgress({ phase: 'read', log: 'Đọc file modpack...', percent: 2 })
  const buf = fs.readFileSync(mrpackPath)
  const indexData = await readZipEntry(buf, 'modrinth.index.json')
  if (!indexData) throw new Error('modrinth.index.json không tìm thấy trong file')
  const index = JSON.parse(indexData.toString('utf8'))
  const files = (index.files || []).filter(f => !f.env || f.env.client !== 'unsupported')
  const total = files.length

  sendProgress({ phase: 'mods', log: `Bắt đầu tải ${total} mods...`, done: 0, total, percent: 5 })
  let done = 0
  for (const file of files) {
    done++
    const destPath = path.join(instancePath, file.path)
    const pct = 5 + Math.round((done / total) * 75)
    const exists = fs.existsSync(destPath)
    if (exists) { sendProgress({ phase: 'mods', log: `[${done}/${total}] Đã có: ${path.basename(file.path)}`, done, total, percent: pct }); continue }
    const url = file.downloads?.[0]
    if (!url) { sendProgress({ phase: 'mods', log: `[${done}/${total}] Bỏ qua ${file.path}`, done, total, percent: pct }); continue }
    sendProgress({ phase: 'mods', log: `[${done}/${total}] Đang tải: ${path.basename(file.path)}`, done, total, percent: pct })
    try { await downloadFile(url, destPath) } catch (err) { sendProgress({ phase: 'mods', log: `[WARN] Lỗi tải ${path.basename(file.path)}: ${err.message}`, done, total, percent: pct }) }
  }

  sendProgress({ phase: 'overrides', log: 'Giải nén overrides...', percent: 83 })
  const prefixes = ['overrides/', 'client-overrides/']
  await iterZipEntries(buf, async (fileName, getData) => {
    const prefix = prefixes.find(p => fileName.startsWith(p))
    if (!prefix || fileName.endsWith('/')) return
    const relPath = fileName.slice(prefix.length)
    const destPath = path.join(instancePath, relPath)
    try { fs.mkdirSync(path.dirname(destPath), { recursive: true }); const data = await getData(); if (data) fs.writeFileSync(destPath, data) } catch {}
  })

  sendProgress({ phase: 'done', log: 'Import hoàn tất', percent: 100 })
  return { name: index.name, gameVersion: index.dependencies?.minecraft || '' }
}
