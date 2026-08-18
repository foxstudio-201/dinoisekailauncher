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

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const crypto = require('crypto')

const AdmZip = require('adm-zip')

const { downloadFile } = require('./dataSync.cjs')

const CF_API_BASE = 'https://api.curseforge.com/v1'
const CF_PROXY_BASE = 'https://api.curse.tools/v1/cf'
const CF_MOD_ID = 1354886
const CF_GAME_VERSION = '1.20.1'
const CF_USER_AGENT = 'Dino-Isekai-Launcher/0.2.20'

let BUILTIN_KEY = ''
try { BUILTIN_KEY = require('../build-env.cjs').CF_API_KEY || '' } catch {}
const CF_API_KEY = process.env.CF_API_KEY || BUILTIN_KEY || ''

function packVersionFilePath(instancePath) {
  return path.join(instancePath, '.cfpack-version')
}

function apiFetch(urlPath, retries = 6) {
  return new Promise((resolve, reject) => {
    if (!CF_API_KEY) {
      return reject(new Error('Thiếu CurseForge API key — vào https://console.curseforge.com/ tạo key rồi điền vào build-env.cjs (CF_API_KEY)'))
    }
    const req = https.get(CF_API_BASE + urlPath, {
      headers: {
        'x-api-key': CF_API_KEY,
        Accept: 'application/json',
        'User-Agent': CF_USER_AGENT,
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return apiFetch(res.headers.location, retries).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const j = JSON.parse(data)
            return resolve(j.data)
          } catch (e) { return reject(e) }
        }
        if ((res.statusCode === 403 || res.statusCode === 429 || res.statusCode >= 500) && retries > 0) {
          const delay = Math.min(10000, 1000 * Math.pow(2, 6 - retries))
          setTimeout(() => apiFetch(urlPath, retries - 1).then(resolve).catch(reject), delay)
          return
        }
        const hint = res.statusCode === 403
          ? ' — CurseForge đang tạm thời chặn (giới hạn tần suất hoặc sự cố CloudFront), chờ 1-2 phút rồi thử lại'
          : ''
        reject(new Error(`CurseForge API HTTP ${res.statusCode} (${urlPath})${hint}`))
      })
    })
    req.on('error', reject)
  })
}

function httpGetFollow(url, headers = {}, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (u, left) => {
      const client = u.startsWith('https') ? https : http
      const req = client.get(u, { headers: { 'User-Agent': CF_USER_AGENT, ...headers } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return attempt(new URL(res.headers.location, u).toString(), left)
        }
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => {
          if (res.statusCode === 200) return resolve(data)
          if ((res.statusCode === 403 || res.statusCode === 429 || res.statusCode >= 500) && left > 0) {
            setTimeout(() => attempt(u, left - 1), 1000 * Math.pow(2, 3 - left))
            return
          }
          reject(new Error(`HTTP ${res.statusCode}: ${u}`))
        })
      })
      req.on('error', () => {
        if (left > 0) setTimeout(() => attempt(u, left - 1), 1000)
        else reject(new Error(`Request failed: ${u}`))
      })
    }
    attempt(url, retries)
  })
}

async function proxyFetch(urlPath) {
  const data = await httpGetFollow(CF_PROXY_BASE + urlPath, {}, 3)
  return JSON.parse(data).data
}

async function apiFetchEither(urlPath) {
  try { return await proxyFetch(urlPath) } catch {}
  if (CF_API_KEY) {
    try { return await apiFetch(urlPath) } catch {}
  }
  throw new Error(`CurseForge API HTTP — proxy và API chính đều lỗi (${urlPath})`)
}

async function getLatestPackFile() {
  const files = await apiFetchEither(`/mods/${CF_MOD_ID}/files?gameVersion=${encodeURIComponent(CF_GAME_VERSION)}&pageSize=1&sortField=dateCreated&sortOrder=desc`)
  const f = files?.[0]
  if (!f) throw new Error('Không tìm thấy file modpack mới nhất trên CurseForge')
  return { fileId: f.id, fileName: f.fileName, fileDate: f.fileDate }
}

async function getDownloadUrl(modId, fileId, retries = 6) {
  const urlPath = `/mods/${modId}/files/${fileId}/download-url`
  try { return await proxyFetch(urlPath) } catch {}
  if (CF_API_KEY) {
    try { return await apiFetch(urlPath, retries) } catch {}
  }
  throw new Error(`Không lấy được link tải file ${fileId} (proxy và API chính đều lỗi)`)
}

function httpHead(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': CF_USER_AGENT } }, (res) => {
      res.resume()
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpHead(res.headers.location, retries))
      }
      const len = parseInt(res.headers['content-length'] || '0', 10) || 0
      if (len === 0 && retries > 0) {
        setTimeout(() => httpHead(url, retries - 1).then(resolve).catch(reject), 500)
        return
      }
      resolve(len)
    })
    req.on('error', reject)
    req.end()
  })
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let idx = 0
  async function worker() {
    while (true) {
      const i = idx++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

function packCacheDir(instancePath, fileId) {
  const hash = crypto.createHash('sha1').update(String(fileId)).digest('hex').slice(0, 16)
  return path.join(instancePath, '.dinosync-cache', 'cfpack-' + hash)
}

async function readPackManifest(zipPath) {
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()
  const manifestEntry = entries.find(e => !e.isDirectory && (e.entryName === 'manifest.json' || e.entryName === '.minecraft/manifest.json'))
  if (!manifestEntry) throw new Error('File modpack không có manifest.json')
  let manifest
  try { manifest = JSON.parse(zip.readAsText(manifestEntry, 'utf8')) } catch (e) { throw new Error(`manifest.json không đọc được: ${e.message}`) }
  const files = Array.isArray(manifest.files) ? manifest.files.filter(f => f && f.required !== false) : []
  const overridesDir = manifest.overrides || 'overrides'
  const hasOverrides = entries.some(e => !e.isDirectory && e.entryName.startsWith(overridesDir + '/'))
  const rootEntry = manifestEntry.entryName.split('/')[0] === 'manifest.json' ? null : '.minecraft'
  return { manifest, files, overridesDir, hasOverrides, rootEntry }
}

function extractOverrides(zipPath, overridesDir, destDir, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(zipPath)
      const entries = zip.getEntries().filter(e => !e.isDirectory && e.entryName.startsWith(overridesDir + '/'))
      const total = entries.length
      let i = 0
      onProgress?.({ percent: 0 })
      const run = () => {
        let n = 0
        while (i < total && n < 80) {
          const entry = entries[i]
          const rel = entry.entryName.slice(overridesDir.length + 1)
          const dest = path.join(destDir, rel)
          try {
            zip.extractEntryTo(entry, path.dirname(dest), false, true)
          } catch (e) {
            return reject(new Error(`Lỗi giải nén ${entry.entryName}: ${e.message}`))
          }
          i++
          n++
        }
        onProgress?.({ percent: total ? Math.round((i / total) * 100) : 100 })
        if (i >= total) return resolve(destDir)
        setImmediate(run)
      }
      run()
    } catch (e) { reject(e) }
  })
}

async function checkCfPack(profile) {
  if (!profile?.instancePath) return { ok: false, error: 'no_instance' }
  try {
    const latest = await getLatestPackFile()
    const local = fs.existsSync(packVersionFilePath(profile.instancePath))
      ? fs.readFileSync(packVersionFilePath(profile.instancePath), 'utf8').trim()
      : null
    const localId = parseInt(local, 10) || 0
    return {
      ok: true,
      installed: !!local,
      hasUpdate: localId !== latest.fileId,
      local: local || null,
      latest: latest.fileName,
      fileId: latest.fileId,
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

async function runCfPackInstall(profile, onProgress) {
  const instancePath = profile?.instancePath
  if (!instancePath) throw new Error('Profile không có instancePath')
  const { startOp, endOp, isAborted, getSignal, getAction } = require('./abortControl.cjs')
  startOp('cfpack')
  const abortedErr = Object.assign(new Error('aborted'), { aborted: true })
  function checkAbort() { if (isAborted('cfpack')) throw abortedErr }

  let cacheDir = null
  let synced = false
  try {
    onProgress({ phase: 'check', item: 'Kiểm tra cập nhật', percent: 0, log: 'Đang kiểm tra modpack trên CurseForge...' })
    const latest = await getLatestPackFile()
    const packUrl = await getDownloadUrl(CF_MOD_ID, latest.fileId)
    onProgress({ phase: 'check', item: 'Kiểm tra cập nhật', percent: 100, log: `Có bản modpack mới: ${latest.fileName}` })
    checkAbort()

    cacheDir = packCacheDir(instancePath, latest.fileId)
    fs.mkdirSync(cacheDir, { recursive: true })
    const zipPath = path.join(cacheDir, 'modpack.zip')

    onProgress({ phase: 'download', item: 'Tải modpack', percent: 0, log: 'Đang tải file modpack...' })
    await downloadFile(packUrl, zipPath, (p) => {
      const pc = p.total ? Math.round((p.downloaded / p.total) * 100) : 0
      onProgress({ phase: 'download', item: 'Tải modpack', percent: pc, downloaded: p.downloaded, total: p.total, speed: p.speed })
    }, getSignal('cfpack'))
    checkAbort()
    onProgress({ phase: 'download', item: 'Tải modpack', percent: 100, log: 'Đã tải xong modpack' })

    const { files, overridesDir, hasOverrides } = await readPackManifest(zipPath)
    if (!files.length) throw new Error('Modpack không có mod nào trong manifest.json')

    const modsDir = path.join(instancePath, 'mods')
    fs.rmSync(modsDir, { recursive: true, force: true })
    fs.mkdirSync(modsDir, { recursive: true })

    onProgress({ phase: 'mods', item: 'Tải mods', percent: 0, log: `Đang lấy link tải ${files.length} mod...` })
    const urls = await mapLimit(files, 6, async (f) => {
      try {
        const url = await getDownloadUrl(f.projectID, f.fileID, 3)
        const size = await httpHead(url)
        return { file: f, url, size }
      } catch {
        return { file: f, url: null, size: 0 }
      }
    })
    const okMods = urls.filter(u => u.url)
    if (!okMods.length) throw new Error('Không lấy được link tải mod nào từ CurseForge (API đang chặn tạm thời, thử lại sau 1-2 phút)')
    if (okMods.length < files.length) {
      const skipped = files.length - okMods.length
      if (skipped > files.length * 0.3) {
        throw new Error(`Không lấy được link tải cho ${skipped}/${files.length} mod — CurseForge đang chặn tạm thời, thử lại sau 1-2 phút`)
      }
      onProgress({ phase: 'mods', item: 'Tải mods', percent: 0, log: `Bỏ qua ${skipped} mod không lấy được link (sẽ không gây lỗi)` })
    }
    checkAbort()

    const totalBytes = okMods.reduce((s, u) => s + u.size, 0)
    let doneBytes = 0
    let doneCount = 0
    const fileBytes = new Map()
    const emitMods = () => {
      const pc = totalBytes ? Math.round((doneBytes / totalBytes) * 100) : (doneCount / okMods.length) * 100
      onProgress({
        phase: 'mods', item: 'Tải mods', percent: Math.max(0, Math.min(100, pc)),
        downloaded: doneBytes, total: totalBytes,
        done: doneCount, totalFiles: okMods.length,
        log: `Đang tải mods (${doneCount}/${okMods.length})...`,
      })
    }
    onProgress({ phase: 'mods', item: 'Tải mods', percent: 0, log: `Đang tải ${okMods.length} mods...` })
    await mapLimit(okMods, 4, async (u) => {
      checkAbort()
      const dest = path.join(modsDir, u.file.fileName || `mod-${u.file.fileID}.jar`)
      await downloadFile(u.url, dest, (p) => {
        const prev = fileBytes.get(u.url) || 0
        if (p.downloaded > prev) {
          fileBytes.set(u.url, p.downloaded)
          doneBytes += p.downloaded - prev
        }
        emitMods()
      }, getSignal('cfpack'))
      const last = fileBytes.get(u.url) || 0
      if (u.size > last) {
        fileBytes.set(u.url, u.size)
        doneBytes += u.size - last
      }
      doneCount++
      emitMods()
    })
    onProgress({ phase: 'mods', item: 'Tải mods', percent: 100, log: `Đã tải xong ${okMods.length} mods` })
    checkAbort()

    if (hasOverrides) {
      onProgress({ phase: 'extract', item: 'Cài đặt dữ liệu', percent: 0, log: 'Đang cài dữ liệu modpack...' })
      await extractOverrides(zipPath, overridesDir, instancePath, (p) => {
        onProgress({ phase: 'extract', item: 'Cài đặt dữ liệu', percent: p.percent, log: 'Đang cài dữ liệu modpack...' })
      })
      onProgress({ phase: 'extract', item: 'Cài đặt dữ liệu', percent: 100, log: 'Đã cài xong dữ liệu modpack' })
    } else {
      onProgress({ phase: 'extract', item: 'Cài đặt dữ liệu', percent: 100, log: 'Modpack không có thư mục dữ liệu' })
    }
    checkAbort()

    fs.writeFileSync(packVersionFilePath(instancePath), String(latest.fileId), 'utf8')
    synced = true
    onProgress({ phase: 'done', item: 'Hoàn tất', percent: 100, log: `Đã cài modpack ${latest.fileName}` })
    return { ok: true, version: latest.fileName, fileId: latest.fileId, modsCount: okMods.length }
  } catch (err) {
    if (err?.aborted) {
      const action = getAction('cfpack')
      if (action === 'cancel') {
        onProgress({ phase: 'cancelled', item: 'Đã hủy', percent: 0, log: 'Đã hủy tải modpack.' })
        return { ok: false, cancelled: true }
      }
      onProgress({ phase: 'paused', item: 'Tạm dừng', percent: 0, log: 'Đã tạm dừng tải modpack.' })
      return { ok: false, paused: true }
    }
    throw err
  } finally {
    endOp('cfpack')
    if (cacheDir && synced) {
      try { fs.rmSync(cacheDir, { recursive: true, force: true }) } catch {}
    }
  }
}

module.exports = { checkCfPack, runCfPackInstall, getLatestPackFile }