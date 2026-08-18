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

const https  = require('https')
const http   = require('http')
const fs     = require('fs')
const path   = require('path')
const zlib   = require('zlib')
const { pipeline } = require('stream')
const { promisify } = require('util')
const pipelineAsync = promisify(pipeline)

const JRE_MANIFEST_URL = 'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json'

function getJavaComponent(gameVersion) {
  const parts = gameVersion.split('.')
  const minor = parseInt(parts[1] || '0', 10)

  if (minor <= 16) return 'jre-legacy'
  if (minor <= 20) return 'java-runtime-gamma'
  return 'java-runtime-delta'
}

function getJavaVersion(component) {
  if (component === 'jre-legacy')         return '8'
  if (component === 'java-runtime-gamma') return '17'
  return '21'
}

function getMojangPlatform() {
  const arch = process.arch === 'x64' ? 'x64' : 'x86'
  switch (process.platform) {
    case 'win32':  return `windows-${arch}`
    case 'darwin': return process.arch === 'arm64' ? 'mac-os-arm64' : 'mac-os'
    case 'linux':  return `linux${arch === 'x86' ? '-i386' : ''}`
    default:       return 'linux'
  }
}

function getJavaExecutable(javaDir) {
  if (process.platform === 'win32') return path.join(javaDir, 'bin', 'java.exe')
  return path.join(javaDir, 'bin', 'java')
}

function httpsGetRaw(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGetRaw(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('Invalid JSON')) }
      })
    }).on('error', reject)
  })
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const dir = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))

      const total = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0
      const out = fs.createWriteStream(destPath)

      res.on('data', chunk => {
        downloaded += chunk.length
        onProgress?.({ downloaded, total })
      })
      res.pipe(out)
      out.on('finish', resolve)
      out.on('error', reject)
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function extractTarGz(tarPath, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

  const { spawn } = require('child_process')
  return new Promise((resolve, reject) => {
    const tar = spawn('tar', ['-xzf', tarPath, '-C', destDir, '--strip-components=1'], {
      stdio: 'pipe',
    })
    tar.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`tar exit code ${code}`))
    })
    tar.on('error', reject)
  })
}

async function extractZip(zipPath, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

  const { spawn } = require('child_process')
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell', [
      '-NoProfile', '-Command',
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`,
    ], { stdio: 'pipe' })
    ps.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`PowerShell exit code ${code}`))
    })
    ps.on('error', reject)
  })
}

async function ensureJava(gameVersion, runtimesDir, onProgress, versionJson) {
  const component   = versionJson?.javaVersion?.component || getJavaComponent(gameVersion)
  const javaVersion = versionJson?.javaVersion?.majorVersion
    ? String(versionJson.javaVersion.majorVersion)
    : getJavaVersion(component)
  const javaDir     = path.join(runtimesDir, component)
  const javaExe     = getJavaExecutable(javaDir)

  onProgress?.({ phase: 'java_check', component, javaVersion })

  if (fs.existsSync(javaExe)) {
    onProgress?.({ phase: 'java_ready', component, javaVersion, path: javaExe })
    return javaExe
  }

  onProgress?.({ phase: 'java_fetch_manifest', component, javaVersion })

  const allManifest = await httpsGetRaw(JRE_MANIFEST_URL)
  const platform    = getMojangPlatform()
  const platformData = allManifest[platform]
  if (!platformData) throw new Error(`Platform not supported: ${platform}`)

  const componentData = platformData[component]
  if (!componentData || !componentData.length) {
    throw new Error(`Java ${javaVersion} (${component}) not found for ${platform}`)
  }

  const manifest = componentData[0].manifest
  onProgress?.({ phase: 'java_fetch_files', component, javaVersion })

  const fileManifest = await httpsGetRaw(manifest.url)
  const files = Object.entries(fileManifest.files)

  let done = 0
  const total = files.length

  for (const [filePath, fileData] of files) {
    if (fileData.type === 'directory') {
      const dir = path.join(javaDir, filePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      done++
      continue
    }

    if (fileData.type !== 'file' || !fileData.downloads?.raw) {
      done++
      continue
    }

    const destPath = path.join(javaDir, filePath)
    const destDir  = path.dirname(destPath)
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath)
      if (stat.size === fileData.downloads.raw.size) {
        done++
        onProgress?.({ phase: 'java_download', component, javaVersion, done, total, file: filePath })
        continue
      }
    }

    await downloadFile(fileData.downloads.raw.url, destPath, null)

    if (process.platform !== 'win32' && fileData.executable) {
      try { fs.chmodSync(destPath, 0o755) } catch {}
    }

    done++
    onProgress?.({ phase: 'java_download', component, javaVersion, done, total, file: filePath, percent: Math.round(done / total * 100) })
  }

  if (!fs.existsSync(javaExe)) {
    throw new Error(`Java executable not found after download: ${javaExe}`)
  }

  onProgress?.({ phase: 'java_ready', component, javaVersion, path: javaExe })
  return javaExe
}

module.exports = { ensureJava, getJavaComponent, getJavaVersion, findJavaInstallations }

async function findJavaInstallations() {
  const { execFile } = require('child_process')
  const results = []
  const seen = new Set()

  async function tryJava(javaPath) {
    if (!javaPath || seen.has(javaPath)) return
    if (!fs.existsSync(javaPath)) return
    seen.add(javaPath)
    return new Promise(resolve => {
      execFile(javaPath, ['-version'], { timeout: 3000 }, (err, stdout, stderr) => {
        const output = stderr || stdout || ''

        const match = output.match(/version "([^"]+)"/)
        const version = match ? match[1] : null
        const major = version ? parseInt(version.split('.')[0] === '1' ? version.split('.')[1] : version.split('.')[0], 10) : null
        results.push({ path: javaPath, version: major ? String(major) : version || '?', fullVersion: version || '?' })
        resolve()
      })
    })
  }

  const promises = []

  const { app } = require('electron')
  const runtimesDir = path.join(app.getPath('appData'), '.DinoIsekai', 'runtimes')
  if (fs.existsSync(runtimesDir)) {
    for (const comp of fs.readdirSync(runtimesDir)) {
      const exe = getJavaExecutable(path.join(runtimesDir, comp))
      promises.push(tryJava(exe))
    }
  }

  if (process.env.JAVA_HOME) {
    const exe = process.platform === 'win32'
      ? path.join(process.env.JAVA_HOME, 'bin', 'java.exe')
      : path.join(process.env.JAVA_HOME, 'bin', 'java')
    promises.push(tryJava(exe))
  }

  if (process.platform === 'win32') {
    const roots = [
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\BellSoft',
      'C:\\Program Files\\Zulu',
    ]
    for (const root of roots) {
      if (!fs.existsSync(root)) continue
      for (const sub of fs.readdirSync(root)) {
        promises.push(tryJava(path.join(root, sub, 'bin', 'java.exe')))
      }
    }
  }

  if (process.platform === 'darwin') {
    const roots = ['/Library/Java/JavaVirtualMachines', '/usr/local/opt']
    for (const root of roots) {
      if (!fs.existsSync(root)) continue
      for (const sub of fs.readdirSync(root)) {
        promises.push(tryJava(path.join(root, sub, 'Contents', 'Home', 'bin', 'java')))
        promises.push(tryJava(path.join(root, sub, 'bin', 'java')))
      }
    }
  }

  if (process.platform === 'linux') {
    const roots = ['/usr/lib/jvm', '/usr/java']
    for (const root of roots) {
      if (!fs.existsSync(root)) continue
      for (const sub of fs.readdirSync(root)) {
        promises.push(tryJava(path.join(root, sub, 'bin', 'java')))
      }
    }
  }

  await Promise.allSettled(promises)

  return results.sort((a, b) => {
    const aManaged = a.path.includes('.DinoIsekai')
    const bManaged = b.path.includes('.DinoIsekai')
    if (aManaged !== bManaged) return aManaged ? -1 : 1
    return parseInt(b.version) - parseInt(a.version)
  })
}

