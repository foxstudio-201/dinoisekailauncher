'use strict'

const fs = require('fs')
const path = require('path')
const https = require('https')
const crypto = require('crypto')

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

function httpHeadRedirect(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Dino-Isekai-Launcher' } }, (res) => {
      res.resume()
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(res.headers.location)
      }
      if (res.statusCode === 200 || res.statusCode === 404) return resolve(null)
      reject(new Error(`HTTP ${res.statusCode}`))
    })
    req.on('error', reject)
    req.end()
  })
}

function httpGetText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Dino-Isekai-Launcher' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return httpGetText(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
        resolve(data)
      })
    })
    req.on('error', reject)
  })
}

// Lấy release mới nhất KHÔNG qua GitHub API — tránh rate-limit 403 (60 req/h/IP ẩn danh).
// Dùng redirect của /releases/latest → tag, và trang expanded_assets → tên file .zip/.rar
async function getWebRelease(repo) {
  const latestUrl = `https://github.com/${repo}/releases/latest`
  let redirect = await httpHeadRedirect(latestUrl)
  if (!redirect) redirect = await httpHeadRedirect(latestUrl + '/') // vài trường hợp thiếu trailing slash
  const m = redirect?.match(/\/releases\/tag\/([^/?#]+)/)
  if (!m) throw new Error('Không tìm thấy release mới nhất')
  const tag = decodeURIComponent(m[1])
  const html = await httpGetText(`https://github.com/${repo}/releases/expanded_assets/${encodeURIComponent(tag)}`)
  // Trong trang HTML, mỗi asset có href="/owner/repo/releases/download/{tag}/{file}"
  const names = []
  const re = /releases\/download\/[^"'#?]+?\/([^"'#?]+)/g
  let mm
  while ((mm = re.exec(html)) !== null) {
    try { names.push(decodeURIComponent(mm[1])) } catch {}
  }
  const name = names.find(n => /\.(zip|rar)$/i.test(n))
  if (!name) throw new Error('Không tìm thấy file dữ liệu (.zip/.rar) trong release của tag này')
  return {
    version: tag,
    name,
    asset: {
      name,
      size: 0,
      browser_download_url: `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`,
    },
  }
}

async function getLatestRelease() {
  return getWebRelease(REPO)
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

// Tải file — 1 luồng duy nhất như bản 0.1.x (ổn định, không lỗi part/multi-thread)
function downloadFileSmart(url, destPath, onProgress, signal) {
  return downloadFile(url, destPath, onProgress, signal)
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
  let lastErr = new Error('Không tải được file dữ liệu — vui lòng thử lại')
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

// ── Giải nén TRỰC TIẾP vào thư mục đích (instance) ─────────────────────────────
// Không còn bước "giải nén vào thư mục tạm rồi copy sang" — trước đây hay lỗi trên
// Windows vì %TEMP% bị hệ thống/AV dọn giữa chừng (ENOENT) hoặc file đang khóa (EPERM).
// skipNames (từ update.txt): các entry này KHÔNG được ghi đè → chặn trong tool (--exclude/-x).

function readUpdateTxt(zipPath) {
  if (!/\.rar$/i.test(zipPath)) {
    try {
      const zip = new AdmZip(zipPath)
      const entry = zip.getEntries().find(e => !e.isDirectory && path.basename(e.entryName).toLowerCase() === 'update.txt')
      return entry ? zip.readAsText(entry, 'utf8') : null
    } catch (err) {
      console.error(`[dinosync] Không đọc được update.txt trong zip: ${err.message}`)
      return null
    }
  }
  // RAR: đọc qua 7z/unrar in ra stdout
  const { execFileSync } = require('child_process')
  for (const c of [
    { tool: '7z',     args: ['e', '-so', zipPath, 'update.txt'] },
    { tool: 'unrar',  args: ['p', '-inul', zipPath, 'update.txt'] },
  ]) {
    try {
      const out = execFileSync(c.tool, c.args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 })
      if (out && out.trim()) return out
    } catch {}
  }
  return null
}

// Zip có 1 thư mục gốc duy nhất (vd. update/...) → trả tên thư mục đó để dời nội dung lên sau giải nén
function detectZipRootDir(zipPath) {
  if (/\.rar$/i.test(zipPath)) return null
  try {
    const names = new AdmZip(zipPath).getEntries().map(e => e.entryName.replace(/\/+$/, ''))
    if (!names.length) return null
    const roots = new Set(names.map(n => n.split('/')[0]))
    if (roots.size === 1 && names.every(n => n.includes('/'))) return [...roots][0]
  } catch {}
  return null
}

// Dời nội dung của thư mục con (vừa giải nén trong instance) lên đúng chỗ — rename cùng ổ rất nhanh
async function moveContentsUp(base, sub) {
  const srcDir = path.join(base, sub)
  if (!fs.existsSync(srcDir)) return
  function moveOne(s, d) {
    try {
      const st = fs.statSync(s)
      if (st.isDirectory()) {
        if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
          for (const n of fs.readdirSync(s)) moveOne(path.join(s, n), path.join(d, n))
          fs.rmSync(s, { recursive: true, force: true })
        } else {
          if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true })
          fs.renameSync(s, d)
        }
      } else {
        if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true })
        fs.renameSync(s, d)
      }
    } catch (err) {
      console.error(`[dinosync] Dời ${s} → ${d}: ${err.message}`)
    }
  }
  for (const n of fs.readdirSync(srcDir)) moveOne(path.join(srcDir, n), path.join(base, n))
  try { fs.rmSync(srcDir, { recursive: true, force: true }) } catch {}
}

// Tham số loại trừ theo tool: skipNames không được ghi đè
function toolExcludes(tool, skipNames) {
  if (!skipNames || !skipNames.length) return []
  const patterns = []
  for (const raw of skipNames) {
    const s = String(raw).trim().replace(/\\/g, '/').replace(/\/+$/, '')
    if (!s) continue
    patterns.push(s, `*/${s}`, `${s}/*`, `*/${s}/*`)
  }
  const args = []
  for (const p of [...new Set(patterns)]) {
    if (tool === 'tar' || tool === 'bsdtar') args.push('--exclude=' + p)
    else if (tool === 'unzip') args.push('-x', p)
    else if (tool === '7z') args.push('-xr!' + p)
    else if (tool === 'unrar') args.push('-x' + p)
  }
  return args
}

async function extractZipDirectly(zipPath, destDir, opts = {}) {
  const { skipNames = [], rootDir = null, onProgress } = opts
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
      await runTool(c.tool, [...c.args, ...toolExcludes(c.tool, skipNames)])
      if (rootDir) await moveContentsUp(destDir, rootDir)
      onProgress?.({ percent: 100 })
      return destDir
    } catch (err) {
      console.error(`[dinosync] ${c.tool} thất bại: ${err.message}`)
    }
  }
  if (isRar) throw new Error('Không giải nén được file dữ liệu (thiếu 7z/unrar/bsdtar)')
  // Fallback cuối: AdmZip giải nén theo batch — nhường event loop, không treo cửa sổ;
  // bỏ qua các entry thuộc danh sách skip
  await new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(zipPath)
      const entries = zip.getEntries().filter(e => !e.isDirectory && !isSkipped(e.entryName, skipNames))
      const total = entries.length
      let i = 0
      onProgress?.({ percent: 0 })
      const run = () => {
        let n = 0
        while (i < total && n < 60) {
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
  if (rootDir) await moveContentsUp(destDir, rootDir)
  return destDir
}


// Cache tải nằm TRONG instance (không phải %TEMP% — trên Windows hay bị dọn/AV quét gây EPERM/ENOENT).
// Sau khi sync thành công sẽ xóa sạch; lỗi giữa chừng thì giữ zip để lần sau khỏi tải lại.
function dlCacheDir(instancePath, url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16)
  return path.join(instancePath, '.dinosync-cache', hash)
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
  let synced = false
  try {
    // 1. Kiểm tra cập nhật
    onProgress({ phase: 'check', item: 'Kiểm tra cập nhật', percent: 0, log: 'Đang kiểm tra phiên bản dữ liệu mới...' })
    const release = await getLatestRelease()
    const assetExt = path.extname(release.asset.name) || '.zip'
    // Thư mục cache ổn định theo URL → giữ part files để resume khi pause/cancel
    dlDir = dlCacheDir(instancePath, release.asset.browser_download_url)
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

    // 3. Đọc update.txt (trong zip) → xóa file cũ theo danh sách delete, giữ nguyên skip
    const utxt = readUpdateTxt(zipPath)
    const parsed = utxt ? parseUpdateTxt(utxt) : { delete: [], skip: [] }
    const deletedCount = parsed.delete.length ? deleteByName(instancePath, parsed.delete, parsed.skip) : 0
    const rootDir = detectZipRootDir(zipPath)

    // 4. Giải nén TRỰC TIẾP vào instance — không giải nén tạm rồi copy (tránh lỗi %TEMP%/EPERM trên Windows)
    onProgress({ phase: 'extract', item: 'Giải nén', percent: 0, log: 'Đang giải nén... Xin vui lòng chờ' })
    await extractZipDirectly(zipPath, instancePath, {
      skipNames: parsed.skip,
      rootDir,
      onProgress: (p) => onProgress({ phase: 'extract', item: 'Giải nén', percent: p.percent, log: 'Đang giải nén... Xin vui lòng chờ' }),
    })
    onProgress({ phase: 'extract', item: 'Giải nén', percent: 100, log: 'Đã giải nén' })
    checkAbort()

    fs.writeFileSync(versionFilePath(instancePath), release.version, 'utf8')
    synced = true
    onProgress({ phase: 'done', item: 'Hoàn tất', percent: 100, log: `Đã cập nhật dữ liệu ${release.version}` })
    return { ok: true, version: release.version, skippedFiles: [], deletedCount }
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
    // Giữ dlDir (zip + part) nếu chưa hoàn tất để resume lần sau; dọn khi sync xong
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
// Giống data update: lấy TAG mới nhất (không qua GitHub API — tránh 403 rate-limit),
// so với .dinobase-version trong instance, nếu khác → tải zip mới, giải nén,
// đọc update.txt (delete + skip) rồi đồng bộ.
async function getBaseRelease() {
  return getWebRelease(BASE_REPO)
}

async function runBaseDataSync(profile, onProgress) {
  const instancePath = profile?.instancePath
  if (!instancePath) throw new Error('Profile không có instancePath')
  const { startOp, endOp, isAborted, getSignal, getAction } = require('./abortControl.cjs')
  startOp('dSync')
  const abortedErr = Object.assign(new Error('aborted'), { aborted: true })
  function checkAbort() { if (isAborted('dSync')) throw abortedErr }

  let dlDir = null
  let synced = false
  try {
    onProgress({ phase: 'check', item: 'Dữ liệu gốc', percent: 0, log: 'Đang kiểm tra phiên bản dữ liệu gốc...' })
    const base = await getBaseRelease()
    const assetExt = path.extname(base.asset.name) || '.zip'
    dlDir = dlCacheDir(instancePath, base.asset.browser_download_url)
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

    // Đọc update.txt (trong zip) → xóa file cũ theo danh sách delete, giữ nguyên skip
    const utxt = readUpdateTxt(zipPath)
    const parsed = utxt ? parseUpdateTxt(utxt) : { delete: [], skip: [] }
    const deletedCount = parsed.delete.length ? deleteByName(instancePath, parsed.delete, parsed.skip) : 0
    const rootDir = detectZipRootDir(zipPath)

    // Giải nén TRỰC TIẾP vào instance — không giải nén tạm rồi copy (tránh lỗi %TEMP%/EPERM trên Windows)
    onProgress({ phase: 'extract', item: 'Dữ liệu gốc', percent: 0, log: 'Đang giải nén... Xin vui lòng chờ' })
    await extractZipDirectly(zipPath, instancePath, {
      skipNames: parsed.skip,
      rootDir,
      onProgress: (p) => onProgress({ phase: 'extract', item: 'Dữ liệu gốc', percent: p.percent, log: 'Đang giải nén... Xin vui lòng chờ' }),
    })
    onProgress({ phase: 'extract', item: 'Dữ liệu gốc', percent: 100, log: 'Đã giải nén' })
    checkAbort()

    fs.writeFileSync(baseVersionFilePath(instancePath), base.version, 'utf8')
    synced = true
    onProgress({ phase: 'done', item: 'Hoàn tất', percent: 100, log: `Đã cập nhật dữ liệu gốc ${base.version}` })
    return { ok: true, version: base.version, skippedFiles: [], deletedCount }
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
    // Giữ dlDir (zip + part) nếu chưa hoàn tất để resume lần sau; dọn khi sync xong
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

module.exports = { runDataSync, checkDataSync, runBaseDataSync, checkBaseData }
