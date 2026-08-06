/**
 * VoxelXMods — tải mod client từ API voxelxclient.vercel.app
 * Đặt mod vào <instancePath>/libraries/net/fabricmc/voxelx/<version>/
 * Fabric Loader nhận mod qua JVM arg: -Dfabric.addMods=<path1>;<path2>
 */

'use strict'

const https = require('https')
const http  = require('http')
const fs    = require('fs')
const path  = require('path')

const API_BASE = process.env.VXC_API_BASE ? `${process.env.VXC_API_BASE}/api/mods` : ''

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, {
      headers: { 'User-Agent': 'DinoIsekai/1.0' },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGetJson(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')) })
  })
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client  = url.startsWith('https') ? https : http
    const dir     = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const tmpPath = destPath + '.tmp'

    client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
      }
      const out = fs.createWriteStream(tmpPath)
      res.pipe(out)
      out.on('finish', () => {
        try { fs.renameSync(tmpPath, destPath) } catch {
          fs.copyFileSync(tmpPath, destPath)
          try { fs.unlinkSync(tmpPath) } catch {}
        }
        resolve()
      })
      out.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
      res.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
    }).on('error', reject)
  })
}

/**
 *
 * @param {string} gameVersion   
 * @param {string} instancePath  
 * @param {function} onProgress  
 * @returns {Promise<string[]>}  
 */
async function ensureVoxelXMods(gameVersion, instancePath, onProgress) {
  if (!process.env.VXC_API_BASE) return []

  const vxcLibDir = path.join(instancePath, 'libraries', 'net', 'fabricmc', 'voxelx', gameVersion)
  if (!fs.existsSync(vxcLibDir)) fs.mkdirSync(vxcLibDir, { recursive: true })

  let mods = []
  try {
    const url = `${API_BASE}?category=skin&gameVersion=${encodeURIComponent(gameVersion)}`
    const data = await httpsGetJson(url)
    mods = data?.mods || []
  } catch (err) {
    onProgress?.({ log: `[VoxelXMods] Không thể lấy danh sách mod: ${err.message}`, done: 0, total: 0 })
    return []
  }

  if (mods.length === 0) {
    onProgress?.({ log: `[VoxelXMods] Không có mod nào cho ${gameVersion}`, done: 0, total: 0 })
    return []
  }

  const expectedFiles = new Set(mods.map(m => m.file_name || `${m.name}-${m.mod_version}.jar`))

  try {
    for (const f of fs.readdirSync(vxcLibDir)) {
      if (f.endsWith('.jar') && !expectedFiles.has(f)) {
        fs.unlinkSync(path.join(vxcLibDir, f))
        onProgress?.({ log: `[VoxelXMods] Đã xóa mod cũ: ${f}`, done: 0, total: mods.length })
      }
    }
  } catch {}

  const jarPaths = []
  let done = 0
  const total = mods.length

  for (const mod of mods) {
    done++
    const fileName = mod.file_name || `${mod.name}-${mod.mod_version}.jar`
    const destPath = path.join(vxcLibDir, fileName)
    jarPaths.push(destPath)

    if (fs.existsSync(destPath)) {
      onProgress?.({ log: `[VoxelXMods] Đã có: ${mod.name} v${mod.mod_version}`, done, total })
      continue
    }

    const url = mod.download_url || mod.blob_url || mod.drive_url
    if (!url) {
      onProgress?.({ log: `[VoxelXMods] Bỏ qua (không có URL): ${mod.name}`, done, total })
      continue
    }

    onProgress?.({ log: `[VoxelXMods] Tải ${mod.name} v${mod.mod_version}...`, done, total })
    try {
      await downloadFile(url, destPath)
      onProgress?.({ log: `[VoxelXMods] Đã tải: ${mod.name} v${mod.mod_version}`, done, total })
    } catch (err) {
      onProgress?.({ log: `[VoxelXMods] Lỗi tải ${mod.name}: ${err.message}`, done, total })
      try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath) } catch {}
      jarPaths.pop()
    }
  }

  onProgress?.({ log: `[VoxelXMods] Hoàn tất ${done}/${total} cho ${gameVersion}`, done: total, total })

  return jarPaths.filter(p => fs.existsSync(p))
}

module.exports = { ensureVoxelXMods }
