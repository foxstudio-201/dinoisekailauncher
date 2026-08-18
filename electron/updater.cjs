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

const { app } = require('electron')
const path = require('path')
const https = require('https')
const fs = require('fs')
const os = require('os')

const REPO = 'foxstudio-201/dinoisekailauncher'
let BUILTIN_TOKEN = ''
try { BUILTIN_TOKEN = require('./build-env.cjs').GITHUB_TOKEN || '' } catch {}
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || BUILTIN_TOKEN || ''

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

function compareVersions(a, b) {
  const pa = String(a || '').split('.').map(Number)
  const pb = String(b || '').split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0
    const y = pb[i] || 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

async function getLatestRelease() {
  return httpGetJson(`https://api.github.com/repos/${REPO}/releases/latest`)
}

async function checkUpdate() {
  if (process.platform !== 'win32') return { ok: true, supported: false }
  try {
    const release = await getLatestRelease()
    const current = app.getVersion() || '0.0.0'
    const latest = String(release.tag_name || '').replace(/^v/i, '')
    const asset = (release.assets || []).find(a => /Setup.*\.exe$/i.test(a.name))
    const hasUpdate = compareVersions(latest, current) > 0
    return {
      ok: true,
      supported: true,
      hasUpdate,
      current,
      latest,
      assetName: asset?.name,
      assetSize: asset?.size,
      assetUrl: asset?.browser_download_url,
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'Dino-Isekai-Launcher', Accept: 'application/octet-stream' }
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`
    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject)
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
        if (total > 0 && downloaded !== total) {
          return reject(new Error(`File tải không đầy đủ (${downloaded}/${total} bytes)`))
        }
        resolve(destPath)
      })
      ws.on('error', reject)
      res.on('error', reject)
    })
    req.on('error', reject)
  })
}

async function downloadUpdateToTemp(url, onProgress) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dino-update-'))
  const dest = path.join(dir, 'dino-isekai-setup.exe')
  await downloadFile(url, dest, onProgress)
  return dest
}

function installUpdate(installerPath) {
  const { spawn } = require('child_process')
  const child = spawn(installerPath, [], { detached: true, stdio: 'ignore' })
  child.unref()
}

module.exports = { checkUpdate, downloadUpdateToTemp, installUpdate }
