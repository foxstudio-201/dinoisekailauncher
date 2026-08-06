'use strict'

/**
 * VoxelX P2P LAN — WireGuard Manager
 *
 * Windows: wireguard.exe /installtunnelservice — cần admin
 *   → Nếu chưa có admin, tự relaunch với UAC prompt (ShellExecute runas)
 * Linux: wg-quick (cần sudo)
 */

const path      = require('path')
const fs        = require('fs')
const crypto    = require('crypto')
const { app, ipcMain } = require('electron')
const { spawnSync, execFileSync } = require('child_process')

const API_BASE         = process.env.VXC_WEB_BASE_URL || ''
const WG_PORT          = 51820
const PING_INTERVAL_MS = 10000

// ── Paths ─────────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(app.getPath('appData'), '.DinoIsekai')
const WG_DIR   = path.join(DATA_DIR, 'wireguard')
const WG_CONF  = path.join(WG_DIR,   'voxelx-lan.conf')
const WG_EXE   = path.join(WG_DIR,   'wireguard.exe')
const WG_TOOL  = path.join(WG_DIR,   'wg.exe')
const WINTUN   = path.join(WG_DIR,   'wintun.dll')

const WG_MSI_URL    = 'https://download.wireguard.com/windows-client/wireguard-amd64-0.5.3.msi'
const WINTUN_URL    = 'https://www.wintun.net/builds/wintun-0.14.1.zip'

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

// ── Check admin ───────────────────────────────────────────────────────────────
function isRunningAsAdmin() {
  if (process.platform !== 'win32') return true
  try {
    // net session chỉ thành công khi có admin
    execFileSync('net', ['session'], { windowsHide: true, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// Relaunch app với UAC elevation
function relaunchAsAdmin() {
  if (process.platform !== 'win32') return false
  const exePath = process.execPath
  const args = process.argv.slice(1)

  try {
    // Dùng spawnSync — sẽ BLOCK cho đến khi UAC được user xử lý (Yes hoặc No)
    // Nếu user bấm Yes → process mới chạy → spawnSync return → app cũ quit
    // Nếu user bấm No → spawnSync return → app cũ KHÔNG quit
    const argsStr = args.length > 0
      ? `-ArgumentList '${args.join("','")}'`
      : ''
    const result = spawnSync('powershell.exe', [
      '-NoProfile', '-Command',
      `Start-Process -FilePath '${exePath.replace(/'/g, "''")}' ${argsStr} -Verb RunAs -Wait:$false`,
    ], {
      windowsHide: true,
      timeout: 60000, // 60s timeout cho UAC
    })
    // Nếu PowerShell exit 0 → UAC passed, process mới đã chạy
    return result.status === 0
  } catch {
    return false
  }
}

// ── HTTPS helpers ─────────────────────────────────────────────────────────────
function httpsDownload(url, destPath, onProgress) {
  const https = require('https')
  const http  = require('http')
  return new Promise((resolve, reject) => {
    function doGet(u) {
      const client = u.startsWith('https') ? https : http
      client.get(u, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return doGet(res.headers.location)
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${u}`))
        const total = parseInt(res.headers['content-length'] || '0', 10)
        let done = 0
        const out = fs.createWriteStream(destPath)
        res.on('data', c => { done += c.length; if (onProgress && total) onProgress(Math.round(done/total*100)) })
        res.pipe(out)
        out.on('finish', resolve)
        out.on('error', reject)
        res.on('error', reject)
      }).on('error', reject)
    }
    doGet(url)
  })
}

function extractZip(zipPath, destDir) {
  ensureDir(destDir)
  const r = spawnSync('powershell', ['-Command',
    `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`
  ], { windowsHide: true, timeout: 30000 })
  if (r.status !== 0) throw new Error('Giải nén thất bại: ' + (r.stderr?.toString() || ''))
}

function extractMsi(msiPath, destDir) {
  ensureDir(destDir)
  const r = spawnSync('msiexec', ['/a', msiPath, '/qn', `TARGETDIR=${destDir}`],
    { windowsHide: true, timeout: 60000 })
  if (r.status !== 0 && r.status !== 3010)
    throw new Error(`msiexec lỗi (${r.status})`)
}

function findFile(dir, name) {
  if (!fs.existsSync(dir)) return null
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) { const f = findFile(full, name); if (f) return f }
    else if (e.name.toLowerCase() === name.toLowerCase()) return full
  }
  return null
}

// ── Ensure WireGuard binaries ─────────────────────────────────────────────────
async function ensureWgBinaries(logFn) {
  ensureDir(WG_DIR)
  if (process.platform !== 'win32') return // Linux dùng wg-quick hệ thống

  // Windows Defender exclusion (best-effort)
  try {
    spawnSync('powershell', ['-Command',
      `Add-MpPreference -ExclusionPath '${WG_DIR}' -ErrorAction SilentlyContinue`
    ], { windowsHide: true, timeout: 5000 })
  } catch {}

  // Tải wg.exe + wireguard.exe từ MSI
  if (!fs.existsSync(WG_TOOL) || !fs.existsSync(WG_EXE)) {
    logFn('Đang tải WireGuard...')
    const msiPath    = path.join(WG_DIR, 'wireguard-setup.msi')
    const extractDir = path.join(WG_DIR, 'msi-extract')
    try {
      await httpsDownload(WG_MSI_URL, msiPath, pct => logFn(`Tải WireGuard: ${pct}%`))
      logFn('Đang giải nén...')
      extractMsi(msiPath, extractDir)
      const wgFound  = findFile(extractDir, 'wg.exe')
      const wgeFound = findFile(extractDir, 'wireguard.exe')
      if (wgFound)  fs.copyFileSync(wgFound, WG_TOOL)
      if (wgeFound) fs.copyFileSync(wgeFound, WG_EXE)
      logFn('Đã có WireGuard tools')
    } finally {
      try { if (fs.existsSync(msiPath)) fs.unlinkSync(msiPath) } catch {}
      try { fs.rmSync(extractDir, { recursive: true, force: true }) } catch {}
    }
  }

  // Tải wintun.dll
  if (!fs.existsSync(WINTUN)) {
    logFn('Đang tải wintun.dll...')
    const zipPath    = path.join(WG_DIR, 'wintun.zip')
    const extractDir = path.join(WG_DIR, 'wintun-extract')
    try {
      await httpsDownload(WINTUN_URL, zipPath, pct => logFn(`Tải wintun: ${pct}%`))
      extractZip(zipPath, extractDir)
      const dll = findFile(extractDir, 'wintun.dll')
      if (dll) { fs.copyFileSync(dll, WINTUN); logFn('Đã có wintun.dll') }
      else throw new Error('Không tìm thấy wintun.dll')
    } finally {
      try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath) } catch {}
      try { fs.rmSync(extractDir, { recursive: true, force: true }) } catch {}
    }
  }

  if (!fs.existsSync(WG_TOOL))
    throw new Error('wg.exe không tồn tại. Có thể bị Windows Defender xóa. Thêm exclusion cho: ' + WG_DIR)
}

// ── Public IP detection ───────────────────────────────────────────────────────
// Dùng nhiều STUN-like endpoint để detect public IP, không cần STUN library
async function detectPublicIp() {
  const https = require('https')
  const endpoints = [
    'https://api.ipify.org',
    'https://api4.my-ip.io/ip',
    'https://ipv4.icanhazip.com',
  ]
  for (const url of endpoints) {
    try {
      const ip = await new Promise((resolve, reject) => {
        const u = new URL(url)
        const req = https.get({ hostname: u.hostname, path: u.pathname, timeout: 4000,
          headers: { 'User-Agent': 'DinoIsekai/1.0' }
        }, res => {
          let d = ''; res.on('data', c => { d += c })
          res.on('end', () => resolve(d.trim()))
        })
        req.on('error', reject)
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
      })
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip
    } catch {}
  }
  return null
}

function buildEndpoint(publicIp, virtualIp) {
  if (!publicIp) return null
  // Dùng port tương ứng với virtualIp
  const listenPort = WG_PORT + (Math.abs(hashStr(virtualIp || '10.77.0.1')) % 100)
  return `${publicIp}:${listenPort}`
}

// IP ảo theo index (mirror server)
function peerIp(index) {
  return `10.77.0.${index + 1}`
}


function generatePrivateKey() {
  const key = crypto.randomBytes(32)
  key[0]  &= 248; key[31] &= 127; key[31] |= 64
  return key.toString('base64')
}

function derivePublicKey(privB64) {
  const tool = process.platform === 'win32' ? WG_TOOL : 'wg'
  const r = spawnSync(tool, ['pubkey'], {
    input: privB64 + '\n', encoding: 'utf8', timeout: 5000,
    env: process.platform === 'win32'
      ? { ...process.env, PATH: WG_DIR + ';' + (process.env.PATH || '') }
      : process.env,
  })
  if (r.status === 0 && r.stdout?.trim()) return r.stdout.trim()
  throw new Error('Không thể tạo public key: ' + (r.stderr || ''))
}

// ── WireGuard config ──────────────────────────────────────────────────────────
function buildWgConf(virtualIp, privateKey, peers) {
  // Dùng port ngẫu nhiên trong range 51820-51920 để tránh conflict
  const listenPort = WG_PORT + (Math.abs(hashStr(virtualIp)) % 100)
  let conf = `[Interface]\nPrivateKey = ${privateKey}\nAddress = ${virtualIp}/24\nListenPort = ${listenPort}\n\n`
  for (const p of peers) {
    conf += `[Peer]\nPublicKey = ${p.publicKey}\nAllowedIPs = ${p.virtualIp}/32\nPersistentKeepalive = 15\n`
    if (p.endpoint) conf += `Endpoint = ${p.endpoint}\n`
    conf += '\n'
  }
  return conf
}

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0 }
  return h
}

async function applyWgConfig(virtualIp, privateKey, peers) {
  ensureDir(WG_DIR)
  fs.writeFileSync(WG_CONF, buildWgConf(virtualIp, privateKey, peers), { mode: 0o600 })

  if (process.platform === 'win32') {
    // wintun.dll PHẢI nằm cùng thư mục với wireguard.exe để được load tự động
    // Không dùng WINTUN_DLL env var vì wireguard.exe không đọc nó
    if (fs.existsSync(WINTUN) && !fs.existsSync(path.join(WG_DIR, 'wintun.dll'))) {
      try { fs.copyFileSync(WINTUN, path.join(WG_DIR, 'wintun.dll')) } catch {}
    }

    // Gỡ tunnel cũ nếu có, bỏ qua lỗi
    try {
      spawnSync(WG_EXE, ['/uninstalltunnelservice', 'voxelx-lan'], {
        windowsHide: true, timeout: 8000,
        env: { ...process.env, PATH: WG_DIR + ';' + (process.env.PATH || '') },
      })
      await new Promise(r => setTimeout(r, 1200))
    } catch {}

    const r = spawnSync(WG_EXE, ['/installtunnelservice', WG_CONF], {
      windowsHide: true, timeout: 20000,
      stdio: 'pipe',
      env: { ...process.env, PATH: WG_DIR + ';' + (process.env.PATH || '') },
    })

    if (r.status !== 0) {
      // Lấy thông tin lỗi đầy đủ: stderr + stdout + event log
      const stderr = r.stderr?.toString()?.trim() || ''
      const stdout = r.stdout?.toString()?.trim() || ''
      const combined = [stderr, stdout].filter(Boolean).join(' | ')

      // Thử đọc lỗi từ Windows Event Log
      let eventMsg = ''
      try {
        const evtResult = spawnSync('powershell', [
          '-NoProfile', '-Command',
          `Get-EventLog -LogName System -Source WireGuard -Newest 3 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Message`
        ], { windowsHide: true, timeout: 5000, encoding: 'utf8' })
        eventMsg = evtResult.stdout?.trim() || ''
      } catch {}

      let errMsg = `WireGuard tunnel lỗi (exit ${r.status})`
      if (combined) errMsg += `: ${combined}`
      if (eventMsg) errMsg += `\nEvent Log: ${eventMsg.slice(0, 300)}`

      // Gợi ý cụ thể theo từng loại lỗi
      if (/GetTokenInformation|token/i.test(combined + eventMsg)) {
        errMsg += '\n\n→ Lỗi quyền token. Thử: chạy app với quyền Admin đầy đủ, tắt Hyper-V hoặc WSL2 nếu đang bật.'
      } else if (/wintun|driver/i.test(combined + eventMsg)) {
        errMsg += '\n\n→ Lỗi Wintun driver. Windows Defender có thể đã chặn wintun.dll. Thêm exclusion cho: ' + WG_DIR
      } else if (/access.*denied|0x5\b/i.test(combined + eventMsg)) {
        errMsg += '\n\n→ Access denied. Cần chạy với quyền Administrator.'
      }

      throw new Error(errMsg)
    }
  } else {
    try { spawnSync('wg-quick', ['down', WG_CONF], { timeout: 5000, stdio: 'pipe' }) } catch {}
    const r = spawnSync('wg-quick', ['up', WG_CONF], { timeout: 15000, stdio: 'pipe' })
    if (r.status !== 0) {
      const msg = (r.stderr?.toString() || r.stdout?.toString() || '').trim()
      throw new Error('wg-quick lỗi: ' + (msg || r.status))
    }
  }
  log('WireGuard tunnel đã khởi động')

  // Sau khi tunnel up, report endpoint thực tế lên server
  if (_state.peerToken && _state.endpoint) {
    try {
      await apiPost('update-endpoint', { token: _state.peerToken, endpoint: _state.endpoint })
      log(`Đã report endpoint: ${_state.endpoint}`)
    } catch {}
  }
}

async function stopWg() {
  try {
    if (process.platform === 'win32') {
      spawnSync(WG_EXE, ['/uninstalltunnelservice', 'voxelx-lan'], {
        windowsHide: true, timeout: 5000,
        env: { ...process.env, PATH: WG_DIR + ';' + (process.env.PATH || '') },
      })
    } else {
      if (fs.existsSync(WG_CONF)) spawnSync('wg-quick', ['down', WG_CONF], { timeout: 5000 })
    }
  } catch {}
  try { if (fs.existsSync(WG_CONF)) fs.unlinkSync(WG_CONF) } catch {}
}

// ── API ───────────────────────────────────────────────────────────────────────
function apiPost(action, body) {
  if (!process.env.VXC_WEB_BASE_URL) return Promise.reject(new Error('API LAN không khả dụng'))
  const https   = require('https')
  const bodyStr = JSON.stringify(body)
  const url     = new URL(`${API_BASE}/api/lan-room?action=${action}`)
  return new Promise((resolve, reject) => {
    function doReq(host, p) {
      const req = https.request({
        hostname: host, port: 443, path: p, method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          'User-Agent': 'DinoIsekai/1.0',
        },
      }, res => {
        if ([301,302,307,308].includes(res.statusCode) && res.headers.location) {
          res.resume(); const loc = new URL(res.headers.location)
          return doReq(loc.hostname, loc.pathname + loc.search)
        }
        let d = ''
        res.on('data', c => { d += c })
        res.on('end', () => {
          try { resolve(JSON.parse(d)) }
          catch { reject(new Error(`HTTP ${res.statusCode}: ${d.slice(0,200)}`)) }
        })
      })
      req.on('error', reject)
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')) })
      req.write(bodyStr); req.end()
    }
    doReq(url.hostname, url.pathname + url.search)
  })
}

function apiGet(action, params = {}) {
  if (!process.env.VXC_WEB_BASE_URL) return Promise.reject(new Error('API LAN không khả dụng'))
  const https = require('https')
  const qs    = new URLSearchParams({ action, ...params }).toString()
  const url   = new URL(`${API_BASE}/api/lan-room?${qs}`)
  return new Promise((resolve, reject) => {
    function doGet(host, p) {
      https.get({ hostname: host, port: 443, path: p,
        headers: { 'User-Agent': 'DinoIsekai/1.0' }, timeout: 10000,
      }, res => {
        if ([301,302,307,308].includes(res.statusCode) && res.headers.location) {
          res.resume(); const loc = new URL(res.headers.location)
          return doGet(loc.hostname, loc.pathname + loc.search)
        }
        let d = ''
        res.on('data', c => { d += c })
        res.on('end', () => {
          try { resolve(JSON.parse(d)) }
          catch { reject(new Error(`HTTP ${res.statusCode}: ${d.slice(0,200)}`)) }
        })
      }).on('error', reject)
    }
    doGet(url.hostname, url.pathname + url.search)
  })
}

// ── State ─────────────────────────────────────────────────────────────────────
let _state = {
  active: false, role: null, roomCode: null,
  hostToken: null, peerToken: null, virtualIp: null,
  privateKey: null, publicKey: null, peers: [],
  pingTimer: null, onEvent: null,
}

function emit(event, data) {
  if (typeof _state.onEvent === 'function') _state.onEvent(event, data)
}
function log(msg) { emit('vxlan:log', { msg }) }

// ── Ping loop ─────────────────────────────────────────────────────────────────
function startPingLoop() {
  stopPingLoop()
  _state.pingTimer = setInterval(async () => {
    if (!_state.peerToken) return
    try {
      // Gửi ping kèm endpoint để server biết IP mới nhất (NAT có thể đổi)
      await apiPost('ping', { token: _state.peerToken, endpoint: _state.endpoint || null })
    } catch {}
    try {
      const r = await apiGet('peers', { roomCode: _state.roomCode, token: _state.peerToken })
      if (!r.ok) return

      const peersChanged = JSON.stringify(r.peers) !== JSON.stringify(_state.peers)
      if (peersChanged) {
        _state.peers = r.peers
        emit('vxlan:peers', { peers: r.peers })
        // Cập nhật WireGuard config với endpoint mới nhất của từng peer
        await applyWgConfig(_state.virtualIp, _state.privateKey, r.peers).catch(e =>
          log(`Cập nhật WireGuard lỗi: ${e.message}`)
        )
        log(`Cập nhật peers: ${r.peers.length} người`)
      }
    } catch {}
  }, PING_INTERVAL_MS)
}

function stopPingLoop() {
  if (_state.pingTimer) { clearInterval(_state.pingTimer); _state.pingTimer = null }
}

// ── Create / Join / Leave ─────────────────────────────────────────────────────
async function createRoom({ nickname }) {
  log('Kiểm tra WireGuard...')
  await ensureWgBinaries(log)

  const privateKey = generatePrivateKey()
  log('Đang tạo keypair...')
  const publicKey = derivePublicKey(privateKey)

  log('Đang lấy public IP...')
  const publicIp = await detectPublicIp().catch(() => null)
  if (publicIp) log(`Public IP: ${publicIp}`)
  else log('Không lấy được public IP, peer sẽ dùng direct connect')

  log('Đang tạo phòng...')
  const r = await apiPost('create', {
    publicKey, nickname: nickname || 'Host',
    endpoint: publicIp ? `${publicIp}:${WG_PORT}` : null,
  })
  if (!r.ok) throw new Error(r.error || 'Không thể tạo phòng')

  // Tính endpoint chính xác với virtualIp đã biết
  const endpoint = buildEndpoint(publicIp, r.virtualIp)
  if (endpoint) log(`Endpoint: ${endpoint}`)

  Object.assign(_state, {
    active: true, role: 'host',
    roomCode: r.roomCode, hostToken: r.hostToken, peerToken: r.peerToken,
    virtualIp: r.virtualIp, privateKey, publicKey, endpoint, peers: [],
  })

  log('Đang khởi động WireGuard tunnel...')
  await applyWgConfig(r.virtualIp, privateKey, [])
  startPingLoop()

  log(`Phòng: ${r.roomCode} | IP: ${r.virtualIp}`)
  emit('vxlan:created', { roomCode: r.roomCode, virtualIp: r.virtualIp })
  return r
}

async function joinRoom({ roomCode, nickname }) {
  log('Kiểm tra WireGuard...')
  await ensureWgBinaries(log)

  const privateKey = generatePrivateKey()
  log('Đang tạo keypair...')
  const publicKey = derivePublicKey(privateKey)

  log('Đang lấy public IP...')
  const publicIp = await detectPublicIp().catch(() => null)
  // endpoint sẽ được tính sau khi biết virtualIp từ server
  const tempEndpoint = publicIp ? `${publicIp}:${WG_PORT}` : null
  if (tempEndpoint) log(`Public IP: ${publicIp}`)
  else log('Không lấy được public IP')

  log(`Đang kết nối phòng ${roomCode}...`)
  const r = await apiPost('join', {
    roomCode: roomCode.toUpperCase(), publicKey, nickname: nickname || 'Player',
    endpoint: tempEndpoint,
  })
  if (!r.ok) throw new Error(r.error || 'Không thể join phòng')

  // Tính endpoint chính xác với virtualIp đã được cấp
  const endpoint = buildEndpoint(publicIp, r.virtualIp)

  Object.assign(_state, {
    active: true, role: 'peer',
    roomCode: roomCode.toUpperCase(), peerToken: r.peerToken,
    virtualIp: r.virtualIp, privateKey, publicKey, endpoint, peers: r.peers || [],
  })

  log('Đang khởi động WireGuard tunnel...')
  await applyWgConfig(r.virtualIp, privateKey, r.peers || [])

  // Poll nhanh 3 lần sau khi join để bắt endpoint mới nhất của host
  // (host có thể chưa report endpoint kịp trong lần join đầu)
  for (let i = 0; i < 3; i++) {
    await new Promise(res => setTimeout(res, 2000))
    try {
      const poll = await apiGet('peers', { roomCode: roomCode.toUpperCase(), token: r.peerToken })
      if (poll.ok && poll.peers?.length > 0) {
        const hasEndpoints = poll.peers.some(p => p.endpoint)
        if (hasEndpoints) {
          log('Đã nhận endpoint từ host, cập nhật tunnel...')
          _state.peers = poll.peers
          await applyWgConfig(r.virtualIp, privateKey, poll.peers).catch(() => {})
          emit('vxlan:peers', { peers: poll.peers })
          break
        }
      }
    } catch {}
  }

  startPingLoop()
  log(`Đã vào phòng | IP: ${r.virtualIp}`)
  emit('vxlan:joined', { roomCode: roomCode.toUpperCase(), virtualIp: r.virtualIp, peers: _state.peers })
  return r
}

async function leaveRoom() {
  stopPingLoop()
  if (_state.hostToken) {
    try { await apiPost('close', { hostToken: _state.hostToken }) } catch {}
  }
  await stopWg()
  Object.assign(_state, {
    active: false, role: null, roomCode: null,
    hostToken: null, peerToken: null, virtualIp: null,
    privateKey: null, publicKey: null, peers: [],
  })
  emit('vxlan:left', {})
  log('Đã rời phòng')
}

function getState() {
  return {
    active: _state.active, role: _state.role,
    roomCode: _state.roomCode, virtualIp: _state.virtualIp,
    peers: _state.peers,
  }
}

function checkWgReady() {
  if (process.platform !== 'win32') {
    return spawnSync('which', ['wg-quick'], { encoding: 'utf8', timeout: 2000 }).status === 0
  }
  return fs.existsSync(WG_TOOL) && fs.existsSync(WG_EXE) && fs.existsSync(WINTUN)
}

// ── IPC ───────────────────────────────────────────────────────────────────────
function registerVxLanHandlers(getTrustedWindow) {

  ipcMain.handle('vxlan:check', e => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    return {
      installed: checkWgReady(),
      isAdmin: isRunningAsAdmin(),
      state: getState(),
    }
  })

  // Khi bấm tạo/join phòng: kiểm tra admin trước
  // Nếu chưa admin → trả về { needAdmin: true } để UI hiện thông báo
  // Sau khi user đồng ý → gọi vxlan:relaunchAsAdmin để relaunch

  ipcMain.handle('vxlan:create', async (e, { nickname } = {}) => {
    const win = getTrustedWindow(e)
    if (!win) return { error: 'Unauthorized' }

    if (process.platform === 'win32' && !isRunningAsAdmin()) {
      return { needAdmin: true }
    }

    _state.onEvent = (ev, d) => { if (!win.isDestroyed()) win.webContents.send(ev, d) }
    try { return { ok: true, ...(await createRoom({ nickname })) }
    } catch (err) { return { error: err.message } }
  })

  ipcMain.handle('vxlan:join', async (e, { roomCode, nickname } = {}) => {
    const win = getTrustedWindow(e)
    if (!win) return { error: 'Unauthorized' }

    if (process.platform === 'win32' && !isRunningAsAdmin()) {
      return { needAdmin: true }
    }

    _state.onEvent = (ev, d) => { if (!win.isDestroyed()) win.webContents.send(ev, d) }
    try { return { ok: true, ...(await joinRoom({ roomCode, nickname })) }
    } catch (err) { return { error: err.message } }
  })

  ipcMain.handle('vxlan:relaunchAsAdmin', async (e) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const ok = relaunchAsAdmin()
    if (ok) {
      // Process mới đã chạy với admin → quit app cũ
      setTimeout(() => {
        app.isQuitting = true
        app.quit()
      }, 500)
    }
    return { ok }
  })

  ipcMain.handle('vxlan:leave', async e => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    try { await leaveRoom(); return { ok: true } }
    catch (err) { return { error: err.message } }
  })

  ipcMain.handle('vxlan:state', e => {
    if (!getTrustedWindow(e)) return null
    return getState()
  })
}

module.exports = { registerVxLanHandlers, checkWgReady, getState }
