'use strict'

const fs = require('fs')
const path = require('path')
const https = require('https')
const crypto = require('crypto')
const os = require('os')
const AdmZip = require('adm-zip')

// ── Cấu hình: tránh rate-limit bằng token GitHub nhúng sẵn lúc build ─────────
// GitHub API cho phép 60 req/h (ẩn danh) — có token: 5.000 req/h.
// Token được workflow (GH_TOKEN secret) nhúng vào electron/build-env.cjs lúc build;
// người dùng không cần nhập gì. Build local không có token → chạy ẩn danh.
const DEFAULT_REPO = 'foxstudio-201/datadinoisekaiserver'
const REPO = (process.env.GITHUB_DATA_REPO || DEFAULT_REPO).replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '')
let BUILTIN_TOKEN = ''
try { BUILTIN_TOKEN = require('./build-env.cjs').GITHUB_TOKEN || '' } catch {}
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || BUILTIN_TOKEN || ''

const DELETE_DIRS = ['mods', 'config', 'kubejs', 'resourcepacks', 'shaderpacks']

function versionFilePath(instancePath) {
  return path.join(instancePath, '.dinosync-version')
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'Dino-Isekai-Launcher', Accept: 'application/vnd.github+json' }
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`
    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return httpGetJson(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
  })
}

async function getLatestRelease() {
  // Lấy TAG mới nhất trước (repo chỉ dùng tag — không có release "latest")
  const tags = await httpGetJson(`https://api.github.com/repos/${REPO}/tags?per_page=1`)
  const tag = tags?.[0]?.name
  if (!tag) throw new Error('Không tìm thấy tag nào')

  // Lấy release theo tag để có asset (.zip); nếu không có release thì báo lỗi tải
  let release = null
  try {
    release = await httpGetJson(`https://api.github.com/repos/${REPO}/releases/tags/${encodeURIComponent(tag)}`)
  } catch {}
  const asset = (release?.assets || []).find(a => /\.(zip|rar)$/i.test(a.name))
  if (!asset) throw new Error('Không tìm thấy file dữ liệu (.zip/.rar) trong release của tag này')

  return { version: tag, name: release?.name || tag, asset }
}

function downloadFile(url, destPath, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'Dino-Isekai-Launcher', Accept: 'application/octet-stream' }
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`
    const opts = { headers }
    if (signal) opts.signal = signal
    const req = https.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return downloadFile(res.headers.location, destPath, onProgress, signal).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)) }
      const total = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0
      const ws = fs.createWriteStream(destPath)
      res.on('data', chunk => {
        downloaded += chunk.length
        onProgress?.({ downloaded, total })
      })
      res.pipe(ws)
      ws.on('finish', () => {
        // Kiểm tra file tải đầy đủ (tránh file cụt gây lỗi EOF khi giải nén)
        if (total > 0 && downloaded !== total) {
          return reject(new Error(`File tải không đầy đủ (${downloaded}/${total} bytes) — vui lòng thử lại`))
        }
        resolve(destPath)
      })
      ws.on('error', reject)
      res.on('error', (err) => {
        if (err.name === 'AbortError') { reject(Object.assign(new Error('aborted'), { aborted: true })); return }
        reject(err)
      })
    })
    req.on('error', (err) => {
      if (err.name === 'AbortError') { reject(Object.assign(new Error('aborted'), { aborted: true })); return }
      reject(err)
    })
  })
}

function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    // .rar → dùng tool ngoài; .zip → AdmZip
    if (/\.rar$/i.test(zipPath)) {
      const { execFile } = require('child_process')
      // Thử lần lượt các tool có thể có
      const candidates = process.platform === 'win32'
        ? [
            { tool: 'tar',   args: ['-xf', zipPath, '-C', destDir] },
            { tool: 'bsdtar', args: ['-xf', zipPath, '-C', destDir] },
            { tool: '7z',    args: ['x', '-y', `-o${destDir}`, zipPath] },
          ]
        : [
            { tool: 'unrar', args: ['x', '-y', zipPath, destDir + '/'] },
            { tool: 'bsdtar', args: ['-xf', zipPath, '-C', destDir] },
            { tool: '7z',    args: ['x', '-y', `-o${destDir}`, zipPath] },
          ]
      ;(function tryNext(i) {
        if (i >= candidates.length) return reject(new Error('Không tìm thấy công cụ giải nén .rar (unrar/tar/7z)'))
        const { tool, args } = candidates[i]
        execFile(tool, args, { stdio: 'ignore' }, (err) => {
          if (err) {
            console.error(`[dinosync] ${tool} thất bại: ${err.message}`)
            return tryNext(i + 1)
          }
          resolve(destDir)
        })
      })(0)
      return
    }
    try {
      const zip = new AdmZip(zipPath)
      zip.extractAllTo(destDir, true)
      resolve(destDir)
    } catch (e) { reject(e) }
  })
}

function findRoot(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const dirs = entries.filter(e => e.isDirectory())
  const files = entries.filter(e => e.isFile())
  if (files.length === 0 && dirs.length === 1) return path.join(dir, dirs[0].name)
  return dir
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256')
    const s = fs.createReadStream(file)
    s.on('data', d => h.update(d))
    s.on('end', () => resolve(h.digest('hex')))
    s.on('error', reject)
  })
}

async function filesSame(a, b) {
  try {
    const sa = fs.statSync(a)
    const sb = fs.statSync(b)
    if (sa.size !== sb.size) return false
    return (await sha256(a)) === (await sha256(b))
  } catch { return false }
}

// Bước "async data profile": xóa các thư mục cũ → so trùng → ghi đè/copy mới
async function syncProfile(instancePath, extractedDir, onProgress) {
  for (const dir of DELETE_DIRS) {
    fs.rmSync(path.join(instancePath, dir), { recursive: true, force: true })
  }

  const all = []
  ;(function walk(dir, rel) {
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const ent of entries) {
      if (ent.name === '.git') continue
      const p = path.join(dir, ent.name)
      const r = rel ? `${rel}/${ent.name}` : ent.name
      if (ent.isDirectory()) walk(p, r)
      else all.push({ src: p, rel: r })
    }
  })(extractedDir, '')

  const total = all.length
  let done = 0
  let skipped = 0
  for (const f of all) {
    const dest = path.join(instancePath, f.rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    // File giống nhau → bỏ qua; khác nhau → ghi đè; chưa có → copy thẳng
    if (!fs.existsSync(dest) || !(await filesSame(f.src, dest))) {
      try {
        fs.copyFileSync(f.src, dest)
      } catch (err) {
        // Thử gỡ quyền read-only trên file nguồn rồi copy lại (file từ rar thường bị set read-only)
        try {
          fs.chmodSync(f.src, 0o666)
          fs.copyFileSync(f.src, dest)
        } catch (err2) {
          // Vẫn lỗi (vd. EPERM) → bỏ qua file này, tiếp tục phần còn lại
          skipped++
          console.error(`[dinosync] Bỏ qua file (${err2.code || err2.message}): ${f.rel}`)
        }
      }
    }
    done++
    onProgress?.({ done, total, file: f.rel })
  }
  if (skipped > 0) console.warn(`[dinosync] Đã bỏ qua ${skipped}/${total} file bị lỗi quyền.`)
}

async function runDataSync(profile, onProgress) {
  const instancePath = profile?.instancePath
  if (!instancePath) throw new Error('Profile không có instancePath')
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dinosync-'))
  const extractDir = path.join(tempDir, 'data')
  const { startOp, endOp, isAborted, getSignal } = require('./abortControl.cjs')
  startOp('dSync')

  const abortedErr = Object.assign(new Error('aborted'), { aborted: true })
  function checkAbort() { if (isAborted('dSync')) throw abortedErr }

  try {
    // 1. Kiểm tra cập nhật
    onProgress({ phase: 'check', item: 'Kiểm tra cập nhật', percent: 0, log: 'Đang kiểm tra phiên bản dữ liệu mới...' })
    const release = await getLatestRelease()
    // Tên file tạm phải giữ đúng phần mở rộng (.zip/.rar) để giải nén đúng tool
    const assetExt = path.extname(release.asset.name) || '.zip'
    const zipPath = path.join(tempDir, 'data' + assetExt)
    const local = fs.existsSync(versionFilePath(instancePath))
      ? fs.readFileSync(versionFilePath(instancePath), 'utf8').trim()
      : null

    if (local === release.version) {
      onProgress({ phase: 'done', item: 'Đã cập nhật', percent: 100, log: `Dữ liệu đã mới nhất (${release.version})` })
      return { ok: true, skipped: true, version: release.version }
    }
    onProgress({ phase: 'check', item: 'Kiểm tra cập nhật', percent: 100, log: `Có bản dữ liệu mới: ${release.version}` })
    checkAbort()

    // 2. Tải về temp
    onProgress({ phase: 'download', item: 'Tải dữ liệu', percent: 0, log: 'Đang tải dữ liệu...' })
    await downloadFile(release.asset.browser_download_url, zipPath, (p) => {
      const pc = p.total ? Math.round((p.downloaded / p.total) * 100) : 0
      onProgress({ phase: 'download', item: 'Tải dữ liệu', percent: pc, downloaded: p.downloaded, total: p.total })
    }, getSignal('dSync'))
    checkAbort()

    // 3. Giải nén
    onProgress({ phase: 'extract', item: 'Giải nén', percent: 0, log: 'Đang giải nén...' })
    fs.mkdirSync(extractDir, { recursive: true })
    await extractZip(zipPath, extractDir)
    const root = findRoot(extractDir)
    onProgress({ phase: 'extract', item: 'Giải nén', percent: 100, log: 'Đã giải nén' })
    checkAbort()

    // 4. Đồng bộ vào profile
    onProgress({ phase: 'sync', item: 'Đồng bộ dữ liệu', percent: 0, log: 'Đang đồng bộ dữ liệu vào profile...' })
    await syncProfile(instancePath, root, (p) => {
      const pc = p.total ? Math.round((p.done / p.total) * 100) : 0
      onProgress({ phase: 'sync', item: 'Đồng bộ dữ liệu', percent: pc, done: p.done, total: p.total, file: p.file })
    })
    checkAbort()

    fs.writeFileSync(versionFilePath(instancePath), release.version, 'utf8')
    onProgress({ phase: 'done', item: 'Hoàn tất', percent: 100, log: `Đã cập nhật dữ liệu ${release.version}` })
    return { ok: true, version: release.version }
  } catch (err) {
    if (err?.aborted) {
      onProgress({ phase: 'paused', item: 'Tạm dừng', percent: 0, log: 'Đã tạm dừng tải. Bấm Play để tiếp tục.' })
      return { ok: false, paused: true }
    }
    throw err
  } finally {
    endOp('dSync')
    // Tự động xóa file tải về để tránh đầy ổ đĩa
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

async function checkDataSync(profile) {
  if (!profile?.instancePath) return { ok: false, error: 'no_instance' }
  try {
    const release = await getLatestRelease()
    const local = fs.existsSync(versionFilePath(profile.instancePath))
      ? fs.readFileSync(versionFilePath(profile.instancePath), 'utf8').trim()
      : null
    return { ok: true, hasUpdate: local !== release.version, local, latest: release.version, assetName: release.asset.name, assetSize: release.asset.size }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

module.exports = { runDataSync, checkDataSync }
