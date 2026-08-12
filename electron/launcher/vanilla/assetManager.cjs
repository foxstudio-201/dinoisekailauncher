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
const crypto = require('crypto')

const RESOURCES_URL = 'https://resources.download.minecraft.net'
const LIBRARIES_URL = 'https://libraries.minecraft.net'

function sha1File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1')
    const stream = fs.createReadStream(filePath)
    stream.on('data', d => hash.update(d))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const client  = url.startsWith('https') ? https : http
    const tmpPath = destPath + '.' + process.pid + '.tmp'
    const destDir = path.dirname(destPath)

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

    client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
      }

      const total = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0
      const out = fs.createWriteStream(tmpPath)

      res.on('data', chunk => {
        downloaded += chunk.length
        onProgress?.({ downloaded, total, speed: 0 })
      })
      res.pipe(out)
      out.on('finish', () => {

        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
        try {
          fs.renameSync(tmpPath, destPath)
          resolve()
        } catch {

          try {
            fs.copyFileSync(tmpPath, destPath)
            try { fs.unlinkSync(tmpPath) } catch {}
            resolve()
          } catch (copyErr) {

            if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
              try { fs.unlinkSync(tmpPath) } catch {}
              resolve()
            } else {
              try { fs.unlinkSync(tmpPath) } catch {}
              reject(copyErr)
            }
          }
        }
      })
      out.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {} reject(err) })
      res.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {} reject(err) })
    }).on('error', reject)
  })
}

let _fastVerify = false

async function needsDownload(filePath, expectedSha1, expectedSize) {
  if (!fs.existsSync(filePath)) return true
  const stat = fs.statSync(filePath)
  if (expectedSize && stat.size !== expectedSize) return true
  if (!_fastVerify && expectedSha1) {
    const actual = await sha1File(filePath)
    if (actual !== expectedSha1) return true
  }
  return false
}

function getCurrentOS() {
  switch (process.platform) {
    case 'win32':  return 'windows'
    case 'darwin': return 'osx'
    default:       return 'linux'
  }
}

function libraryApplies(lib) {
  if (!lib.rules) return true
  let allow = false
  for (const rule of lib.rules) {
    const osMatches = !rule.os || rule.os.name === getCurrentOS()

    if (osMatches) {
      allow = rule.action === 'allow'
    }

  }
  return allow
}

async function downloadQueue(tasks, concurrency, onEach) {
  let idx = 0
  let done = 0
  const total = tasks.length

  async function worker() {
    while (idx < tasks.length) {
      const task = tasks[idx++]
      await task()
      done++
      onEach?.(done, total)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker)
  await Promise.all(workers)
}

class SpeedTracker {
  constructor() {
    this.bytes = 0
    this.lastBytes = 0
    this.lastTime = Date.now()
    this.speed = 0
  }
  add(bytes) { this.bytes += bytes }
  tick() {
    const now = Date.now()
    const dt = (now - this.lastTime) / 1000
    if (dt >= 0.5) {
      this.speed = (this.bytes - this.lastBytes) / dt
      this.lastBytes = this.bytes
      this.lastTime = now
    }
    return this.speed
  }
}

async function downloadAssets(versionJson, launcherDir, onProgress, opts) {
  _fastVerify = opts?.fastVerify === true
  const os = getCurrentOS()
  const versionsDir  = path.join(launcherDir, 'versions', versionJson.id)
  const librariesDir = path.join(launcherDir, 'libraries')
  const assetsDir    = path.join(launcherDir, 'assets')
  const nativesDir   = path.join(versionsDir, 'natives')
  const markerPath   = path.join(versionsDir, '.assets.ready')

  if (opts?.skipIfReady !== false && fs.existsSync(markerPath)) {
    const clientJar = path.join(versionsDir, `${versionJson.id}.jar`)
    const nativesOk = fs.existsSync(nativesDir) && fs.readdirSync(nativesDir).length > 0
    if (fs.existsSync(clientJar) && nativesOk) {
      const libPaths = []
      for (const lib of (versionJson.libraries || [])) {
        if (!libraryApplies(lib)) continue
        const artifact = lib.downloads?.artifact
        if (artifact) {
          if (!artifact.path.includes('natives-')) libPaths.push(path.join(librariesDir, artifact.path))
        } else if (lib.name) {
          const rel = mavenNameToPath(lib.name)
          if (rel) libPaths.push(path.join(librariesDir, rel))
        }
      }
      _fastVerify = false
      onProgress?.({ phase: 'done', doneFiles: 1, totalFiles: 1, log: 'Assets đã sẵn sàng (bỏ qua kiểm tra)' })
      return { clientJar, libraries: libPaths, nativesDir, assetsDir, assetIndex: versionJson.assetIndex?.id || null, skipped: true }
    }
  }

  if (!fs.existsSync(versionsDir))  fs.mkdirSync(versionsDir,  { recursive: true })
  if (!fs.existsSync(librariesDir)) fs.mkdirSync(librariesDir, { recursive: true })
  if (!fs.existsSync(assetsDir))    fs.mkdirSync(assetsDir,    { recursive: true })
  if (!fs.existsSync(nativesDir))   fs.mkdirSync(nativesDir,   { recursive: true })

  const speedTracker = new SpeedTracker()
  let totalFiles = 0
  let doneFiles  = 0

  function emit(phase, extra = {}) {
    const speed = speedTracker.tick()
    onProgress?.({ phase, doneFiles, totalFiles, speed, ...extra })
  }

  const clientJar = path.join(versionsDir, `${versionJson.id}.jar`)
  const clientDl  = versionJson.downloads?.client
  if (clientDl) {
    emit('client_jar', { log: `Checking client.jar...` })
    if (await needsDownload(clientJar, clientDl.sha1, clientDl.size)) {
      emit('client_jar', { log: `Downloading client.jar (${(clientDl.size / 1024 / 1024).toFixed(1)} MB)...` })
      await downloadFile(clientDl.url, clientJar, ({ downloaded, total }) => {
        speedTracker.add(downloaded)
        emit('client_jar', { downloaded, total, log: `client.jar ${(downloaded/1024/1024).toFixed(1)}/${(total/1024/1024).toFixed(1)} MB` })
      })
    }
  }

  const libs = (versionJson.libraries || []).filter(libraryApplies)
  const libPaths = []
  const libTasks = []

  function mavenNameToPath(name) {
    const parts = name.split(':')
    if (parts.length < 3) return null
    const [group, artifact, version] = parts
    return `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}.jar`
  }

  for (const lib of libs) {

    const artifact = lib.downloads?.artifact
    if (artifact) {
      const libPath = path.join(librariesDir, artifact.path)
      const isNative = artifact.path.includes('natives-')

      const isWrongArch = isNative && (
        artifact.path.includes('natives-windows-arm64') ||
        artifact.path.includes('natives-windows-x86') ||
        artifact.path.includes('natives-linux-arm64') ||
        artifact.path.includes('natives-linux-arm32') ||
        artifact.path.includes('natives-macos-arm64')
      )

      if (!isNative) libPaths.push(libPath)
      libTasks.push(async () => {
        if (await needsDownload(libPath, artifact.sha1, artifact.size)) {
          await downloadFile(artifact.url, libPath, ({ downloaded }) => speedTracker.add(downloaded))
        }

        if (isNative && !isWrongArch && fs.existsSync(libPath)) {
          await extractZipNode(libPath, nativesDir, lib.extract?.exclude || [])
        }
      })
    } else if (lib.name) {

      const relPath = mavenNameToPath(lib.name)
      if (relPath) {
        const libPath = path.join(librariesDir, relPath)
        libPaths.push(libPath)
        libTasks.push(async () => {
          if (!fs.existsSync(libPath)) {

            const bases = []
            if (lib.url) bases.push(lib.url.replace(/\/$/, ''))
            bases.push('https://libraries.minecraft.net')
            bases.push('https://repo1.maven.org/maven2')

            let downloaded = false
            for (const base of bases) {
              try {
                await downloadFile(`${base}/${relPath}`, libPath, ({ downloaded: d }) => speedTracker.add(d))
                downloaded = true
                break
              } catch {

              }
            }
            if (!downloaded) {
              console.warn(`[assetManager] Could not download library: ${lib.name}`)
            }
          }
        })
      }
    }

    const nativeKey = lib.natives?.[os]
    if (nativeKey) {
      const nativeClassifier = lib.downloads?.classifiers?.[nativeKey]
      if (nativeClassifier) {

        const nativePath = path.join(librariesDir, nativeClassifier.path)
        libTasks.push(async () => {
          if (await needsDownload(nativePath, nativeClassifier.sha1, nativeClassifier.size)) {
            await downloadFile(nativeClassifier.url, nativePath, ({ downloaded }) => speedTracker.add(downloaded))
          }
          await extractZipNode(nativePath, nativesDir, lib.extract?.exclude || [])
        })
      } else if (lib.name) {

        const parts = lib.name.split(':')
        if (parts.length >= 3) {
          const [group, artifact, version] = parts
          const groupPath = group.replace(/\./g, '/')
          const fileName  = `${artifact}-${version}-${nativeKey}.jar`
          const relPath   = `${groupPath}/${artifact}/${version}/${fileName}`
          const nativePath = path.join(librariesDir, relPath)
          const nativeUrl  = `https://libraries.minecraft.net/${relPath}`
          libTasks.push(async () => {
            if (!fs.existsSync(nativePath) || fs.statSync(nativePath).size === 0) {
              try {
                await downloadFile(nativeUrl, nativePath, ({ downloaded }) => speedTracker.add(downloaded))
              } catch {

              }
            }
            if (fs.existsSync(nativePath) && fs.statSync(nativePath).size > 0) {
              await extractZipNode(nativePath, nativesDir, lib.extract?.exclude || [])
            }
          })
        }
      }
    }
  }

  totalFiles += libTasks.length
  emit('libraries', { log: `Downloading ${libTasks.length} libraries...` })

  await downloadQueue(libTasks, 8, (done, total) => {
    doneFiles = done
    emit('libraries', { log: `Libraries: ${done}/${total}` })
  })

  const assetIndexInfo = versionJson.assetIndex
  const assetIndexDir  = path.join(assetsDir, 'indexes')
  const assetIndexFile = path.join(assetIndexDir, `${assetIndexInfo.id}.json`)

  if (!fs.existsSync(assetIndexDir)) fs.mkdirSync(assetIndexDir, { recursive: true })

  if (await needsDownload(assetIndexFile, assetIndexInfo.sha1, assetIndexInfo.size)) {
    emit('assets', { log: `Downloading asset index...` })
    await downloadFile(assetIndexInfo.url, assetIndexFile, null)
  }

  const assetIndex = JSON.parse(fs.readFileSync(assetIndexFile, 'utf-8'))
  const assetObjects = Object.entries(assetIndex.objects)

  const objectsDir = path.join(assetsDir, 'objects')
  const assetTasks = []

  for (const [name, obj] of assetObjects) {
    const prefix  = obj.hash.slice(0, 2)
    const objPath = path.join(objectsDir, prefix, obj.hash)
    assetTasks.push(async () => {
      if (await needsDownload(objPath, obj.hash, obj.size)) {
        const url = `${RESOURCES_URL}/${prefix}/${obj.hash}`
        try {
          await downloadFile(url, objPath, ({ downloaded }) => speedTracker.add(downloaded))
        } catch (err) {
          onProgress?.({ phase: 'asset_error', log: `[WARN] Asset failed: ${name} — ${err.message}`, doneFiles, totalFiles, speed: 0 })
        }
      }
    })
  }

  totalFiles += assetTasks.length
  doneFiles = 0
  emit('assets', { log: `Downloading ${assetTasks.length} assets...` })

  await downloadQueue(assetTasks, 16, (done, total) => {
    doneFiles = done
    emit('assets', { log: `Assets: ${done}/${total}`, percent: Math.round(done / total * 100) })
  })

  emit('done', { log: 'All resources downloaded.' })

  try { fs.writeFileSync(markerPath, String(Date.now())) } catch {}

  _fastVerify = false
  return {
    clientJar,
    libraries: libPaths,
    nativesDir,
    assetsDir,
    assetIndex: assetIndexInfo.id,
  }
}

async function extractNative(jarPath, destDir, excludes) {
  if (!fs.existsSync(jarPath)) return
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

  if (process.platform === 'win32') {
    await extractZipNode(jarPath, destDir, excludes)
  } else {
    const { spawn } = require('child_process')
    await new Promise((resolve) => {
      const args = ['-o', '-j', jarPath, '-d', destDir]
      if (excludes && excludes.length > 0) {
        args.push('-x')
        excludes.forEach(ex => args.push(`${ex}*`))
      }
      const proc = spawn('unzip', args, { stdio: 'pipe' })
      proc.on('close', resolve)
      proc.on('error', resolve)
    })
  }
}

async function extractZipNode(jarPath, destDir, excludes) {
  const { spawn } = require('child_process')
  const nativeExts = ['dll', 'so', 'dylib', 'jnilib']

  if (process.platform !== 'win32') {
    return new Promise((resolve) => {
      const args = ['-o', '-j', jarPath, '-d', destDir]
      if (excludes && excludes.length > 0) {
        args.push('-x')
        excludes.forEach(ex => args.push(`${ex}*`))
      }
      const proc = spawn('unzip', args, { stdio: 'pipe' })
      proc.on('close', resolve)
      proc.on('error', resolve)
    })
  }

  return new Promise((resolve) => {
    const script = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('${jarPath.replace(/'/g, "''")}')
$zip.Entries | Where-Object {
  $ext = [System.IO.Path]::GetExtension($_.Name).TrimStart('.').ToLower()
  ($ext -eq 'dll' -or $ext -eq 'so' -or $ext -eq 'dylib' -or $ext -eq 'jnilib') -and
  -not $_.FullName.StartsWith('META-INF/')
} | ForEach-Object {
  $dest = [System.IO.Path]::Combine('${destDir.replace(/'/g, "''")}', $_.Name)
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($_, $dest, $true)
}
$zip.Dispose()
`
    const ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'pipe' })
    ps.on('close', resolve)
    ps.on('error', resolve)
  })
}

module.exports = { downloadAssets }

