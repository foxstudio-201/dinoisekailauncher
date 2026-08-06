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

const https = require('https')
const http  = require('http')
const fs    = require('fs')
const path  = require('path')
const { execFile } = require('child_process')

const MC_JAVA_VERSIONS = [8, 11, 17, 21, 25]

function httpsGet(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, {
      headers: {
        'User-Agent': 'DinoIsekai/1.0',
        'Accept': 'application/json',

        'X-GitHub-Api-Version': '2022-11-28',
      },
      timeout,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location, timeout).then(resolve).catch(reject)
      }
      let body = ''
      res.on('data', c => { body += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return resolve(null)
        try { resolve(JSON.parse(body)) } catch { resolve(null) }
      })
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}

function getPlatformArch() {
  const os   = process.platform
  const arch = process.arch
  return { os, arch }
}

function getJavaExe(javaDir) {
  return process.platform === 'win32'
    ? path.join(javaDir, 'bin', 'java.exe')
    : path.join(javaDir, 'bin', 'java')
}

async function fetchAdoptiumVersions() {
  const { os, arch } = getPlatformArch()
  const adoptiumOS   = os === 'win32' ? 'windows' : os === 'darwin' ? 'mac' : 'linux'
  const adoptiumArch = arch === 'x64' ? 'x64' : arch === 'arm64' ? 'aarch64' : 'x86'

  const results = []
  await Promise.allSettled(MC_JAVA_VERSIONS.map(async (ver) => {
    const url = `https://api.adoptium.net/v3/assets/latest/${ver}/hotspot?architecture=${adoptiumArch}&image_type=jre&os=${adoptiumOS}&vendor=eclipse`
    const data = await httpsGet(url)
    if (!data || !Array.isArray(data) || data.length === 0) return

    const release = data[0]
    const binary  = release.binary
    if (!binary?.package) return

    results.push({
      distro:      'adoptium',
      javaVersion: ver,
      releaseVersion: release.release_name || `temurin-${ver}`,
      downloadUrl: binary.package.link,
      size:        binary.package.size || 0,
      checksum:    binary.package.checksum || null,
      fileName:    binary.package.name,
      isZip:       binary.package.name?.endsWith('.zip'),
    })
  }))

  return results.sort((a, b) => b.javaVersion - a.javaVersion)
}

async function fetchAzulVersions() {
  const { os, arch } = getPlatformArch()
  const azulOS   = os === 'win32' ? 'windows' : os === 'darwin' ? 'macos' : 'linux'
  const azulArch = arch === 'x64' ? 'x86_64' : arch === 'arm64' ? 'aarch64' : 'i686'

  const results = []
  await Promise.allSettled(MC_JAVA_VERSIONS.map(async (ver) => {
    const url = `https://api.azul.com/metadata/v1/zulu/packages/?java_version=${ver}&os=${azulOS}&arch=${azulArch}&java_package_type=jre&release_status=ga&availability_types=CA&certifications=tck&page=1&page_size=1`
    const data = await httpsGet(url)
    if (!data || !Array.isArray(data) || data.length === 0) return

    const pkg = data[0]
    if (!pkg?.download_url) return

    results.push({
      distro:      'azul',
      javaVersion: ver,
      releaseVersion: pkg.name || `zulu-${ver}`,
      downloadUrl: pkg.download_url,
      size:        pkg.size || 0,
      checksum:    pkg.sha256_hash || null,
      fileName:    pkg.name,
      isZip:       pkg.name?.endsWith('.zip'),
    })
  }))

  return results.sort((a, b) => b.javaVersion - a.javaVersion)
}

async function fetchGraalVMVersions() {
  const { os, arch } = getPlatformArch()
  const graalOS   = os === 'win32' ? 'windows' : os === 'darwin' ? 'macos' : 'linux'
  const graalArch = arch === 'arm64' ? 'aarch64' : 'x64'
  const ext       = os === 'win32' ? 'zip' : 'tar.gz'

  const graalVersions = [
    { javaVersion: 25, tagPrefix: 'jdk-25.' },
    { javaVersion: 21, tagPrefix: 'jdk-21.' },
    { javaVersion: 17, tagPrefix: 'jdk-17.' },
  ]

  const allReleases = await httpsGet('https://api.github.com/repos/graalvm/graalvm-ce-builds/releases?per_page=30')
  if (!Array.isArray(allReleases)) return []

  const results = []

  for (const { javaVersion, tagPrefix } of graalVersions) {

    const release = allReleases.find(r => r.tag_name?.startsWith(tagPrefix))
    if (!release?.assets) continue

    const extEscaped = ext === 'tar.gz' ? 'tar\\.gz' : 'zip'
    const pattern = new RegExp(
      `graalvm-community-jdk-${javaVersion}[^_]*_${graalOS}-${graalArch}_bin\\.${extEscaped}$`,
      'i'
    )
    const asset = release.assets.find(a => pattern.test(a.name))
    if (!asset) continue

    results.push({
      distro:         'graalvm',
      javaVersion,
      releaseVersion: release.tag_name,
      downloadUrl:    asset.browser_download_url,
      size:           asset.size || 0,
      checksum:       null,
      fileName:       asset.name,
      isZip:          asset.name.endsWith('.zip'),
      isTarGz:        asset.name.endsWith('.tar.gz'),
    })
  }

  return results.sort((a, b) => b.javaVersion - a.javaVersion)
}

async function fetchAllDistros() {
  const [adoptium, azul, graalvm] = await Promise.allSettled([
    fetchAdoptiumVersions(),
    fetchAzulVersions(),
    fetchGraalVMVersions(),
  ])

  return {
    adoptium: adoptium.status === 'fulfilled' ? adoptium.value : [],
    azul:     azul.status     === 'fulfilled' ? azul.value     : [],
    graalvm:  graalvm.status  === 'fulfilled' ? graalvm.value  : [],
  }
}

async function installDistro(pkg, installBaseDir, onProgress) {
  const { distro, javaVersion, fileName, downloadUrl, isZip, isTarGz } = pkg

  const installDir = path.join(installBaseDir, `${distro}-${javaVersion}`)
  const javaExe    = getJavaExe(installDir)

  if (fs.existsSync(javaExe)) {
    onProgress?.({ phase: 'already_installed', percent: 100 })
    return javaExe
  }

  const tmpDir  = path.join(path.dirname(installBaseDir), '.jre-tmp')
  const tmpFile = path.join(tmpDir, fileName || `java-${distro}-${javaVersion}.archive`)
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  onProgress?.({ phase: 'downloading', percent: 0, downloaded: 0, total: pkg.size || 0 })

  await new Promise((resolve, reject) => {
    const client = downloadUrl.startsWith('https') ? https : http
    const startTime = Date.now()
    let lastBytes = 0

    function doGet(url) {
      client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doGet(res.headers.location)
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))

        const total = parseInt(res.headers['content-length'] || String(pkg.size || 0), 10)
        let downloaded = 0
        const out = fs.createWriteStream(tmpFile)

        res.on('data', chunk => {
          downloaded += chunk.length
          const elapsed = (Date.now() - startTime) / 1000
          const speed   = elapsed > 0 ? Math.round((downloaded - lastBytes) / elapsed) : 0
          lastBytes = downloaded
          onProgress?.({
            phase: 'downloading',
            percent: total > 0 ? Math.round(downloaded / total * 100) : 0,
            downloaded,
            total,
            speed,
          })
        })
        res.pipe(out)
        out.on('finish', resolve)
        out.on('error', reject)
        res.on('error', reject)
      }).on('error', reject)
    }
    doGet(downloadUrl)
  })

  onProgress?.({ phase: 'extracting', percent: 0 })
  if (!fs.existsSync(installDir)) fs.mkdirSync(installDir, { recursive: true })

  if (isZip || fileName?.endsWith('.zip')) {
    await extractZip(tmpFile, installDir)
  } else {
    await extractTarGz(tmpFile, installDir)
  }

  try { fs.unlinkSync(tmpFile) } catch {}

  if (process.platform !== 'win32') {
    try { fs.chmodSync(javaExe, 0o755) } catch {}
  }

  if (!fs.existsSync(javaExe)) {
    const subDirs = fs.readdirSync(installDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
    for (const sub of subDirs) {
      const candidate = getJavaExe(path.join(installDir, sub.name))
      if (fs.existsSync(candidate)) {
        const subPath = path.join(installDir, sub.name)
        const entries = fs.readdirSync(subPath)
        for (const entry of entries) {
          fs.renameSync(path.join(subPath, entry), path.join(installDir, entry))
        }
        try { fs.rmdirSync(subPath) } catch {}
        break
      }
    }
  }

  if (!fs.existsSync(javaExe)) {
    throw new Error(`Java executable not found after extraction: ${javaExe}`)
  }

  try {
    fs.writeFileSync(
      path.join(installDir, '.vxc-java-meta.json'),
      JSON.stringify({ distro, javaVersion, releaseVersion: pkg.releaseVersion, installedAt: new Date().toISOString() }, null, 2),
      { encoding: 'utf-8' }
    )
  } catch {}

  onProgress?.({ phase: 'done', percent: 100 })
  return javaExe
}

function deleteDistro(installDir) {
  if (fs.existsSync(installDir)) {
    fs.rmSync(installDir, { recursive: true, force: true })
    return true
  }
  return false
}

function isDistroInstalled(installDir) {
  return fs.existsSync(getJavaExe(installDir))
}

function getProfileJreInfo(instancePath) {
  const jreDir = path.join(instancePath, 'jre')
  if (!fs.existsSync(jreDir)) return null
  const javaExe = getJavaExe(jreDir)
  if (!fs.existsSync(javaExe)) return null

  const metaPath = path.join(jreDir, '.vxc-java-meta.json')
  let meta = {}
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) } catch {}

  return { javaExe, jreDir, ...meta }
}

function getAllInstalledJavas(baseDir) {
  // baseDir có thể là global runtimes dir hoặc per-profile jre dir
  if (!fs.existsSync(baseDir)) return []

  const results = []

  // Quét tất cả subfolder — mỗi subfolder là 1 java installation (vd: adoptium-21, graalvm-25)
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const subDir = path.join(baseDir, entry.name)
      const subExe = getJavaExe(subDir)
      if (!fs.existsSync(subExe)) continue
      const metaPath = path.join(subDir, '.vxc-java-meta.json')
      let meta = {}
      try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) } catch {}
      results.push({ javaExe: subExe, jreDir: subDir, folderName: entry.name, ...meta })
    }
  } catch {}

  // Cũng check chính baseDir (trường hợp java được extract thẳng vào baseDir)
  const baseExe = getJavaExe(baseDir)
  if (fs.existsSync(baseExe)) {
    const metaPath = path.join(baseDir, '.vxc-java-meta.json')
    let meta = {}
    try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) } catch {}
    results.push({ javaExe: baseExe, jreDir: baseDir, folderName: path.basename(baseDir), ...meta })
  }

  return results
}

async function extractZip(zipPath, destDir) {
  const { spawn } = require('child_process')
  if (process.platform === 'win32') {
    return new Promise((resolve, reject) => {
      const ps = spawn('powershell', [
        '-NoProfile', '-Command',
        `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`,
      ], { stdio: 'pipe' })
      ps.on('close', code => code === 0 ? resolve() : reject(new Error(`PowerShell exit ${code}`)))
      ps.on('error', reject)
    })
  } else {
    return new Promise((resolve, reject) => {
      const proc = spawn('unzip', ['-o', zipPath, '-d', destDir], { stdio: 'pipe' })
      proc.on('close', code => code === 0 ? resolve() : reject(new Error(`unzip exit ${code}`)))
      proc.on('error', reject)
    })
  }
}

async function extractTarGz(tarPath, destDir) {
  const { spawn } = require('child_process')
  return new Promise((resolve, reject) => {
    const tar = spawn('tar', ['-xzf', tarPath, '-C', destDir, '--strip-components=1'], { stdio: 'pipe' })
    tar.on('close', code => code === 0 ? resolve() : reject(new Error(`tar exit ${code}`)))
    tar.on('error', reject)
  })
}

module.exports = {
  fetchAllDistros,
  installDistro,
  deleteDistro,
  isDistroInstalled,
  getProfileJreInfo,
  getAllInstalledJavas,
  getJavaExe,
  MC_JAVA_VERSIONS,
}

