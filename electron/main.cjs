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

const { app, BrowserWindow, ipcMain, nativeImage, Tray, Menu, shell, protocol, net } = require('electron')
const path = require('path')
const fs   = require('fs')
const { Readable } = require('stream')
const rpc  = require('./discordRPC.cjs')
const { getHwid, getHwidFormatted } = require('./hwid.cjs')
const { registerProfileHandlers, registerProfileContentHandlers, registerJavaDistroHandlers } = require('./profileManager.cjs')
const { registerLauncherHandlers } = require('./launcher.cjs')
const { pingServer } = require('./launcher/serverPing.cjs')
const { checkUpdate, downloadUpdateToTemp, installUpdate } = require('./updater.cjs')


const isDev = process.env.NODE_ENV === 'development'

// ── Single instance lock: ngăn mở nhiều instance cùng lúc ─────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Khi user mở app lần 2 (double-click, shortcut...), focus lại instance cũ
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.setAppUserModelId('com.dinoisekai.launcher')

function resolveIconPath() {

  const devPath = path.join(__dirname, '../public/icon.ico')
  if (isDev && fs.existsSync(devPath)) return devPath

  const resourcesIcon = path.join(process.resourcesPath, 'icon.ico')
  if (fs.existsSync(resourcesIcon)) return resourcesIcon

  const exeDir = path.dirname(process.execPath)
  const exeIcon = path.join(exeDir, 'resources', 'icon.ico')
  if (fs.existsSync(exeIcon)) return exeIcon

  return devPath
}

function resolveTrayIconPath() {
  const candidates = []
  if (isDev) candidates.push(path.join(__dirname, '../public/icon.png'))
  candidates.push(path.join(process.resourcesPath, 'icon.png'))
  candidates.push(path.join(path.dirname(process.execPath), 'resources', 'icon.png'))
  if (isDev) candidates.push(path.join(__dirname, '../public/icon.png'))
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return resolveIconPath()
}

const ICON_PATH     = resolveIconPath()
const TRAY_ICON_PATH = resolveTrayIconPath()
const SERVER_ADDRESS = '160.250.134.168:28585'
const ACCOUNTS_DIR  = path.join(app.getPath('appData'), '.DinoIsekai')
const ACCOUNTS_FILE = path.join(ACCOUNTS_DIR, 'accounts.json')

const ALLOWED_ORIGINS = isDev
  ? ['http://localhost:5173']
  : ['file://']

const AVATAR_DOMAINS = [
  'https://crafthead.net',
  'https://mc-heads.net',
  'https://minotar.net',
  'https://crafatar.com',
  'https://textures.minecraft.net',
]

function isTrustedOrigin(url) {
  try {
    const u = new URL(url)
    if (!isDev && u.protocol === 'file:') return true
    if (ALLOWED_ORIGINS.some(o => url.startsWith(o))) return true
    return false
  } catch { return false }
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/

function validateAccount(account) {
  if (!account || typeof account !== 'object') return 'Du lieu khong hop le'
  if (account.type !== 'offline') return 'Loai tai khoan khong hop le'
  if (typeof account.username !== 'string') return 'Username khong hop le'
  if (!USERNAME_RE.test(account.username)) return 'Username chi duoc chua chu, so va _ (3-16 ky tu)'
  if (typeof account.uuid !== 'string' || !/^[0-9a-f-]{36}$/.test(account.uuid)) return 'UUID khong hop le'
  return null
}

function sanitizeAccount(account) {
  return {
    id:        account.id,
    uuid:      account.uuid,
    type:      account.type,
    username:  account.username,
    createdAt: account.createdAt,
  }
}

function validateId(id) {
  return typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id)
}

function ensureAccountsFile() {
  if (!fs.existsSync(ACCOUNTS_DIR)) fs.mkdirSync(ACCOUNTS_DIR, { recursive: true })
  if (!fs.existsSync(ACCOUNTS_FILE))
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify({ accounts: [], selectedId: null }, null, 2), { mode: 0o600 })
}
function readAccounts() {
  ensureAccountsFile()
  try {
    const data = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'))
    if (!Array.isArray(data.accounts)) data.accounts = []
    return data
  }
  catch { return { accounts: [], selectedId: null } }
}
function writeAccounts(data) {
  ensureAccountsFile()
  const tmp = ACCOUNTS_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, ACCOUNTS_FILE)
}

const SETTINGS_FILE = path.join(ACCOUNTS_DIR, 'settings.json')

const DEFAULT_SETTINGS = {
  autoCheckUpdate:      true,
  hideLauncherOnLaunch: true,
  showLogWindow:        true,
  dataSyncEnabled:      true,
  loadAssetsOnStart:     true,
  discordRPC:           false,
  boostMode:            false,
  bigCoreMode:          false,
  fontId:               'system',
  colorAccent:          '#4ade80',
  colorHover:           '#86efac',
  colorActive:          '#22c55e',
  background:           'dark',
  customBgPath:         '',
  borderRadius:         12,
  borderColor:          'rgba(255,255,255,0.08)',
  agreedTos:            false,
  agreedPrivacy:        false,
  language:             'vi',
  gamingMode:           false,
  initialSetupCompleted: false,
  closeBehavior:        'ask',
}

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS)

function sanitizeSettings(input = {}) {
  const safe = { ...DEFAULT_SETTINGS }
  if (!input || typeof input !== 'object') return safe

  for (const key of SETTING_KEYS) {
    if (key in input) safe[key] = input[key]
  }

  return safe
}

function readSettings() {
  ensureAccountsFile()
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return sanitizeSettings()
    return sanitizeSettings(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')))
  } catch { return sanitizeSettings() }
}

function writeSettings(data) {
  ensureAccountsFile()
  const tmp = SETTINGS_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(sanitizeSettings(data), null, 2), { mode: 0o600 })
  fs.renameSync(tmp, SETTINGS_FILE)
}

let mainWindow   = null
let tray         = null

function secureWebPrefs() {
  return {
    preload:                     path.join(__dirname, 'preload.cjs'),
    contextIsolation:            true,
    nodeIntegration:             false,
    nodeIntegrationInWorker:     false,
    nodeIntegrationInSubFrames:  false,

    webSecurity:                 true,
    allowRunningInsecureContent: false,
    experimentalFeatures:        false,
  }
}

function createMainWindow() {
  const icon = fs.existsSync(ICON_PATH) ? nativeImage.createFromPath(ICON_PATH) : undefined

  mainWindow = new BrowserWindow({
    width: 1280, height: 720,
    minWidth: 1280, minHeight: 720,
    maxWidth: 1280, maxHeight: 720,
    resizable: false,
    maximizable: false,
    frame: false, transparent: false,
    show: false,
    backgroundColor: '#080808',
    title: 'Dino Isekai',
    icon,
    webPreferences: secureWebPrefs(),
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!isTrustedOrigin(url)) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedOrigin(url)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Phím tắt mở/đóng DevTools ngay cả khi đã đóng gói (F12 / Ctrl+Shift+I)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const isShortcut =
      input.key === 'F12' ||
      (input.control && input.shift && (input.key === 'I' || input.key === 'i'))
    if (isShortcut) {
      event.preventDefault()
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools()
      } else {
        mainWindow.webContents.openDevTools({ mode: 'undocked' })
      }
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide() }
  })
  mainWindow.on('closed', () => { mainWindow = null })
}

function createTray() {
  try {
    let trayIcon
    if (fs.existsSync(TRAY_ICON_PATH)) {
      trayIcon = nativeImage.createFromPath(TRAY_ICON_PATH).resize({ width: 16, height: 16 })
    } else {

      trayIcon = nativeImage.createEmpty()
    }

    if (trayIcon.isEmpty()) {
      console.error('[Tray] Icon rỗng — bỏ qua tạo tray (kiểm tra icon.png trong resources)')
    }

    tray = new Tray(trayIcon)
    tray.setToolTip('Dino Isekai')
    tray.setTitle('Dino Isekai')

    const openMainWindow = () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        createMainWindow()
        return
      }
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }

    const menuIcon = fs.existsSync(TRAY_ICON_PATH)
      ? nativeImage.createFromPath(TRAY_ICON_PATH).resize({ width: 16, height: 16 })
      : undefined

    const trayMenu = Menu.buildFromTemplate([
      {
        label: 'Dino Isekai', enabled: false,
        ...(menuIcon ? { icon: menuIcon } : {}),
      },
      { type: 'separator' },
      {
        label: 'Mở Dino Isekai',
        click: () => openMainWindow(),
      },
      { type: 'separator' },
      {
        label: 'Thoát',
        click: () => { app.isQuitting = true; app.quit() },
      },
    ])

    // BẮT BUỘC cho Linux: AppIndicator/StatusNotifier chỉ hiển thị qua
    // context menu này; các sự kiện click/right-click không hoạt động trên Linux.
    tray.setContextMenu(trayMenu)

    // Windows/macOS: click trái mở app (Linux bỏ qua, dùng menu).
    tray.on('click', () => {
      openMainWindow()
    })

    tray.on('double-click', () => {
      openMainWindow()
    })
  } catch (err) {
    console.error('[Tray] Failed to create tray:', err.message)
  }
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'vxc-bg', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true, corsEnabled: true, stream: true } }
])

function execOut(cmd, args) {
  return new Promise((resolve) => {
    const { execFile } = require('child_process')
    execFile(cmd, args, { timeout: 6000 }, (err, stdout) => resolve(err ? '' : String(stdout)))
  })
}

async function linuxGpuName() {
  try {
    const out = await execOut('lspci', ['-nn'])
    for (const line of out.split('\n')) {
      if (/VGA compatible controller|3D controller|Display controller/i.test(line)) {
        const m = line.match(/(?:VGA compatible controller|3D controller|Display controller)\s*(\[[0-9a-f]{4}\])?:\s*(.+)$/i)
        if (m && m[2]) {
          let name = m[2]
          name = name.replace(/\s*\(rev\s+[0-9a-f]+\)\s*$/i, '')          // bỏ (rev a1)
          name = name.replace(/\s*\[[0-9a-f]{4}:[0-9a-f]{4}\]\s*$/, '')     // bỏ [10de:1f82]
          name = name.trim()
          if (name) return name
        }
      }
    }
  } catch {}
  try {
    const out = await execOut('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader'])
    const name = out.trim().split('\n')[0]
    if (name) return name.trim()
  } catch {}
  return null
}

async function windowsGpuName() {
  // PowerShell lấy tên các card đồ họa
  try {
    const out = await execOut('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_VideoController).Name'])
    const names = out.split('\n').map(s => s.trim()).filter(Boolean)
    if (names.length) return names[0]
  } catch {}
  // Fallback wmic
  try {
    const out = await execOut('wmic', ['path', 'win32_VideoController', 'get', 'name'])
    const names = out.split('\n').map(s => s.trim()).filter(Boolean).filter(s => !/^name$/i.test(s))
    if (names.length) return names[0]
  } catch {}
  return null
}


app.whenReady().then(() => {

  ipcMain.handle('bg:readFile', async (e, filePath) => {
    try {
      const data = await fs.promises.readFile(filePath)
      return { data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), ext: path.extname(filePath) }
    } catch { return null }
  })

  ipcMain.handle('app:backgroundPath', () => {
    const p = path.join(app.getPath('appData'), '.DinoIsekai', 'background-launcher.png')
    return fs.existsSync(p) ? p : null
  })

  ipcMain.handle('server:status', async () => {
    try {
      const [host, portStr] = SERVER_ADDRESS.split(':')
      const res = await pingServer(host, parseInt(portStr, 10) || 25565, 5000)
      return { server: { ip: SERVER_ADDRESS, name: 'Dino Isekai Server' }, ...res }
    } catch (err) {
      return { error: err.message }
    }
  })

  // ── Cập nhật launcher (chỉ Windows) ───────────────────────────────────────
  ipcMain.handle('update:check', async () => {
    return checkUpdate()
  })

  ipcMain.handle('update:download', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return { error: 'no_window' }
    const info = await checkUpdate()
    if (!info.ok || !info.hasUpdate || !info.assetUrl) return { ok: false, error: 'no_update' }
    try {
      const installerPath = await downloadUpdateToTemp(info.assetUrl, (p) => {
        if (!win.isDestroyed()) win.webContents.send('updater:progress', { ...p, version: info.latest })
      })
      return { ok: true, installerPath }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('update:install', async (e, { installerPath }) => {
    if (!installerPath || !fs.existsSync(installerPath)) return { error: 'file_not_found' }
    installUpdate(installerPath)
    setTimeout(() => app.quit(), 600)
    return { ok: true }
  })

  // ── Thông tin hệ thống (CPU / GPU) ────────────────────────────────────────
  ipcMain.handle('system:info', async (e) => {
    if (!getTrustedWindow(e)) return null
    const os = require('os')
    const cpu = os.cpus()[0]?.model?.trim() || 'Unknown CPU'
    let gpu = 'Unknown GPU'

    if (process.platform === 'linux') {
      // Linux: ưu tiên lspci / nvidia-smi (Electron hay trả ID hex như "10de:1f82")
      const name = await linuxGpuName()
      if (name) gpu = name
    } else if (process.platform === 'win32') {
      // Windows: ưu tiên PowerShell (lấy tên card đầy đủ)
      const name = await windowsGpuName()
      if (name) gpu = name
    }

    if (!gpu || gpu === 'Unknown GPU' || /unknown/i.test(gpu) || /^[0-9a-f]{4}:[0-9a-f]{4}$/i.test(gpu)) {
      try {
        const info = await app.getGPUInfo('basic')
        const dev = info?.gpuDevice?.[0]
        if (dev?.deviceName && !/^[0-9a-f]{4}:[0-9a-f]{4}$/i.test(dev.deviceName)) gpu = dev.deviceName
      } catch {}
    }

    return { cpu, gpu }
  })

  protocol.handle('vxc-bg', async (request) => {
    const u = new URL(request.url)
    const filePath = decodeURIComponent(u.searchParams.get('path'))
    const MIME = {
      '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
      '.webp':'image/webp','.bmp':'image/bmp','.gif':'image/gif',
      '.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime',
      '.avi':'video/x-msvideo',
    }
    try {
      const ext = path.extname(filePath).toLowerCase()
      const cType = MIME[ext] || 'application/octet-stream'
      const stream = fs.createReadStream(filePath)
      return new Response(Readable.toWeb(stream), {
        status: 200,
        headers: { 'Content-Type': cType, 'Access-Control-Allow-Origin': '*' }
      })
    } catch { return new Response(null, { status: 404 }) }
  })

  try {
    const os = require('os')
    const updateDir = path.join(os.tmpdir(), 'DinoIsekai-update')
    if (fs.existsSync(updateDir)) {
      const files = fs.readdirSync(updateDir)
      for (const f of files) {
        if (f.endsWith('.exe') || f.endsWith('.AppImage') || f.endsWith('.deb')) {
          try { fs.unlinkSync(path.join(updateDir, f)) } catch {}
        }
      }
    }
  } catch {}
  const { session } = require('electron')
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const url = details.url || ''
    if (
      url.includes('youtube.com') ||
      url.includes('youtube-nocookie.com') ||
      url.includes('googlevideo.com') ||
      url.includes('ytimg.com')
    ) {
      return callback({ responseHeaders: details.responseHeaders })
    }

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' http://localhost:5173 ws://localhost:5173;" +
          "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: http://localhost:5173;" +
          "worker-src 'self' blob:;" +
          "font-src 'self' data:;" +
          "img-src 'self' data: blob: https:;" +
          "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://youtube-nocookie.com https://youtube.com;" +
          "connect-src 'self' blob: http://localhost:5173 ws://localhost:5173 https://minotar.net https://crafthead.net https://mc-heads.net https://meta.fabricmc.net https://maven.fabricmc.net https://api.modrinth.com https://cdn.modrinth.com https://files.minecraftforge.net https://repo1.maven.org https://maven.neoforged.net https://api.foxstudio.site https://api.github.com https://github.com https://raw.githubusercontent.com https://voxelx.io.vn https://www.voxelx.io.vn https://foxstudio.site;"
        ],
      },
    })
  })

  createMainWindow()
  createTray()

  const initSettings = readSettings()
  if (initSettings.discordRPC) { rpc.connect(); rpc.PRESETS.menu() }



  app.on('activate', () => {
    if (!mainWindow) createMainWindow(); else mainWindow.show()
  })
})

app.on('window-all-closed', () => {  })
app.on('before-quit', () => { app.isQuitting = true })

function getTrustedWindow(event) {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return null
  const url = event.sender.getURL()
  if (!isTrustedOrigin(url)) return null
  return win
}

ipcMain.on('window-minimize', (e) => getTrustedWindow(e)?.minimize())
ipcMain.on('window-maximize', (e) => {
  const win = getTrustedWindow(e)
  if (!win) return
  win.isMaximized() ? win.unmaximize() : win.maximize()
})
ipcMain.on('window-close', (e) => {
  const win = getTrustedWindow(e)
  if (!win) return
  win.hide()
})

ipcMain.on('quit-app', () => {
  app.isQuitting = true
  app.quit()
})

ipcMain.handle('app:version', (e) => {
  if (!getTrustedWindow(e)) return null
  return app.getVersion()
})

ipcMain.handle('app:hwid', (e) => {
  if (!getTrustedWindow(e)) return null
  return { hwid: getHwid(), hwidFormatted: getHwidFormatted() }
})

ipcMain.handle('accounts:get', (e) => {
  if (!getTrustedWindow(e)) return { accounts: [], selectedId: null }
  return readAccounts()
})

ipcMain.handle('accounts:add', (e, account) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }

  const err = validateAccount(account)
  if (err) return { error: err }

  const data = readAccounts()
  const exists = data.accounts.find(a => a.username === account.username && a.type === account.type)
  if (exists) return { error: 'Tài khoản đã tồn tại' }

  const safe = sanitizeAccount(account)
  data.accounts.push(safe)
  if (!data.selectedId) data.selectedId = safe.id
  writeAccounts(data)
  return { ok: true, data }
})

ipcMain.handle('accounts:remove', (e, id) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  if (!validateId(id)) return { error: 'ID không hợp lệ' }

  const data = readAccounts()
  data.accounts = data.accounts.filter(a => a.id !== id)
  if (data.selectedId === id) data.selectedId = data.accounts[0]?.id ?? null
  writeAccounts(data)
  return { ok: true, data }
})

ipcMain.handle('accounts:select', (e, id) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  if (!validateId(id)) return { error: 'ID không hợp lệ' }

  const data = readAccounts()
  if (!data.accounts.find(a => a.id === id)) return { error: 'Tài khoản không tồn tại' }
  data.selectedId = id
  writeAccounts(data)
  return { ok: true, data }
})

ipcMain.handle('accounts:update', (e, { id, patch }) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  if (!validateId(id)) return { error: 'ID không hợp lệ' }
  if (!patch || typeof patch !== 'object') return { error: 'Dữ liệu không hợp lệ' }

  const data = readAccounts()
  const idx = data.accounts.findIndex(a => a.id === id)
  if (idx === -1) return { error: 'Tài khoản không tồn tại' }

  return { ok: true, data }
})

ipcMain.handle('shell:openExternal', (e, url) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return { error: 'Chỉ cho phép HTTPS' }
    shell.openExternal(url)
    return { ok: true }
  } catch { return { error: 'URL không hợp lệ' } }
})

registerProfileHandlers(getTrustedWindow)
registerProfileContentHandlers(getTrustedWindow)
registerJavaDistroHandlers(getTrustedWindow)
registerLauncherHandlers(getTrustedWindow)

ipcMain.handle('fabric:getLoaderVersions', async (e, gameVersion) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  if (typeof gameVersion !== 'string' || !/^[a-zA-Z0-9._+\-]+$/.test(gameVersion)) {
    return { error: 'Invalid game version' }
  }
  try {
    const https = require('https')
    const url = `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(gameVersion)}`
    const data = await new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
        let body = ''
        res.on('data', chunk => { body += chunk })
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
          try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) }
        })
      }).on('error', reject)
    })
    return { ok: true, data: data.map(item => ({ version: item.loader.version, stable: item.loader.stable })) }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('forge:getVersions', async (e, gameVersion) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  if (typeof gameVersion !== 'string') return { error: 'Invalid game version' }
  try {
    const https = require('https')
    const url = `https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json`
    const data = await new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
        let body = ''
        res.on('data', c => { body += c })
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
          try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) }
        })
      }).on('error', reject)
    })
    const promos = data.promos || {}
    const recommended = promos[`${gameVersion}-recommended`] || null
    const latest      = promos[`${gameVersion}-latest`]      || null
    // Collect all forge versions for this MC version
    const versions = Object.entries(promos)
      .filter(([k]) => k.startsWith(gameVersion + '-'))
      .map(([, v]) => `${gameVersion}-${v}`)
      .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    return { ok: true, data: { versions, recommended: recommended ? `${gameVersion}-${recommended}` : null, latest: latest ? `${gameVersion}-${latest}` : null } }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('neoforge:getVersions', async (e, gameVersion) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  if (typeof gameVersion !== 'string') return { error: 'Invalid game version' }
  try {
    const https = require('https')
    const getXml = (url) => new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
        if (res.statusCode === 404) return resolve('')
        let body = ''
        res.on('data', c => { body += c })
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
          resolve(body)
        })
      }).on('error', reject)
    })
    // NeoForge versions are split across two maven groups:
    //  - net/neoforged/neoforge  → "20.4.x" (MC 1.20.4+), "21.1.x" (MC 1.21.1)...
    //  - net/neoforged/forge     → "1.20.1-47.x.x" (MC 1.20.1)
    const urls = [
      'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml',
      'https://maven.neoforged.net/releases/net/neoforged/forge/maven-metadata.xml',
    ]
    const xmls = await Promise.all(urls.map(getXml))
    const versions = []
    for (const xml of xmls) {
      const matches = xml.match(/<version>([^<]+)<\/version>/g) || []
      for (const m of matches) {
        const v = m.replace(/<\/?version>/g, '').trim()
        if (v && !versions.includes(v)) versions.push(v)
      }
    }
    const mcKey = gameVersion.startsWith('1.')
      ? gameVersion.replace(/^1\./, '')   // "1.21.1" → "21.1"
      : gameVersion                        // "26" → "26"
    // Match both naming styles: "1.20.1-47.x.x" (prefixed) and "20.4.x".
    const matched = versions.filter(v =>
      v.startsWith(gameVersion + '-') || v.startsWith(mcKey + '.')
    )
    const numOf = (v) => (v.match(/\d+/g) || []).map(Number)
    matched.sort((a, b) => {
      const na = numOf(a), nb = numOf(b)
      const len = Math.max(na.length, nb.length)
      for (let i = 0; i < len; i++) {
        const da = na[i] ?? 0, db = nb[i] ?? 0
        if (da !== db) return db - da
      }
      return 0
    })
    const sliced = matched.slice(0, 30)
    const latest = sliced[0] || null
    return { ok: true, data: { versions: sliced, latest, recommended: null } }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('minecraft:listVersions', async (e) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  try {
    const { listVersions } = require('./launcher/vanilla/versionResolver.cjs')
    const versions = await listVersions()
    return { ok: true, data: versions }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('modpack:browse', async (e) => {
  const win = getTrustedWindow(e)
  if (!win) return { error: 'Unauthorized' }

  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog(win, {
    title:       'Chọn file modpack',    buttonLabel: 'Chọn',
    filters: [
      { name: 'Modpack', extensions: ['zip', 'mrpack'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })

  if (result.canceled || !result.filePaths.length) return { canceled: true }
  const filePath = result.filePaths[0]
  const name = require('path').basename(filePath)
  return { ok: true, filePath, name }
})

ipcMain.handle('modpack:readMeta', async (e, filePath) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  if (typeof filePath !== 'string') return { error: 'Invalid path' }

  const fs   = require('fs')
  const path = require('path')
  const zlib = require('zlib')

  if (!fs.existsSync(filePath)) return { error: 'File không tồn tại' }

  try {
    const buf = fs.readFileSync(filePath)
    function readZipEntry(name) {
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
        if (fileName === name) {
          const lfnLen  = buf.readUInt16LE(localOffset + 26)
          const lexLen  = buf.readUInt16LE(localOffset + 28)
          const dataOff = localOffset + 30 + lfnLen + lexLen
          const comp    = buf.slice(dataOff, dataOff + compSize)
          if (compMethod === 0) return comp
          if (compMethod === 8) return zlib.inflateRawSync(comp)
          return null
        }
        pos += 46 + fnLen + extraLen + commentLen
      }
      return null
    }

    const baseName = path.basename(filePath).replace(/\.(zip|mrpack)$/i, '')
    let name = baseName, gameVersion = '', loader = '', loaderVersion = ''
    let iconBase64 = null
    let iconUrl    = null

    const manifestData = readZipEntry('manifest.json')
    if (manifestData) {
      const manifest = JSON.parse(manifestData.toString('utf8'))
      name        = manifest.name || baseName
      gameVersion = manifest.minecraft?.version || ''
      const loaderRaw = (manifest.minecraft?.modLoaders || [])[0]?.id || ''
      if (loaderRaw.startsWith('neoforge-'))    { loader = 'neoforge'; loaderVersion = loaderRaw.replace('neoforge-', '') }
      else if (loaderRaw.startsWith('forge-'))  { loader = 'forge';    loaderVersion = loaderRaw.replace('forge-', '') }
      else if (loaderRaw.startsWith('fabric-')) { loader = 'fabric';   loaderVersion = loaderRaw.replace('fabric-', '') }
      else { loader = 'forge'; loaderVersion = loaderRaw }
      if (manifest.image) iconUrl = manifest.image    }

    const mrData = readZipEntry('modrinth.index.json')
    if (mrData) {
      const mr = JSON.parse(mrData.toString('utf8'))
      name        = mr.name || baseName
      gameVersion = mr.dependencies?.minecraft || ''
      if (mr.dependencies?.['fabric-loader'])   { loader = 'fabric';   loaderVersion = mr.dependencies['fabric-loader'] }
      else if (mr.dependencies?.['neoforge'])   { loader = 'neoforge'; loaderVersion = mr.dependencies['neoforge'] }
      else if (mr.dependencies?.['forge'])      { loader = 'forge';    loaderVersion = mr.dependencies['forge'] }
      else if (mr.dependencies?.['quilt-loader']){ loader = 'quilt';   loaderVersion = mr.dependencies['quilt-loader'] }
    }
    for (const iconName of ['icon.png', 'pack.png']) {
      const iconData = readZipEntry(iconName)
      if (iconData) {
        iconBase64 = 'data:image/png;base64,' + iconData.toString('base64')
        break
      }
    }

    return { ok: true, name, gameVersion, loader, loaderVersion, iconBase64, iconUrl, filePath }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('profiles:importModpack', async (e, { filePath, source, profileId }) => {
  const win = getTrustedWindow(e)
  if (!win) return { error: 'Unauthorized' }

  const path = require('path')
  const fs   = require('fs')
  const { fork } = require('child_process')

  if (!filePath || !fs.existsSync(filePath)) return { error: 'File không tồn tại' }
  if (!['curseforge', 'modrinth'].includes(source)) return { error: 'Source không hợp lệ' }

  const DATA_DIR_IMPORT = path.join(require('electron').app.getPath('appData'), '.DinoIsekai')
  const PROFILES_FILE_IMPORT = path.join(DATA_DIR_IMPORT, 'profiles.json')
  let profilesData
  try { profilesData = JSON.parse(fs.readFileSync(PROFILES_FILE_IMPORT, 'utf-8')) }
  catch { profilesData = { profiles: [] } }
  const profile = profilesData.profiles.find(p => p.id === profileId)
  if (!profile) return { error: 'Profile không tồn tại' }

  const instancePath = profile.instancePath
  if (!fs.existsSync(instancePath)) fs.mkdirSync(instancePath, { recursive: true })

  const worker = fork(path.join(__dirname, 'launcher', 'importWorker.cjs'), [], { stdio: 'pipe' })

  let settled = false
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      settled = true
      try { worker.kill() } catch {}
      reject(new Error('Import timeout'))
    }, 600000)

    worker.on('message', (msg) => {
      if (msg.type === 'progress') {
        if (!win.isDestroyed()) win.webContents.send('import:progress', msg.data)
      } else if (msg.type === 'done') {
        settled = true; clearTimeout(timeout); resolve({ ok: true })
      } else if (msg.type === 'error') {
        settled = true; clearTimeout(timeout); reject(new Error(msg.message))
      }
    })

    worker.on('exit', (code) => {
      clearTimeout(timeout)
      if (!settled) reject(new Error(`Worker exited with code ${code}`))
    })

    worker.on('error', (err) => {
      settled = true; clearTimeout(timeout); reject(err)
    })

    worker.send({ type: 'start', filePath, source, instancePath })
  })

  try { worker.kill() } catch {}

  try {
    const latestData = JSON.parse(fs.readFileSync(PROFILES_FILE_IMPORT, 'utf-8'))
    const idx = latestData.profiles.findIndex(p => p.id === profileId)
    if (idx >= 0) {
      latestData.profiles[idx].importSource = source
      const tmp = PROFILES_FILE_IMPORT + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(latestData, null, 2), { mode: 0o600 })
      fs.renameSync(tmp, PROFILES_FILE_IMPORT)
    }
  } catch {}

  return result
})

ipcMain.handle('profiles:saveTempFile', async (e, { name, buffer }) => {
  if (!getTrustedWindow(e)) return null
  try {
    const os   = require('os')
    const path = require('path')
    const fs   = require('fs')
    const tmpPath = path.join(os.tmpdir(), `vxc-import-${Date.now()}-${name}`)
    fs.writeFileSync(tmpPath, Buffer.from(buffer))
    return tmpPath
  } catch {
    return null
  }
})

// Map lưu AbortController cho từng download đang chạy (key = webContents id)
const activeModpackDownloads = new Map()

ipcMain.handle('modpack:cancel', (e) => {
  const win = getTrustedWindow(e)
  if (!win) return { error: 'Unauthorized' }
  const controller = activeModpackDownloads.get(win.webContents.id)
  if (controller) {
    controller.abort()
    activeModpackDownloads.delete(win.webContents.id)
    return { ok: true }
  }
  return { ok: true, noop: true }
})

ipcMain.handle('modpack:downloadAndImport', async (e, { downloadUrl, filename, source, profileMeta }) => {
  const win = getTrustedWindow(e)
  if (!win) return { error: 'Unauthorized' }

  const os   = require('os')
  const path = require('path')
  const fs   = require('fs')
  const https = require('https')
  const http  = require('http')

  // Tạo AbortController cho lần download này
  const controller = new AbortController()
  const { signal } = controller
  activeModpackDownloads.set(win.webContents.id, controller)

  function sendProgress(data) {
    if (!win.isDestroyed()) win.webContents.send('import:progress', data)
  }

  // Dọn dẹp khi xong (dù thành công hay lỗi)
  function cleanup(tmpPath) {
    activeModpackDownloads.delete(win.webContents.id)
    if (tmpPath) try { fs.unlinkSync(tmpPath) } catch {}
  }

  const tmpPath = path.join(os.tmpdir(), `vxc-modpack-${Date.now()}-${filename}`)
  sendProgress({ phase: 'download', log: `Đang tải ${filename}...`, percent: 2 })

  try {
    await new Promise((resolve, reject) => {
      // Nếu đã bị hủy trước khi bắt đầu
      if (signal.aborted) return reject(new Error('Cancelled'))
      signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true })

      let settled = false
      let activeReq = null
      function done(err) {
        if (settled) return
        settled = true
        if (err) reject(err); else resolve()
      }

      // Theo dõi redirect và chỉ tạo WriteStream một lần duy nhất sau khi có URL thực
      const MAX_REDIRECTS = 10
      function doGet(url, redirectCount) {
        if (signal.aborted) return done(new Error('Cancelled'))
        if (redirectCount > MAX_REDIRECTS) return done(new Error('Too many redirects'))
        const client = url.startsWith('https') ? https : http
        const req = client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume()
            return doGet(res.headers.location, redirectCount + 1)
          }
          if (res.statusCode !== 200) {
            res.resume()
            return done(new Error(`HTTP ${res.statusCode}: ${url}`))
          }
          // Chỉ tạo WriteStream sau khi đã resolve hết redirect
          const tmpFile = fs.createWriteStream(tmpPath)
          const total = parseInt(res.headers['content-length'] || '0', 10)
          let received = 0

          // Hủy stream khi signal abort
          signal.addEventListener('abort', () => {
            res.destroy()
            tmpFile.destroy()
            try { fs.unlinkSync(tmpPath) } catch {}
            done(new Error('Cancelled'))
          }, { once: true })

          res.on('data', chunk => {
            received += chunk.length
            if (total > 0) {
              const pct = 2 + Math.round((received / total) * 18)
              sendProgress({ phase: 'download', log: `Đang tải ${filename}: ${pct}%`, percent: pct })
            }
          })
          res.pipe(tmpFile)
          tmpFile.on('finish', () => done())
          tmpFile.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {} done(err) })
          res.on('error',     err => { try { fs.unlinkSync(tmpPath) } catch {} done(err) })
        })
        activeReq = req
        req.on('error', err => done(err))
      }
      doGet(downloadUrl, 0)
    })
  } catch (err) {
    const isCancelled = err.message === 'Cancelled'
    if (isCancelled) {
      cleanup(tmpPath)
      sendProgress({ phase: 'cancelled', log: 'Đã hủy tải xuống.', percent: 0 })
      return { cancelled: true }
    }
    cleanup(null)
    sendProgress({ phase: 'error', log: `Lỗi tải file: ${err.message}`, percent: 0 })
    return { error: err.message }
  }

  sendProgress({ phase: 'read', log: 'Đọc metadata modpack...', percent: 20 })

  let meta = {}
  try {
    const { ipcMain: _ipc, BrowserWindow } = require('electron')

    const zlib = require('zlib')
    const buf = fs.readFileSync(tmpPath)

    function readZipEntry(name) {
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
        if (fileName === name) {
          const lfnLen  = buf.readUInt16LE(localOffset + 26)
          const lexLen  = buf.readUInt16LE(localOffset + 28)
          const dataOff = localOffset + 30 + lfnLen + lexLen
          const comp    = buf.slice(dataOff, dataOff + compSize)
          if (compMethod === 0) return comp
          if (compMethod === 8) return zlib.inflateRawSync(comp)
          return null
        }
        pos += 46 + fnLen + extraLen + commentLen
      }
      return null
    }

    const baseName = path.basename(filename).replace(/\.(zip|mrpack)$/i, '')
    let name = profileMeta?.name || baseName
    let gameVersion = profileMeta?.gameVersion || ''
    let loader = profileMeta?.loader || 'forge'
    let loaderVersion = profileMeta?.loaderVersion || ''

    const manifestData = readZipEntry('manifest.json')
    if (manifestData) {
      const manifest = JSON.parse(manifestData.toString('utf8'))
      name        = manifest.name || name
      gameVersion = manifest.minecraft?.version || gameVersion
      const loaderRaw = (manifest.minecraft?.modLoaders || [])[0]?.id || ''
      if (loaderRaw.startsWith('neoforge-'))    { loader = 'neoforge'; loaderVersion = loaderRaw.replace('neoforge-', '') }
      else if (loaderRaw.startsWith('forge-'))  { loader = 'forge';    loaderVersion = loaderRaw.replace('forge-', '') }
      else if (loaderRaw.startsWith('fabric-')) { loader = 'fabric';   loaderVersion = loaderRaw.replace('fabric-', '') }
    }
    const mrData = readZipEntry('modrinth.index.json')
    if (mrData) {
      const mr = JSON.parse(mrData.toString('utf8'))
      name        = mr.name || name
      gameVersion = mr.dependencies?.minecraft || gameVersion
      if (mr.dependencies?.['fabric-loader'])    { loader = 'fabric';   loaderVersion = mr.dependencies['fabric-loader'] }
      else if (mr.dependencies?.['neoforge'])    { loader = 'neoforge'; loaderVersion = mr.dependencies['neoforge'] }
      else if (mr.dependencies?.['forge'])       { loader = 'forge';    loaderVersion = mr.dependencies['forge'] }
      else if (mr.dependencies?.['quilt-loader']){ loader = 'quilt';    loaderVersion = mr.dependencies['quilt-loader'] }
    }
    meta = { name, gameVersion, loader, loaderVersion }
  } catch (err) {
    meta = {
      name:          profileMeta?.name || path.basename(filename, path.extname(filename)),
      gameVersion:   profileMeta?.gameVersion || '',
      loader:        profileMeta?.loader || 'forge',
      loaderVersion: profileMeta?.loaderVersion || '',
    }
  }

  sendProgress({ phase: 'create', log: 'Tạo profile...', percent: 22 })

  const DATA_DIR_DL = path.join(require('electron').app.getPath('appData'), '.DinoIsekai')
  const PROFILES_FILE_DL = path.join(DATA_DIR_DL, 'profiles.json')

  const profileId = require('crypto').randomUUID()
  const now = new Date().toISOString()
  const INSTANCES_DIR_DL = path.join(DATA_DIR_DL, 'instances')

  function slugifyName(name) {
    return String(name || 'profile')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'profile'
  }

  function uniqueInstanceDir(baseName) {
    const slug = slugifyName(baseName)
    let folder = slug
    let n = 2
    const taken = new Set()
    try {
      const PROFILES_FILE_DL_TMP = path.join(DATA_DIR_DL, 'profiles.json')
      const existing = JSON.parse(fs.readFileSync(PROFILES_FILE_DL_TMP, 'utf-8'))
      ;(existing.profiles || []).forEach(p => { if (p.instancePath) taken.add(path.resolve(p.instancePath)) })
    } catch {}
    const isTaken = p => {
      const resolved = path.resolve(p)
      return taken.has(resolved) || fs.existsSync(resolved)
    }
    while (isTaken(path.join(INSTANCES_DIR_DL, folder))) {
      folder = `${slug}-${n}`
      n++
    }
    return path.join(INSTANCES_DIR_DL, folder)
  }

  const instancePath = uniqueInstanceDir(meta.name || 'Modpack')
  try { fs.mkdirSync(instancePath, { recursive: true }) } catch {}

  const profile = {
    id:            profileId,
    name:          meta.name || 'Modpack',
    loader:        meta.loader,
    gameVersion:   meta.gameVersion,
    loaderVersion: meta.loaderVersion,
    instancePath,
    isCustomPath:  false,
    createdAt:     now,
    lastPlayed:    null,
    sizeBytes:     0,
    importSource:  source,
    importIconUrl: profileMeta?.iconUrl || null,
    importBgUrl:   profileMeta?.iconUrl || null,
  }

  try {
    let profilesData
    try { profilesData = JSON.parse(fs.readFileSync(PROFILES_FILE_DL, 'utf-8')) }
    catch { profilesData = { profiles: [], selectedProfileId: null } }
    profilesData.profiles.push(profile)
    if (!profilesData.selectedProfileId) profilesData.selectedProfileId = profileId
    const tmp = PROFILES_FILE_DL + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(profilesData, null, 2), { mode: 0o600 })
    fs.renameSync(tmp, PROFILES_FILE_DL)
  } catch (err) {
    try { fs.unlinkSync(tmpPath) } catch {}
    sendProgress({ phase: 'error', log: `Lỗi tạo profile: ${err.message}`, percent: 0 })
    return { error: err.message }
  }

  sendProgress({ phase: 'start', log: 'Bắt đầu import modpack...', percent: 25 })

  try {
    let result
    if (source === 'modrinth') {
      const { importModrinthPack } = require('./launcher/modrinth/modrinthImporter.cjs')
      result = await importModrinthPack(tmpPath, instancePath, sendProgress)
    } else if (source === 'curseforge') {
      const { importCurseForgePack } = require('./launcher/curseforge/curseforgeImporter.cjs')
      result = await importCurseForgePack(tmpPath, instancePath, sendProgress)
    } else {

      result = { name: meta.name, gameVersion: meta.gameVersion, loader: meta.loader, loaderVersion: meta.loaderVersion }
    }

    try {
      const latestData = JSON.parse(fs.readFileSync(PROFILES_FILE_DL, 'utf-8'))
      const idx = latestData.profiles.findIndex(p => p.id === profileId)
      if (idx >= 0) {
        if (result.gameVersion)   latestData.profiles[idx].gameVersion   = result.gameVersion
        if (result.loader)        latestData.profiles[idx].loader        = result.loader
        if (result.loaderVersion) latestData.profiles[idx].loaderVersion = result.loaderVersion
        if (result.name)          latestData.profiles[idx].name          = result.name
        if (result.iconUrl) {
          latestData.profiles[idx].importIconUrl = result.iconUrl
          latestData.profiles[idx].importBgUrl   = result.iconUrl
        }
        const tmp2 = PROFILES_FILE_DL + '.tmp'
        fs.writeFileSync(tmp2, JSON.stringify(latestData, null, 2), { mode: 0o600 })
        fs.renameSync(tmp2, PROFILES_FILE_DL)
      }
    } catch {}

    try { fs.unlinkSync(tmpPath) } catch {}

    sendProgress({ phase: 'done', log: `Đã tạo profile "${meta.name}" thành công!`, percent: 100 })
    activeModpackDownloads.delete(win.webContents.id)
    return { ok: true, profileId, profileName: meta.name }
  } catch (err) {
    try { fs.unlinkSync(tmpPath) } catch {}
    activeModpackDownloads.delete(win.webContents.id)
    const isCancelled = err.message === 'Cancelled'
    if (isCancelled) {
      sendProgress({ phase: 'cancelled', log: 'Đã hủy tải xuống.', percent: 0 })
      return { cancelled: true }
    }
    sendProgress({ phase: 'error', log: `Lỗi import: ${err.message}`, percent: 0 })
    return { error: err.message }
  }
})

ipcMain.handle('settings:get', (e) => {
  if (!getTrustedWindow(e)) return DEFAULT_SETTINGS
  return readSettings()
})

ipcMain.handle('settings:isInitialSetupRequired', (e) => {
  if (!getTrustedWindow(e)) return false
  return !readSettings().initialSetupCompleted
})

ipcMain.handle('bg:pickFile', async (e) => {
  const win = getTrustedWindow(e)
  if (!win) return { error: 'Unauthorized' }
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog(win, {
    title: 'Chọn ảnh / GIF / video nền',
    buttonLabel: 'Chọn',
    properties: ['openFile'],
    filters: [
      { name: 'Hình ảnh & Video', extensions: ['png','jpg','jpeg','webp','bmp','gif','mp4','webm','mov','avi'] },
      { name: 'Hình ảnh', extensions: ['png','jpg','jpeg','webp','bmp','gif'] },
      { name: 'Video',    extensions: ['mp4','webm','mov','avi'] },
    ],
  })
  if (result.canceled || !result.filePaths.length) return { canceled: true }

  const srcPath = result.filePaths[0]
  const ext = path.extname(srcPath)
  const bgDir = path.join(ACCOUNTS_DIR, 'backgrounds')
  if (!fs.existsSync(bgDir)) fs.mkdirSync(bgDir, { recursive: true })

  const destName = `bg-${Date.now()}${ext}`
  const destPath = path.join(bgDir, destName)
  fs.copyFileSync(srcPath, destPath)

  return { ok: true, path: destPath }
})

ipcMain.handle('settings:save', (e, patch) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  if (!patch || typeof patch !== 'object') return { error: 'Dữ liệu không hợp lệ' }

  const safe = {}
  for (const key of SETTING_KEYS) {
    if (key in patch) safe[key] = patch[key]
  }

  const current = readSettings()
  const updated = { ...current, ...safe }
  writeSettings(updated)

  if ('discordRPC' in safe && safe.discordRPC !== current.discordRPC) {
    if (safe.discordRPC) { rpc.connect(); rpc.PRESETS.menu() }
    else rpc.disconnect()
  }

  return { ok: true, data: updated }
})

ipcMain.handle('system:boostMode', async (e, enable) => {
  if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
  if (process.platform !== 'win32') return { ok: true, skipped: true, reason: 'Windows only' }

  const { exec } = require('child_process')

  const BOOST_KILL_LIST = [
    'OneDrive.exe',
    'Teams.exe',
    'Slack.exe',
    'Spotify.exe',
    'Discord.exe',
    'EpicGamesLauncher.exe',
    'steam.exe',
    'GalaxyClient.exe',
    'upc.exe',
    'origin.exe',
    'OriginWebHelperService.exe',
    'SearchIndexer.exe',
    'SearchProtocolHost.exe',
    'SearchFilterHost.exe',
    'SgrmBroker.exe',
    'MsMpEng.exe',
    'NisSrv.exe',
    'SecurityHealthSystray.exe',
    'OneDriveSetup.exe',
    'SkypeApp.exe',
    'SkypeBridge.exe',
    'msedge.exe',
    'chrome.exe',
    'firefox.exe',
    'opera.exe',
    'brave.exe',
    'Cortana.exe',
    'WinStore.App.exe',
    'XboxApp.exe',
    'XboxGameBarWidgets.exe',
    'GameBar.exe',
    'GameBarFTServer.exe',
    'RiotClientServices.exe',
    'LeagueClient.exe',
    'valorant.exe',
    'EADesktop.exe',
    'BattleNet.exe',
    'Agent.exe',
  ]

  if (enable) {
    const killed = []
    const failed = []

    for (const proc of BOOST_KILL_LIST) {
      await new Promise(resolve => {
        exec(`taskkill /F /IM "${proc}" /T`, { windowsHide: true }, (err) => {
          if (!err) killed.push(proc)
          else failed.push(proc)
          resolve()
        })
      })
    }

    try {
      exec(`wmic process where ProcessId=${process.pid} CALL setpriority "above normal"`, { windowsHide: true })
    } catch {}

    return { ok: true, killed, failed }
  } else {
    return { ok: true, restored: true }
  }
})

