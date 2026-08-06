/**
 * Dino Isekai — Minecraft Launcher
 * Created by FoxStudio. AI-assisted development.
 *
 * LAN World Scanner + Auto Tunnel
 * Lắng nghe UDP multicast của Minecraft "Open to LAN",
 * tự động chạy bore tunnel và mở cửa sổ share riêng.
 */

'use strict'

const dgram   = require('dgram')
const path    = require('path')
const fs      = require('fs')
const { app, ipcMain } = require('electron')

const MC_MULTICAST_ADDR = '224.0.2.60'
const MC_MULTICAST_PORT = 4445

function parseLanPacket(msg) {
  try {
    const str = msg.toString('utf8')
    const motdMatch = str.match(/\[MOTD\]([\s\S]*?)\[\/MOTD\]/)
    const adMatch   = str.match(/\[AD\](\d+)\[\/AD\]/)
    if (!adMatch) return null
    return {
      motd: motdMatch ? motdMatch[1].replace(/§./g, '').trim() : 'LAN World',
      port: parseInt(adMatch[1], 10),
    }
  } catch {
    return null
  }
}

// ─── State ────────────────────────────────────────────────────────────────────

let udpSocket      = null   
let scanActive     = false
let lastDetected   = null   
let tunnelProc     = null   
let tunnelAddr     = null   
let tunnelStatus   = 'idle' 
let onEventCb      = null   

const DATA_DIR  = path.join(app.getPath('appData'), '.DinoIsekai')
const BORE_DIR  = path.join(DATA_DIR, 'bore')
const BORE_EXE  = path.join(BORE_DIR, process.platform === 'win32' ? 'bore.exe' : 'bore')

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

let _lanWindowRef = null  

function setLanWindowRef(ref) {
  _lanWindowRef = ref
}

function emit(event, data) {
  if (typeof onEventCb === 'function') onEventCb(event, data)
  if (_lanWindowRef && typeof _lanWindowRef.send === 'function') {
    try { _lanWindowRef.send(event, data) } catch {}
  }
}

async function ensureBore(sendLog) {
  ensureDir(BORE_DIR)

  if (process.platform === 'win32') {
    try {
      const { execSync } = require('child_process')
      execSync(
        `powershell -Command "Add-MpPreference -ExclusionPath '${BORE_DIR}'" -ErrorAction SilentlyContinue`,
        { windowsHide: true, timeout: 5000 }
      )
    } catch {}
  }

  if (fs.existsSync(BORE_EXE)) return true

  sendLog('Đang tải bore tunnel...')

  const https = require('https')

  const releaseInfo = await new Promise((resolve, reject) => {
    https.get(
      'https://api.github.com/repos/ekzhang/bore/releases/latest',
      {
        headers: { 'User-Agent': 'DinoIsekai/1.0', 'Accept': 'application/vnd.github.v3+json' },
        timeout: 10000,
      },
      res => {
        let body = ''
        res.on('data', c => { body += c })
        res.on('end', () => { try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) } })
      }
    ).on('error', reject)
  })

  const platform = process.platform
  const arch     = process.arch
  let assetName
  if (platform === 'win32') {
    assetName = `bore-${releaseInfo.tag_name}-x86_64-pc-windows-msvc.zip`
  } else if (platform === 'darwin') {
    assetName = arch === 'arm64'
      ? `bore-${releaseInfo.tag_name}-aarch64-apple-darwin.tar.gz`
      : `bore-${releaseInfo.tag_name}-x86_64-apple-darwin.tar.gz`
  } else {
    assetName = arch === 'arm64'
      ? `bore-${releaseInfo.tag_name}-aarch64-unknown-linux-musl.tar.gz`
      : `bore-${releaseInfo.tag_name}-x86_64-unknown-linux-musl.tar.gz`
  }

  const asset = releaseInfo.assets?.find(a => a.name === assetName)
  if (!asset) throw new Error(`Không tìm thấy asset: ${assetName}`)

  sendLog(`Tải ${assetName}...`)
  const archivePath = path.join(BORE_DIR, assetName)

  await new Promise((resolve, reject) => {
    function doGet(url) {
      const client = url.startsWith('https') ? https : require('http')
      client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return doGet(res.headers.location)
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
        const out = fs.createWriteStream(archivePath)
        res.pipe(out)
        out.on('finish', resolve)
        out.on('error', reject)
      }).on('error', reject)
    }
    doGet(asset.browser_download_url)
  })

  if (assetName.endsWith('.zip')) {
    const { execSync } = require('child_process')
    execSync(
      `powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${BORE_DIR}' -Force"`,
      { windowsHide: true }
    )
  } else {
    const { execSync } = require('child_process')
    execSync(`tar -xzf "${archivePath}" -C "${BORE_DIR}"`, { cwd: BORE_DIR })
  }

  try { fs.unlinkSync(archivePath) } catch {}
  if (process.platform !== 'win32') fs.chmodSync(BORE_EXE, 0o755)

  if (!fs.existsSync(BORE_EXE)) {
    throw new Error('Windows Defender đã xóa bore.exe. Thêm exclusion cho: ' + BORE_DIR)
  }

  sendLog('Tải bore xong.')
  return true
}

async function startTunnel(port) {
  if (tunnelProc) {
    try { tunnelProc.kill() } catch {}
    tunnelProc = null
  }
  tunnelAddr   = null
  tunnelStatus = 'downloading'
  emit('lan:tunnelStatus', { status: tunnelStatus, addr: null, log: null })

  try {
    await ensureBore(line => {
      emit('lan:tunnelLog', { line })
    })
  } catch (err) {
    tunnelStatus = 'error'
    emit('lan:tunnelStatus', { status: 'error', addr: null, log: err.message })
    return
  }

  tunnelStatus = 'starting'
  emit('lan:tunnelStatus', { status: 'starting', addr: null, log: `Khởi động tunnel cổng ${port}...` })

  const { spawn } = require('child_process')
  const proc = spawn(BORE_EXE, ['local', String(port), '--to', 'bore.pub'], {
    cwd:   BORE_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  tunnelProc = proc

  let buf = ''
  const onData = (d) => {
    buf += d.toString()
    const lines = buf.split('\n')
    buf = lines.pop()
    lines.filter(Boolean).forEach(line => {
      const cleanLine = line.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').trim()
      if (!cleanLine) return

      emit('lan:tunnelLog', { line: cleanLine })

      const plainMatch = cleanLine.match(/bore\.pub:(\d+)/i)
      if (plainMatch) {
        tunnelAddr   = `bore.pub:${plainMatch[1]}`
        tunnelStatus = 'running'
        emit('lan:tunnelStatus', { status: 'running', addr: tunnelAddr, log: cleanLine })
        return
      }

      if (cleanLine.startsWith('{')) {
        try {
          const obj = JSON.parse(cleanLine)
          const remotePort =
            obj?.fields?.remote_port ??
            obj?.remote_port ??
            obj?.fields?.port ??
            obj?.port ??
            null

          const msg = obj?.fields?.message ?? obj?.message ?? ''

          if (remotePort && (msg.includes('listen') || msg.includes('remote') || remotePort > 0)) {
            tunnelAddr   = `bore.pub:${remotePort}`
            tunnelStatus = 'running'
            emit('lan:tunnelStatus', { status: 'running', addr: tunnelAddr, log: `bore.pub:${remotePort}` })
            return
          }
        } catch {}
      }

      const kvMatch = cleanLine.match(/remote_port[=:\s]+(\d+)/i) || cleanLine.match(/\bport[=:\s]+(\d+)/i)
      if (kvMatch && tunnelStatus === 'starting') {
        tunnelAddr   = `bore.pub:${kvMatch[1]}`
        tunnelStatus = 'running'
        emit('lan:tunnelStatus', { status: 'running', addr: tunnelAddr, log: cleanLine })
      }
    })
  }

  proc.stdout.on('data', onData)
  proc.stderr.on('data', onData)
  proc.on('close', code => {
    if (buf.trim()) emit('lan:tunnelLog', { line: buf.trim() })
    tunnelProc   = null
    tunnelStatus = 'stopped'
    tunnelAddr   = null
    emit('lan:tunnelStatus', { status: 'stopped', addr: null, log: `Tunnel dừng (code ${code})` })
  })
  proc.on('error', err => {
    tunnelStatus = 'error'
    emit('lan:tunnelStatus', { status: 'error', addr: null, log: err.message })
  })
}

function stopTunnel() {
  if (tunnelProc) {
    try { tunnelProc.kill() } catch {}
    tunnelProc = null
  }
  tunnelStatus = 'stopped'
  tunnelAddr   = null
  emit('lan:tunnelStatus', { status: 'stopped', addr: null, log: null })
}


function startScan(eventCallback) {
  if (scanActive) return
  onEventCb  = eventCallback
  scanActive = true

  udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

  udpSocket.on('error', (err) => {
    emit('lan:error', { message: err.message })
    stopScan()
  })

  udpSocket.on('message', (msg, rinfo) => {
    const parsed = parseLanPacket(msg)
    if (!parsed) return

    if (lastDetected && lastDetected.port === parsed.port) return

    lastDetected = { ...parsed, detectedAt: Date.now() }
    emit('lan:detected', { motd: parsed.motd, port: parsed.port })

    startTunnel(parsed.port)
  })

  udpSocket.bind(MC_MULTICAST_PORT, () => {
    try {
      udpSocket.addMembership(MC_MULTICAST_ADDR)
    } catch (err) {
      emit('lan:error', { message: `Multicast join failed: ${err.message}` })
    }
    emit('lan:scanning', { active: true })
  })
}

function stopScan() {
  scanActive   = false
  lastDetected = null
  onEventCb    = null

  stopTunnel()

  if (udpSocket) {
    try { udpSocket.close() } catch {}
    udpSocket = null
  }

  emit('lan:scanning', { active: false })
}
function registerLanHandlers(getTrustedWindow, openLanWindow) {
  ipcMain.handle('lan:startScan', (e) => {
    const win = getTrustedWindow(e)
    if (!win) return { error: 'Unauthorized' }

    startScan((event, data) => {
      if (!win.isDestroyed()) win.webContents.send(event, data)
      if (event === 'lan:detected') {
        openLanWindow({
          motd:       lastDetected?.motd || 'LAN World',
          port:       lastDetected?.port || 0,
          tunnelAddr: null, 
        })
      }

      if (event === 'lan:tunnelStatus' && data.status === 'running') {
        openLanWindow({
          motd:       lastDetected?.motd || 'LAN World',
          port:       lastDetected?.port || 0,
          tunnelAddr: data.addr,
        })
      }
    })

    return { ok: true }
  })

  ipcMain.handle('lan:stopScan', (e) => {
    const win = getTrustedWindow(e)
    if (!win) return { error: 'Unauthorized' }
    stopScan()
    return { ok: true }
  })

  ipcMain.handle('lan:stopTunnel', (e) => {
    const win = getTrustedWindow(e)
    if (!win) return { error: 'Unauthorized' }
    stopTunnel()
    return { ok: true }
  })

  ipcMain.handle('lan:getStatus', (e) => {
    if (!getTrustedWindow(e)) return null
    return {
      scanning:    scanActive,
      detected:    lastDetected,
      tunnelStatus,
      tunnelAddr,
    }
  })
}

function getTunnelState() {
  return { tunnelStatus, tunnelAddr, lastDetected }
}

module.exports = { registerLanHandlers, startScan, stopScan, stopTunnel, setLanWindowRef, getTunnelState }
