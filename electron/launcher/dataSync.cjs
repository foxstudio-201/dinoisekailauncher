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
const BASE_REPO = 'foxstudio-201/dinostatedata'
const BASE_TAG = 'v1.0'
let BUILTIN_TOKEN = ''
try { BUILTIN_TOKEN = require('./build-env.cjs').GITHUB_TOKEN || '' } catch {}
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || BUILTIN_TOKEN || ''

function versionFilePath(instancePath) {
  return path.join(instancePath, '.dinosync-version')
}
function baseVersionFilePath(instancePath) {
  return path.join(instancePath, '.dinobase-version')
}

// Đọc update.txt: các dòng dạng "delete:file1.jar, text.toml, thư mục"
// và "skip: options.txt, shaderpacks, resourcepacks" (không xóa, không ghi đè)
function parseUpdateTxt(content) {
  const res = { delete: [], skip: [] }
  for (const line of String(content || '').split(/\r?\n/)) {
    const m = line.trim().match(/^(delete|skip|ignore)\s*[:=]\s*(.+)$/i)
    if (m) {
      const key = /^delete$/i.test(m[1]) ? 'delete' : 'skip'
      m[2].split(',').forEach(n => {
        const t = n.trim()
        if (t) res[key].push(t)
      })
    }
  }
  return res
}

// Kiểm tra tên/path có nằm trong danh sách bỏ qua (skip) không
function isSkipped(name, skipNames) {
  if (!skipNames || !skipNames.length) return false
  const n = String(name).replace(/\\/g, '/')
  return skipNames.some(s => {
    const t = String(s).trim().replace(/\\/g, '/')
    if (!t) return false
    if (n === t || n.startsWith(t + '/')) return true
    return n.split('/').includes(t)
  })
}

// Xóa file/thư mục theo tên trong baseDir (quét đệ quy tìm đúng tên)
// skipNames: các mục nằm trong danh sách bỏ qua sẽ KHÔNG bị xóa
function deleteByName(baseDir, names, skipNames = []) {
  let deleted = 0
  for (const raw of names) {
    const n = String(raw).trim()
    if (!n || isSkipped(n, skipNames)) continue
    // Nếu là đường dẫn tương đối (có / hoặc \) → xóa trực tiếp
    if (n.includes('/') || n.includes('\\')) {
      const rel = n.replace(/\\/g, '/')
      const p = path.join(baseDir, rel)
      if (fs.existsSync(p)) {
        try { fs.rmSync(p, { recursive: true, force: true }); deleted++ } catch {}
      }
      continue
    }
    // Quét đệ quy tìm đúng tên file/thư mục
    ;(function walk(dir) {
      let entries = []
      try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
      for (const ent of entries) {
        const p = path.join(dir, ent.name)
        if (ent.name === n) {
          if (!isSkipped(ent.name, skipNames)) {
            try { fs.rmSync(p, { recursive: true, force: true }); deleted++ } catch {}
          }
        } else if (ent.isDirectory()) {
          if (isSkipped(ent.name, skipNames)) continue
          walk(p)
        }
      }
    })(baseDir)
  }
  return deleted
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
      let lastBytes = 0
      let lastTime = Date.now()
      let speed = 0
      const ws = fs.createWriteStream(destPath)
      res.on('data', chunk => {
        downloaded += chunk.length
        const now = Date.now()
        const dt = (now - lastTime) / 1000
        if (dt >= 0.3) {
          const inst = (downloaded - lastBytes) / dt
          if (inst >= 0 && inst < 1e9) speed = speed === 0 ? inst : (speed * 0.65 + inst * 0.35)
          lastBytes = downloaded
          lastTime = now
        }
        onProgress?.({ downloaded, total, speed: Math.round(speed) })
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

// ── Tải nhanh: chia file thành nhiều luồng song song (Range) ──────────────
// 2 chế độ từ cài đặt launcher:
//   'auto'   → tự động: file >= 8MB chia Multi-Connections luồng, file nhỏ tải 1 luồng (mặc định)
//   'single' → luôn tải 1 luồng (ổn định, phù hợp mạng yếu / bị chặn Range)
let DOWNLOAD_MODE = 'auto'
function setDownloadMode(mode) {
  DOWNLOAD_MODE = mode === 'single' ? 'single' : 'auto'
}
const MULTI_CONNECTIONS = parseInt(process.env.DINO_DL_CONNECTIONS || '6', 10)
const MULTI_THRESHOLD = 8 * 1024 * 1024 // file >= 8MB mới tải nhiều luồng

// Lấy tổng dung lượng + URL cuối (theo redirect), qua HEAD
function resolveHead(url, signal) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'Dino-Isekai-Launcher', Accept: 'application/octet-stream' }
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`
    const opts = { method: 'HEAD', headers }
    if (signal) opts.signal = signal
    const req = https.request(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return resolveHead(res.headers.location, signal).then(resolve).catch(reject)
      }
      const total = parseInt(res.headers['content-length'] || '0', 10)
      res.resume()
      resolve({ total, url })
    })
    req.on('error', reject)
    req.end()
  })
}

// Tải một phần [start..end] theo Range, lưu vào partPath (append nếu đã có dữ liệu để resume)
function downloadRange(url, start, end, partPath, onBytes, signal) {
  return new Promise((resolve, reject) => {
    const need = end - start + 1
    let existing = fs.existsSync(partPath) ? fs.statSync(partPath).size : 0
    // Part bị phình (server trả toàn bộ file thay vì Range) → cắt bớt về đúng độ dài cần
    if (existing > need) {
      try {
        fs.truncateSync(partPath, need)
        existing = need
      } catch {}
    }
    const from = start + existing
    if (from > end) { resolve(partPath); return } // phần đã đủ
    const headers = {
      'User-Agent': 'Dino-Isekai-Launcher',
      Accept: 'application/octet-stream',
      Range: `bytes=${from}-${end}`,
    }
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`
    const opts = { headers }
    if (signal) opts.signal = signal
    const req = https.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return downloadRange(res.headers.location, from, end, partPath, onBytes, signal).then(resolve).catch(reject)
      }
      if (res.statusCode !== 206 && res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)) }
      const ws = fs.createWriteStream(partPath, { flags: 'a' })
      res.on('data', c => onBytes?.(c.length))
      res.pipe(ws)
      ws.on('finish', () => {
        // Kết nối bị ngắt sớm làm part cụt (server gửi ít hơn range) → báo lỗi để retry/resume
        const got = fs.existsSync(partPath) ? fs.statSync(partPath).size : 0
        const needHere = end - start + 1
        if (got - start < needHere) {
          return reject(new Error(`Kết nối bị ngắt khi tải (${got - start}/${needHere} bytes) — sẽ tải tiếp`))
        }
        resolve(partPath)
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

// Ghép các phần lại thành file hoàn chỉnh
async function concatParts(destPath, partFiles, total) {
  const ws = fs.createWriteStream(destPath)
  try {
    for (const p of partFiles) {
      await new Promise((res, rej) => {
        const rs = fs.createReadStream(p)
        rs.on('error', rej)
        ws.on('error', rej)
        rs.pipe(ws, { end: false })
        rs.on('end', res)
      })
    }
    await new Promise((res, rej) => {
      ws.end()
      ws.on('finish', res)
      ws.on('error', rej)
    })
    // Windows: metadata chưa flush kịp → kiểm tra lại nhiều lần trước khi kết luận
    for (let tries = 0; tries < 40; tries++) {
      const size = fs.statSync(destPath).size
      if (size === total) {
        partFiles.forEach(p => { try { fs.unlinkSync(p) } catch {} })
        return destPath
      }
      if (size > total) break // part bị thừa (server trả 200 thay vì 206) → coi như lỗi
      await new Promise(r => setTimeout(r, 100))
    }
    const size = fs.statSync(destPath).size
    // Giữ part lại để lần sau resume; xóa file ghép dở
    try { fs.unlinkSync(destPath) } catch {}
    throw new Error(`File ghép không đầy đủ (${size}/${total} bytes) — sẽ tự tải lại`)
  } catch (e) {
    try { ws.destroy() } catch {}
    throw e
  }
}

// Tải file — tự chọn multi-thread nếu file lớn, ngược lại tải 1 luồng
async function downloadFileSmartInner(url, destPath, onProgress, signal) {
  let head
  try {
    head = await resolveHead(url, signal)
  } catch (err) {
    if (err?.aborted) throw err
    return downloadFile(url, destPath, onProgress, signal)
  }
  const total = head?.total || 0
  // Nếu file đã tải ĐỦ (size === total) → bỏ qua tải, dọn part cũ thừa
  if (total > 0 && fs.existsSync(destPath) && fs.statSync(destPath).size === total) {
    const base = path.basename(destPath)
    const dir = path.dirname(destPath)
    const leftovers = fs.readdirSync(dir).filter(f => f.startsWith(base + '.part'))
    leftovers.forEach(f => { try { fs.unlinkSync(path.join(dir, f)) } catch {} })
    return destPath
  }
  if (total < MULTI_THRESHOLD || total <= 0) {
    return downloadFile(url, destPath, onProgress, signal)
  }
  // Chế độ 1 luồng (settings) → tải tuần tự nhưng vẫn có resume
  if (DOWNLOAD_MODE === 'single') {
    return downloadFile(url, destPath, onProgress, signal)
  }

  const parts = Math.min(MULTI_CONNECTIONS, Math.ceil(total / MULTI_THRESHOLD))
  const size = Math.floor(total / parts)
  let done = 0
  let aborted = false
  const partFiles = []
  const abortErr = Object.assign(new Error('aborted'), { aborted: true })
  const abortHandler = () => { aborted = true }

  // downloaded khởi đầu = tổng dung lượng các part đã tải (resume)
  let downloaded = 0
  for (let i = 0; i < parts; i++) {
    const partPath = destPath + `.part${i}`
    partFiles.push(partPath)
    if (fs.existsSync(partPath)) downloaded += fs.statSync(partPath).size
  }

  // Đo tốc độ thật (byte/giây) bằng trung bình trượt giữa các lần cập nhật
  let lastBytes = downloaded
  let lastTime = Date.now()
  let speed = 0
  const speedSmoothing = 0.35
  const onChunk = (b) => {
    downloaded += b
    const now = Date.now()
    const dt = (now - lastTime) / 1000
    if (dt >= 0.3) {
      const inst = (downloaded - lastBytes) / dt
      if (inst >= 0 && inst < 1e9) speed = speed === 0 ? inst : (speed * (1 - speedSmoothing) + inst * speedSmoothing)
      lastBytes = downloaded
      lastTime = now
    }
    onProgress?.({ downloaded, total, speed: Math.round(speed) })
  }

  return new Promise((resolve, reject) => {
    if (signal) {
      if (signal.aborted) return reject(abortErr)
      signal.addEventListener('abort', abortHandler)
    }
    const finishIfDone = () => {
      if (done === parts && !aborted) {
        if (signal) signal.removeEventListener('abort', abortHandler)
        concatParts(destPath, partFiles, total).then(resolve).catch(reject)
      }
    }
    for (let i = 0; i < parts; i++) {
      const start = i * size
      const end = (i === parts - 1) ? total - 1 : start + size - 1
      const partPath = destPath + `.part${i}`
      const existing = fs.existsSync(partPath) ? fs.statSync(partPath).size : 0
      // Part đã tải đủ → bỏ qua
      if (existing >= (end - start + 1)) { done++; finishIfDone(); continue }
      downloadRange(url, start, end, partPath, onChunk, signal).then(() => {
        done++
        finishIfDone()
      }).catch((err) => {
        if (signal) signal.removeEventListener('abort', abortHandler)
        reject(err?.aborted ? abortErr : err)
      })
    }
  })
}

// Tải file — multi-thread + resume, KHÔNG tự hủy/tải lại khi tốc độ chậm
function downloadFileSmart(url, destPath, onProgress, signal) {
  return downloadFileSmartInner(url, destPath, onProgress, signal)
}

function runTool(tool, args) {
  return new Promise((resolve, reject) => {
    const { execFile } = require('child_process')
    execFile(tool, args, { stdio: 'ignore' }, (err) => err ? reject(err) : resolve())
  })
}

// Tải file và CHẮC CHẮN file tồn tại trước khi quay lại (tránh lỗi AdmZip "Invalid filename"
// khi file bị xóa/biến mất giữa bước tải và giải nén — trên Windows hay gặp vì %TEMP%/AV).
// Nếu tải lỗi/thiếu → xóa sạch part hỏng rồi tự tải lại từ đầu 1 lần.
async function ensureDownloaded(url, destPath, onProgress, signal) {
  const dir = path.dirname(destPath)
  const lastErr = new Error('Không tải được file dữ liệu — vui lòng thử lại')
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await downloadFileSmart(url, destPath, onProgress, signal)
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) return destPath
      lastErr.message = 'File dữ liệu không tồn tại sau khi tải — vui lòng thử lại'
    } catch (err) {
      console.error(`[dinosync] Tải thất bại (lần ${attempt}/2): ${err.message}`)
      lastErr = err
    }
    // Dọn sạch file/part hỏng để lần sau KHÔNG resume phải dữ liệu lỗi
    try {
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f))
      }
    } catch {}
    onProgress?.({ downloaded: 0, total: 0, speed: 0 })
  }
  throw lastErr
}

async function extractZip(zipPath, destDir, onProgress) {
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Không tìm thấy file dữ liệu đã tải: ${zipPath} — sẽ tự tải lại`)
  }
  const isRar = /\.rar$/i.test(zipPath)
  const isWin = process.platform === 'win32'
  // Ưu tiên tool hệ thống — nhanh, chạy ngoài process nên không đóng băng cửa sổ
  const candidates = isRar
    ? (isWin
        ? [
            { tool: 'tar',    args: ['-xf', zipPath, '-C', destDir] },
            { tool: 'bsdtar', args: ['-xf', zipPath, '-C', destDir] },
            { tool: '7z',     args: ['x', '-y', `-o${destDir}`, zipPath] },
          ]
        : [
            { tool: 'unrar',  args: ['x', '-y', zipPath, destDir + '/'] },
            { tool: 'bsdtar', args: ['-xf', zipPath, '-C', destDir] },
            { tool: '7z',     args: ['x', '-y', `-o${destDir}`, zipPath] },
            { tool: 'unzip',  args: ['-o', zipPath, '-d', destDir] },
          ])
    : (isWin
        ? [
            { tool: 'tar',    args: ['-xf', zipPath, '-C', destDir] },  // Windows 10+ có sẵn tar (libarchive)
            { tool: 'bsdtar', args: ['-xf', zipPath, '-C', destDir] },
            { tool: '7z',     args: ['x', '-y', `-o${destDir}`, zipPath] },
          ]
        : [
            { tool: 'unzip',  args: ['-o', zipPath, '-d', destDir] },
            { tool: 'bsdtar', args: ['-xf', zipPath, '-C', destDir] },
            { tool: '7z',     args: ['x', '-y', `-o${destDir}`, zipPath] },
          ])
  onProgress?.({ percent: 0 })
  for (const c of candidates) {
    try {
      await runTool(c.tool, c.args)
      onProgress?.({ percent: 100 })
      return destDir
    } catch (err) {
      console.error(`[dinosync] ${c.tool} thất bại: ${err.message}`)
    }
  }
  // Fallback: AdmZip giải nén theo batch — nhường event loop, không treo cửa sổ
  onProgress?.({ percent: 0 })
  return new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(zipPath)
      const entries = zip.getEntries()
      const total = entries.length
      let i = 0
      const BATCH = 60
      const run = () => {
        let n = 0
        while (i < total && n < BATCH) {
          const entry = entries[i]
          try {
            zip.extractEntryTo(entry, destDir, true, true)
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

// Bước "async data profile": (cập nhật) đọc update.txt xóa file theo tên → so trùng → ghi đè/copy mới
// update.txt có 2 loại dòng: delete (xóa file cũ) và skip (không xóa + không ghi đè — giữ file người dùng)
async function syncProfile(instancePath, extractedDir, onProgress, opts = {}) {
  // 1. Đọc update.txt (nếu có) → xóa các file/thư mục được liệt kê (trừ mục trong skip)
  const applyUpdateTxt = opts.applyUpdateTxt !== false
  let deletedCount = 0
  let skipNames = []
  if (applyUpdateTxt) {
    const txtPath = path.join(extractedDir, 'update.txt')
    if (fs.existsSync(txtPath)) {
      const parsed = parseUpdateTxt(fs.readFileSync(txtPath, 'utf8'))
      skipNames = parsed.skip
      deletedCount = deleteByName(instancePath, parsed.delete, parsed.skip)
    }
  }

  // 2. Copy data mới vào profile
  const all = []
  ;(function walk(dir, rel) {
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const ent of entries) {
      if (ent.name === '.git') continue
      const p = path.join(dir, ent.name)
      const r = rel ? `${rel}/${ent.name}` : ent.name
      // Bỏ qua: không ghi đè/copy các file/thư mục nằm trong danh sách skip
      if (isSkipped(r, skipNames)) continue
      if (ent.isDirectory()) walk(p, r)
      else all.push({ src: p, rel: r })
    }
  })(extractedDir, '')

  const total = all.length
  let done = 0
  const skippedFiles = []
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
          // Vẫn lỗi (vd. EPERM) → bỏ qua file này, ghi nhận để báo modal
          skippedFiles.push({ file: f.rel, error: err2.code || err2.message })
          console.error(`[dinosync] Bỏ qua file (${err2.code || err2.message}): ${f.rel}`)
        }
      }
    }
    done++
    onProgress?.({ done, total, file: f.rel })
  }
  if (skippedFiles.length) console.warn(`[dinosync] Đã bỏ qua ${skippedFiles.length}/${total} file bị lỗi quyền.`)
  return { skippedFiles, deletedCount }
}

function dlCacheDir(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16)
  return path.join(os.tmpdir(), 'dinosync-cache', hash)
}

// Xóa thư mục an toàn: Windows giữ file vừa ghi (ghi đệm/AV quét) → retry vài lần,
// vẫn lỗi thì bỏ qua (rác temp không đáng để làm hỏng kết quả sync đã thành công)
async function safeRm(dir) {
  if (!dir) return
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
      return
    } catch (err) {
      if (attempt === 4) {
        console.error(`[dinosync] Không dọn được ${dir}: ${err.message}`)
        return
      }
      await new Promise(r => setTimeout(r, 400))
    }
  }
}

async function runDataSync(profile, onProgress) {
  const instancePath = profile?.instancePath
  if (!instancePath) throw new Error('Profile không có instancePath')
  const { startOp, endOp, isAborted, getSignal, getAction } = require('./abortControl.cjs')
  startOp('dSync')

  const abortedErr = Object.assign(new Error('aborted'), { aborted: true })
  function checkAbort() { if (isAborted('dSync')) throw abortedErr }

  let dlDir = null
  let extractDir = null
  let synced = false
  try {
    // 1. Kiểm tra cập nhật
    onProgress({ phase: 'check', item: 'Kiểm tra cập nhật', percent: 0, log: 'Đang kiểm tra phiên bản dữ liệu mới...' })
    const release = await getLatestRelease()
    const assetExt = path.extname(release.asset.name) || '.zip'
    // Thư mục cache ổn định theo URL → giữ part files để resume khi pause/cancel
    dlDir = dlCacheDir(release.asset.browser_download_url)
    fs.mkdirSync(dlDir, { recursive: true })
    const zipPath = path.join(dlDir, 'data' + assetExt)
    const local = fs.existsSync(versionFilePath(instancePath))
      ? fs.readFileSync(versionFilePath(instancePath), 'utf8').trim()
      : null

    if (local === release.version) {
      onProgress({ phase: 'done', item: 'Đã cập nhật', percent: 100, log: `Dữ liệu đã mới nhất (${release.version})` })
      return { ok: true, skipped: true, version: release.version }
    }
    onProgress({ phase: 'check', item: 'Kiểm tra cập nhật', percent: 100, log: `Có bản dữ liệu mới: ${release.version}` })
    checkAbort()

    // 2. Tải về (tải tiếp nếu có part từ lần trước)
    onProgress({ phase: 'download', item: 'Tải dữ liệu', percent: 0, log: 'Đang tải dữ liệu...' })
    await ensureDownloaded(release.asset.browser_download_url, zipPath, (p) => {
      const pc = p.total ? Math.round((p.downloaded / p.total) * 100) : 0
      onProgress({ phase: 'download', item: 'Tải dữ liệu', percent: pc, downloaded: p.downloaded, total: p.total, speed: p.speed })
    }, getSignal('dSync'))
    checkAbort()

    // 3. Giải nén (thư mục tạm riêng)
    extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dinosync-ext-'))
    onProgress({ phase: 'extract', item: 'Giải nén', percent: 0, log: 'Đang giải nén... Xin vui lòng chờ' })
    await extractZip(zipPath, extractDir, (p) => onProgress({ phase: 'extract', item: 'Giải nén', percent: p.percent, log: 'Đang giải nén... Xin vui lòng chờ' }))
    const root = findRoot(extractDir)
    onProgress({ phase: 'extract', item: 'Giải nén', percent: 100, log: 'Đã giải nén' })
    checkAbort()

    // 4. Đồng bộ vào profile (đọc update.txt để xóa file cũ theo tên, rồi copy mới)
    onProgress({ phase: 'sync', item: 'Đồng bộ dữ liệu', percent: 0, log: 'Đang đồng bộ dữ liệu vào profile...' })
    const { skippedFiles, deletedCount } = await syncProfile(instancePath, root, (p) => {
      const pc = p.total ? Math.round((p.done / p.total) * 100) : 0
      onProgress({ phase: 'sync', item: 'Đồng bộ dữ liệu', percent: pc, done: p.done, total: p.total, file: p.file })
    }, { applyUpdateTxt: true })
    checkAbort()

    fs.writeFileSync(versionFilePath(instancePath), release.version, 'utf8')
    synced = true
    onProgress({ phase: 'done', item: 'Hoàn tất', percent: 100, log: `Đã cập nhật dữ liệu ${release.version}` })
    return { ok: true, version: release.version, skippedFiles, deletedCount }
  } catch (err) {
    if (err?.aborted) {
      const action = getAction('dSync')
      if (action === 'cancel') {
        onProgress({ phase: 'cancelled', item: 'Đã hủy', percent: 0, log: 'Đã hủy tải.' })
        return { ok: false, cancelled: true }
      }
      onProgress({ phase: 'paused', item: 'Tạm dừng', percent: 0, log: 'Đã tạm dừng tải. Bấm Play để tiếp tục.' })
      return { ok: false, paused: true }
    }
    throw err
  } finally {
    endOp('dSync')
    // Xóa extractDir (luôn); giữ dlDir (part files) nếu chưa hoàn tất để resume lần sau
    await safeRm(extractDir)
    // Chỉ dọn dlDir khi lần chạy này đã đồng bộ xong (không dọn khi lỗi/pause → còn phần để resume)
    if (dlDir && synced) await safeRm(dlDir)
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

// ── Dữ liệu gốc (dinostatedata) — tự động cập nhật theo phiên bản ──────────
// Giống data update: lấy TAG mới nhất, so với .dinobase-version trong instance,
// nếu khác → tải zip mới, giải nén, đọc update.txt (delete + skip) rồi đồng bộ.
async function getBaseRelease() {
  const tags = await httpGetJson(`https://api.github.com/repos/${BASE_REPO}/tags?per_page=1`)
  const tag = tags?.[0]?.name
  if (!tag) throw new Error('Không tìm thấy tag nào (data gốc)')

  let release = null
  try {
    release = await httpGetJson(`https://api.github.com/repos/${BASE_REPO}/releases/tags/${encodeURIComponent(tag)}`)
  } catch {}
  const asset = (release?.assets || []).find(a => /\.(zip|rar)$/i.test(a.name))
  if (!asset) throw new Error('Không tìm thấy file data gốc (.zip/.rar) trong release của tag này')

  return { version: tag, name: release?.name || tag, asset }
}

async function runBaseDataSync(profile, onProgress) {
  const instancePath = profile?.instancePath
  if (!instancePath) throw new Error('Profile không có instancePath')
  const { startOp, endOp, isAborted, getSignal, getAction } = require('./abortControl.cjs')
  startOp('dSync')
  const abortedErr = Object.assign(new Error('aborted'), { aborted: true })
  function checkAbort() { if (isAborted('dSync')) throw abortedErr }

  let dlDir = null
  let extractDir = null
  let synced = false
  try {
    onProgress({ phase: 'check', item: 'Dữ liệu gốc', percent: 0, log: 'Đang kiểm tra phiên bản dữ liệu gốc...' })
    const base = await getBaseRelease()
    const assetExt = path.extname(base.asset.name) || '.zip'
    dlDir = dlCacheDir(base.asset.browser_download_url)
    fs.mkdirSync(dlDir, { recursive: true })
    const zipPath = path.join(dlDir, 'base' + assetExt)
    const local = fs.existsSync(baseVersionFilePath(instancePath))
      ? fs.readFileSync(baseVersionFilePath(instancePath), 'utf8').trim()
      : null

    if (local === base.version) {
      onProgress({ phase: 'done', item: 'Dữ liệu gốc', percent: 100, log: `Dữ liệu gốc đã mới nhất (${base.version})` })
      return { ok: true, skipped: true, version: base.version }
    }
    onProgress({ phase: 'check', item: 'Dữ liệu gốc', percent: 100, log: `${local ? `Có bản dữ liệu gốc mới: ${base.version}` : 'Đang cài dữ liệu gốc lần đầu...'}` })
    checkAbort()

    onProgress({ phase: 'download', item: 'Dữ liệu gốc', percent: 0, log: 'Đang tải dữ liệu gốc...' })
    await ensureDownloaded(base.asset.browser_download_url, zipPath, (p) => {
      const pc = p.total ? Math.round((p.downloaded / p.total) * 100) : 0
      onProgress({ phase: 'download', item: 'Dữ liệu gốc', percent: pc, downloaded: p.downloaded, total: p.total, speed: p.speed })
    }, getSignal('dSync'))
    checkAbort()

    extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dinobase-ext-'))
    onProgress({ phase: 'extract', item: 'Dữ liệu gốc', percent: 0, log: 'Đang giải nén... Xin vui lòng chờ' })
    await extractZip(zipPath, extractDir, (p) => onProgress({ phase: 'extract', item: 'Dữ liệu gốc', percent: p.percent, log: 'Đang giải nén... Xin vui lòng chờ' }))
    const root = findRoot(extractDir)
    onProgress({ phase: 'extract', item: 'Dữ liệu gốc', percent: 100, log: 'Đã giải nén' })
    checkAbort()

    // Đồng bộ: đọc update.txt (delete để xóa file cũ đúng danh sách + skip để giữ cấu hình người dùng)
    onProgress({ phase: 'sync', item: 'Dữ liệu gốc', percent: 0, log: 'Đang đồng bộ dữ liệu gốc...' })
    const { skippedFiles, deletedCount } = await syncProfile(instancePath, root, (p) => {
      const pc = p.total ? Math.round((p.done / p.total) * 100) : 0
      onProgress({ phase: 'sync', item: 'Dữ liệu gốc', percent: pc, done: p.done, total: p.total, file: p.file })
    }, { applyUpdateTxt: true })
    checkAbort()

    fs.writeFileSync(baseVersionFilePath(instancePath), base.version, 'utf8')
    synced = true
    onProgress({ phase: 'done', item: 'Hoàn tất', percent: 100, log: `Đã cập nhật dữ liệu gốc ${base.version}` })
    return { ok: true, version: base.version, skippedFiles, deletedCount }
  } catch (err) {
    if (err?.aborted) {
      const action = getAction('dSync')
      if (action === 'cancel') {
        onProgress({ phase: 'cancelled', item: 'Đã hủy', percent: 0, log: 'Đã hủy tải dữ liệu gốc.' })
        return { ok: false, cancelled: true }
      }
      onProgress({ phase: 'paused', item: 'Tạm dừng', percent: 0, log: 'Đã tạm dừng tải dữ liệu gốc.' })
      return { ok: false, paused: true }
    }
    throw err
  } finally {
    endOp('dSync')
    await safeRm(extractDir)
    // Chỉ dọn dlDir khi lần chạy này đã cập nhật xong (có marker base mới)
    if (dlDir && synced) await safeRm(dlDir)
  }
}

async function checkBaseData(profile) {
  if (!profile?.instancePath) return { ok: false, error: 'no_instance' }
  try {
    const base = await getBaseRelease()
    const local = fs.existsSync(baseVersionFilePath(profile.instancePath))
      ? fs.readFileSync(baseVersionFilePath(profile.instancePath), 'utf8').trim()
      : null
    return {
      ok: true,
      installed: !!local,
      hasUpdate: local !== base.version,
      local,
      latest: base.version,
      assetName: base.asset.name,
      assetSize: base.asset.size,
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

module.exports = { runDataSync, checkDataSync, runBaseDataSync, checkBaseData, setDownloadMode }
