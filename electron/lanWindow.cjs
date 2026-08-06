/**
 * Dino Isekai — Minecraft Launcher
 * Created by FoxStudio. AI-assisted development.
 *
 * LAN Share Window — cửa sổ riêng hiện địa chỉ tunnel khi mở LAN world
 */

'use strict'

const { BrowserWindow, ipcMain, nativeImage, shell } = require('electron')
const path = require('path')
const fs   = require('fs')
const { app } = require('electron')

let _setLanWindowRef = null
function injectSetLanWindowRef(fn) { _setLanWindowRef = fn }

const isDev = process.env.NODE_ENV === 'development'

let lanWindow = null

function resolveIconPath() {
  const devPath = path.join(__dirname, '../public/icon.ico')
  if (isDev && fs.existsSync(devPath)) return devPath
  const resourcesIcon = path.join(process.resourcesPath, 'icon.ico')
  if (fs.existsSync(resourcesIcon)) return resourcesIcon
  return devPath
}

const ICON_PATH = resolveIconPath()

const ALLOWED_ORIGINS = isDev ? ['http://localhost:5173'] : ['file://']

function isTrustedOrigin(url) {
  try {
    const u = new URL(url)
    if (!isDev && u.protocol === 'file:') return true
    if (ALLOWED_ORIGINS.some(o => url.startsWith(o))) return true
    return false
  } catch { return false }
}

/**
 * @param {{ motd: string, port: number, tunnelAddr: string }} info
 */
function openLanWindow(info) {
  if (lanWindow && !lanWindow.isDestroyed()) {
    lanWindow.webContents.send('lan:windowData', info)
    lanWindow.show()
    lanWindow.focus()
    return
  }

  const icon = fs.existsSync(ICON_PATH) ? nativeImage.createFromPath(ICON_PATH) : undefined

  lanWindow = new BrowserWindow({
    width:           480,
    height:          520,
    resizable:       false,
    frame:           false,
    transparent:     false,
    backgroundColor: '#0f0f0f',
    title:           'Dino Isekai – LAN World Share',
    icon,
    skipTaskbar:     false,
    alwaysOnTop:     false,  
    webPreferences: {
      preload:                    path.join(__dirname, 'preload.cjs'),
      contextIsolation:           true,
      nodeIntegration:            false,
      nodeIntegrationInWorker:    false,
      nodeIntegrationInSubFrames: false,
      webSecurity:                true,
      allowRunningInsecureContent: false,
    },
  })

  lanWindow.webContents.on('will-navigate', (e, url) => {
    if (!isTrustedOrigin(url)) { e.preventDefault(); shell.openExternal(url) }
  })
  lanWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url); return { action: 'deny' }
  })

  if (!isDev) {
    lanWindow.webContents.on('devtools-opened', () => {
      lanWindow.webContents.closeDevTools()
    })
  }

  if (_setLanWindowRef) {
    _setLanWindowRef({
      send: (event, data) => {
        if (lanWindow && !lanWindow.isDestroyed()) {
          lanWindow.webContents.send(event, data)
        }
      }
    })
  }

  if (isDev) {
    lanWindow.loadURL('http://localhost:5173/?window=lan')
  } else {
    lanWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { window: 'lan' } })
  }

  lanWindow.webContents.once('did-finish-load', () => {
    if (!lanWindow.isDestroyed()) {
      lanWindow.webContents.send('lan:windowData', info)
    }

    // Gửi lại trạng thái tunnel hiện tại, retry nhiều lần để đảm bảo React đã mount
    const { getTunnelState } = require('./lanScanner.cjs')
    let retries = 0
    const iv = setInterval(() => {
      retries++
      if (!lanWindow || lanWindow.isDestroyed()) { clearInterval(iv); return }
      const state = getTunnelState()
      lanWindow.webContents.send('lan:windowData', {
        ...info,
        tunnelAddr: state.tunnelAddr || info.tunnelAddr || null,
      })
      if (state.tunnelStatus && state.tunnelStatus !== 'idle') {
        lanWindow.webContents.send('lan:tunnelStatus', {
          status: state.tunnelStatus,
          addr:   state.tunnelAddr,
          log:    null,
        })
      }
      if (retries >= 5) clearInterval(iv)
    }, 300)
  })

  lanWindow.on('closed', () => {
    if (_setLanWindowRef) _setLanWindowRef(null)
    lanWindow = null
  })
}

function closeLanWindow() {
  if (lanWindow && !lanWindow.isDestroyed()) {
    lanWindow.close()
    lanWindow = null
  }
}

function registerLanWindowHandlers(getTrustedWindow) {
  ipcMain.on('lan:closeWindow', () => {
    closeLanWindow()
  })

  ipcMain.on('lan:forwardToWindow', (_e, event, data) => {
    if (lanWindow && !lanWindow.isDestroyed()) {
      lanWindow.webContents.send(event, data)
    }
  })
}

module.exports = { openLanWindow, closeLanWindow, registerLanWindowHandlers, injectSetLanWindowRef }
