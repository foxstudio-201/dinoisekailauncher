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
const { execSync } = require('child_process')
const crypto       = require('crypto')
const fs           = require('fs')
const path         = require('path')
const os           = require('os')
const { app }      = require('electron')

let APP_SECRET, APP_ID
try {
  const s = require('./app-secret.cjs')
  APP_SECRET = s.secret
  APP_ID     = s.appId
} catch {
  APP_SECRET = crypto.randomBytes(32).toString('hex')
  APP_ID     = 'com.dinoisekai.launcher'
}

function run(cmd) {
  try {
    return execSync(cmd, { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim()
  } catch { return '' }
}

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex')
}

function deriveKey(entropy) {
  const password = Buffer.from(APP_SECRET + APP_ID + entropy, 'utf8')
  const salt     = Buffer.from(sha256(APP_ID + entropy).slice(0, 32), 'hex')
  return crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha256')
}

function encrypt(plaintext, key) {
  const iv         = crypto.randomBytes(12)
  const cipher     = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag    = cipher.getAuthTag()
  const magic      = Buffer.from([0x56, 0x58, 0x43, 0x01]) 
  return Buffer.concat([magic, iv, authTag, encrypted])
}

function decrypt(buf, key) {
  if (buf.length < 32) return null
  const magic = buf.slice(0, 4)
  if (!magic.equals(Buffer.from([0x56, 0x58, 0x43, 0x01]))) return null
  const iv         = buf.slice(4, 16)
  const authTag    = buf.slice(16, 32)
  const ciphertext = buf.slice(32)
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch { return null }
}

function collectWindows() {
  const parts = []
  const cpu = run('wmic cpu get ProcessorId /value')
  const cpuMatch = cpu.match(/ProcessorId=(.+)/i)
  if (cpuMatch?.[1]?.trim()) parts.push('cpu:' + cpuMatch[1].trim())

  const mb = run('wmic baseboard get SerialNumber /value')
  const mbMatch = mb.match(/SerialNumber=(.+)/i)
  if (mbMatch?.[1]?.trim() && mbMatch[1].trim() !== 'To be filled by O.E.M.') {
    parts.push('mb:' + mbMatch[1].trim())
  }

  const disk = run('wmic diskdrive where "Index=0" get SerialNumber /value')
  const diskMatch = disk.match(/SerialNumber=(.+)/i)
  if (diskMatch?.[1]?.trim()) parts.push('disk:' + diskMatch[1].trim())

  return parts
}

function collectLinux() {
  const parts = []
  const machineId = run('cat /etc/machine-id')
  if (machineId) parts.push('mid:' + machineId)

  const cpuInfo = run("cat /proc/cpuinfo | grep 'Serial' | head -1")
  const cpuMatch = cpuInfo.match(/Serial\s*:\s*(.+)/i)
  if (cpuMatch?.[1]?.trim()) parts.push('cpu:' + cpuMatch[1].trim())

  const board = run('cat /sys/class/dmi/id/board_serial 2>/dev/null')
  if (board && board !== 'None' && board !== 'To be filled by O.E.M.') {
    parts.push('mb:' + board)
  }
  return parts
}

function collectMac() {
  const parts = []
  const hwUuid = run("system_profiler SPHardwareDataType | awk '/Hardware UUID/{print $3}'")
  if (hwUuid) parts.push('uuid:' + hwUuid)

  const serial = run("system_profiler SPHardwareDataType | awk '/Serial Number/{print $4}'")
  if (serial) parts.push('serial:' + serial)
  return parts
}

function getFirstMac() {
  try {
    const ifaces = os.networkInterfaces()
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          return 'mac:' + iface.mac
        }
      }
    }
  } catch {}
  return ''
}

function getMachineEntropy() {
  const mac = getFirstMac()
  const hostname = os.hostname()
  return sha256(mac + hostname + process.platform).slice(0, 16)
}

function getFallbackId() {
  const dataDir  = app.getPath('appData')
  const vxcDir   = path.join(dataDir, '.DinoIsekai')
  const hwidFile = path.join(vxcDir, 'hwid.dat')

  const entropy = getMachineEntropy()
  const key     = deriveKey(entropy)

  try {
    if (fs.existsSync(hwidFile)) {
      const buf     = fs.readFileSync(hwidFile)
      const decoded = decrypt(buf, key)
      if (decoded && /^[0-9a-f]{32}$/.test(decoded.trim())) {
        return decoded.trim()
      }
    }
  } catch {}

  const newId    = crypto.randomUUID().replace(/-/g, '')
  const encrypted = encrypt(newId, key)

  try {
    if (!fs.existsSync(vxcDir)) fs.mkdirSync(vxcDir, { recursive: true })
    fs.writeFileSync(hwidFile, encrypted)
    if (process.platform !== 'win32') {
      fs.chmodSync(hwidFile, 0o600)
    }
  } catch {}

  return newId
}

let _cachedHwid = null

function getHwid() {
  if (_cachedHwid) return _cachedHwid

  const parts = []
  try {
    if (process.platform === 'win32')       parts.push(...collectWindows())
    else if (process.platform === 'linux')  parts.push(...collectLinux())
    else if (process.platform === 'darwin') parts.push(...collectMac())
  } catch {}

  const mac = getFirstMac()
  if (mac) parts.push(mac)

  if (parts.length >= 2) {
    const raw   = parts.sort().join('|')
    _cachedHwid = sha256(raw).slice(0, 32)
  } else {
    _cachedHwid = getFallbackId()
  }

  return _cachedHwid
}

function getHwidFormatted() {
  const h = getHwid()
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`
}

module.exports = { getHwid, getHwidFormatted }
