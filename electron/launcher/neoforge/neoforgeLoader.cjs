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
const { spawnSync } = require('child_process')

const { buildLoaderConfig } = require('../forge/forgeVersionJson.cjs')

const NEOFORGE_MAVEN = 'https://maven.neoforged.net/releases'

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client  = url.startsWith('https') ? https : http
    const dir     = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const tmpPath = destPath + '.tmp'

    const req = client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
      }
      const out = fs.createWriteStream(tmpPath)
      res.pipe(out)
      out.on('finish', () => {
        try { fs.renameSync(tmpPath, destPath) } catch {
          fs.copyFileSync(tmpPath, destPath)
          try { fs.unlinkSync(tmpPath) } catch {}
        }
        resolve()
      })
      out.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
      res.on('error',  err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
    })
    req.on('error', reject)
  })
}

function mavenToPath(coord) {
  if (!coord) return null
  const atIdx = coord.indexOf('@')
  const ext   = atIdx >= 0 ? coord.slice(atIdx + 1) : 'jar'
  const base  = atIdx >= 0 ? coord.slice(0, atIdx)  : coord
  const parts = base.split(':')
  if (parts.length < 3) return null
  const [group, artifact, version, classifier] = parts
  const groupPath = group.replace(/\./g, '/')
  const fileName  = classifier
    ? `${artifact}-${version}-${classifier}.${ext}`
    : `${artifact}-${version}.${ext}`
  return `${groupPath}/${artifact}/${version}/${fileName}`
}

function resolveJvmArgs(rawArgs, librariesDir, versionName) {
  if (!Array.isArray(rawArgs)) return []
  const sep = process.platform === 'win32' ? ';' : ':'

  const libDirFwd = librariesDir.replace(/\\/g, '/')
  const result = []
  for (const arg of rawArgs) {
    if (typeof arg === 'string') {
      result.push(
        arg
          .replace(/\$\{library_directory\}/g, libDirFwd)
          .replace(/\$\{classpath_separator\}/g, sep)
          .replace(/\$\{version_name\}/g, versionName)
      )
      continue
    }
    if (arg && typeof arg === 'object' && arg.value) {
      let allowed = true
      if (Array.isArray(arg.rules)) {
        allowed = arg.rules.every(rule => {
          if (rule.action !== 'allow') return false
          if (rule.os) {
            const osName = process.platform === 'win32' ? 'windows'
              : process.platform === 'darwin' ? 'osx' : 'linux'
            return rule.os.name === osName
          }
          return true
        })
      }
      if (!allowed) continue
      const values = Array.isArray(arg.value) ? arg.value : [arg.value]
      for (const v of values) {
        if (typeof v === 'string') result.push(
          v
            .replace(/\$\{library_directory\}/g, libDirFwd)
            .replace(/\$\{classpath_separator\}/g, sep)
            .replace(/\$\{version_name\}/g, versionName)
        )
      }
    }
  }
  return result
}

async function setupNeoForge(mcVersion, neoVersion, librariesDir, clientJar, javaPath, instanceRoot, onProgress) {
  // NeoForge 47.x (MC 1.20.1) uses the "1.20.1-47.x.x" naming and is hosted in
  // the net/neoforged/forge group with a "forge-...-installer.jar" artifact.
  // Newer versions (20.4.x, 21.1.x, ...) live in net/neoforged/neoforge.
  const isLegacyNeo = /^\d+\.\d+\.\d+-/.test(neoVersion)
  const installerName = isLegacyNeo ? `forge-${neoVersion}-installer.jar` : `neoforge-${neoVersion}-installer.jar`
  const installerGroup = isLegacyNeo ? 'net/neoforged/forge' : 'net/neoforged/neoforge'
  const installerDir  = path.join(librariesDir, installerGroup, neoVersion)
  const installerPath = path.join(installerDir, installerName)
  const installerUrl  = `${NEOFORGE_MAVEN}/${installerGroup}/${neoVersion}/${installerName}`

  if (!fs.existsSync(installerDir)) fs.mkdirSync(installerDir, { recursive: true })

  if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size === 0) {
    onProgress?.({ phase: 'neoforge_download', log: `Downloading NeoForge ${neoVersion} installer...`, done: 0, total: 1 })
    try {
      await downloadFile(installerUrl, installerPath)
      if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size === 0) {
        throw new Error('Downloaded file is empty')
      }
    } catch (e) {
      try { fs.unlinkSync(installerPath) } catch {}
      throw new Error(`Failed to download NeoForge installer: ${e.message}`)
    }
    onProgress?.({ phase: 'neoforge_download', log: 'NeoForge installer downloaded.', done: 1, total: 1 })
  } else {
    onProgress?.({ phase: 'neoforge_download', log: 'NeoForge installer already cached.', done: 1, total: 1 })
  }

  // ── Preferred path: build config from the installer's embedded version.json ──
  const config = await buildLoaderConfig({ installerPath, mcVersion, loaderName: 'neoforge', versionSuffix: neoVersion, librariesDir, instanceRoot, onProgress, javaPath })

  if (config) {
    onProgress?.({ phase: 'neoforge_ready', log: `NeoForge ${config.versionId} ready. Main: ${config.mainClass}`, done: 1, total: 1 })
    return {
      mainClass:           config.mainClass,
      extraLibraries:      config.libraryPaths,
      jvmArgs:             config.jvmArgs,
      gameArgs:            config.gameArgs,
      shimJar:             null,
      customClientJar:     config.customClientJar || null,
      needsVanillaClasspath: true,
    }
  }

  const vanillaVersionDir = path.join(instanceRoot, 'versions', mcVersion)
  const vanillaJarDest    = path.join(vanillaVersionDir, `${mcVersion}.jar`)
  if (!fs.existsSync(vanillaJarDest) && clientJar && fs.existsSync(clientJar)) {
    if (!fs.existsSync(vanillaVersionDir)) fs.mkdirSync(vanillaVersionDir, { recursive: true })
    fs.copyFileSync(clientJar, vanillaJarDest)
    onProgress?.({ phase: 'neoforge_install', log: 'Placed vanilla client.jar for installer.' })
  }
  // The modern NeoForge installer (20.4+) refuses to run without a minecraft
  // launcher profile and a vanilla version JSON in position, otherwise it exits
  // with "There is no minecraft launcher profile ... you need to run the launcher
  // first!". Create a minimal one if missing.
  const launcherProfilePath  = path.join(instanceRoot, 'launcher_profiles.json')
  const launcherProfileStore = path.join(instanceRoot, 'launcher_profiles_microsoft_store.json')
  if (!fs.existsSync(launcherProfilePath) && !fs.existsSync(launcherProfileStore)) {
    try {
      fs.writeFileSync(launcherProfilePath, JSON.stringify({
        authenticationDatabase: {},
        clientToken: '',
        launcherVersion: { name: 'Dino Isekai', format: 21, profilesFormat: 2 },
        profiles: { [mcVersion]: { lastVersionId: mcVersion, name: mcVersion, type: 'latest-release' } },
        selectedProfile: mcVersion,
        selectedUser: '',
        settings: {},
      }, null, 2))
      onProgress?.({ phase: 'neoforge_install', log: 'Created launcher_profiles.json for the installer.' })
    } catch {}
  }
  const vanillaJsonDest = path.join(vanillaVersionDir, `${mcVersion}.json`)
  if (!fs.existsSync(vanillaJsonDest)) {
    // If the vanilla version json is already cached next to the shared client
    // jar, copy it; otherwise the installer re-downloads it from Mojang.
    try {
      const shared = path.join(instanceRoot, 'versions', mcVersion, `${mcVersion}.json`)
      if (fs.existsSync(shared)) fs.copyFileSync(shared, vanillaJsonDest)
    } catch {}
  }

  const versionId       = `neoforge-${neoVersion}`
  const versionDir      = path.join(instanceRoot, 'versions', versionId)
  const versionJsonPath = path.join(versionDir, `${versionId}.json`)

  // Modern NeoForge (20.4+) needs the three FML client jars that only the
  // installer generates (client-<mc>-<neoForm>-srg/extra.jar +
  // neoforge-<ver>-client.jar). A stale version.json must NOT make us skip
  // the installer while those jars are still missing.
  const isLegacyNeoName = /^\d+\.\d+\.\d+-/.test(neoVersion)
  const isModernNeoName = !isLegacyNeoName
  const instLibDirNeo   = path.join(instanceRoot, 'libraries')
  const jarOk = p => { try { return fs.existsSync(p) && fs.statSync(p).size > 0 } catch { return false } }
  const clientJarsMissing = (() => {
    if (!isModernNeoName) return false
    let versionJson = null
    try {
      versionJson = fs.existsSync(versionJsonPath)
        ? JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
        : readVersionJsonFromInstaller(installerPath)
    } catch {}
    const gameArgs = Array.isArray(versionJson?.arguments?.game) ? versionJson.arguments.game : []
    const i = gameArgs.indexOf('--fml.neoFormVersion')
    const clientKey = i >= 0 && typeof gameArgs[i + 1] === 'string' ? gameArgs[i + 1] : null
    if (!clientKey) return false
    const mcClientDir = path.join(instLibDirNeo, 'net', 'minecraft', 'client', `${mcVersion}-${clientKey}`)
    const srgJar  = path.join(mcClientDir, `client-${mcVersion}-${clientKey}-srg.jar`)
    const extraJar = path.join(mcClientDir, `client-${mcVersion}-${clientKey}-extra.jar`)
    const neoClientJar = path.join(instLibDirNeo, 'net', 'neoforged', 'neoforge', `${neoVersion}-client.jar`)
    return !jarOk(srgJar) || !jarOk(extraJar) || !jarOk(neoClientJar)
  })()

  if (!fs.existsSync(versionJsonPath) || clientJarsMissing) {
    onProgress?.({ phase: 'neoforge_install', log: 'Running NeoForge installer (this may take a minute)...', done: 0, total: 1 })

    const result = spawnSync(
      javaPath,
      [
        '-Djava.awt.headless=true',
        '-jar', installerPath,
        '--installClient', instanceRoot,
      ],
      {
        cwd:       instanceRoot,
        stdio:     ['ignore', 'pipe', 'pipe'],
        timeout:   600_000,
        maxBuffer: 64 * 1024 * 1024,
      }
    )

    const allOutput = ((result.stdout?.toString() || '') + '\n' + (result.stderr?.toString() || ''))
      .split('\n').filter(Boolean)
    for (const line of allOutput) {
      onProgress?.({ phase: 'neoforge_install', log: `[Installer] ${line}` })
    }

    if (result.error) throw new Error(`NeoForge installer failed: ${result.error.message}`)
    if (result.status !== 0 && !fs.existsSync(versionJsonPath)) {
      const errDetail = (result.stderr?.toString() || result.stdout?.toString() || '').slice(-500)
      throw new Error(`NeoForge installer exited with code ${result.status}.\nLast output:\n${errDetail}`)
    }

    onProgress?.({ phase: 'neoforge_install', log: 'NeoForge installer finished.', done: 1, total: 1 })
  } else {
    onProgress?.({ phase: 'neoforge_install', log: 'NeoForge already installed, skipping installer.', done: 1, total: 1 })
  }

  if (!fs.existsSync(versionJsonPath)) {
    throw new Error(`NeoForge version JSON not found after install: ${versionJsonPath}`)
  }

  const profile   = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))
  const mainClass = profile.mainClass
  if (!mainClass) throw new Error('NeoForge version JSON missing mainClass')

  const instLibDir     = path.join(instanceRoot, 'libraries')
  const extraLibraries = []

  for (const lib of (profile.libraries || [])) {
    const relPath = lib.downloads?.artifact?.path || mavenToPath(lib.name)
    if (!relPath) continue

    const instPath   = path.join(instLibDir, relPath)
    const sharedPath = path.join(librariesDir, relPath)

    if (fs.existsSync(instPath) && fs.statSync(instPath).size > 0) {
      extraLibraries.push(instPath)
    } else if (fs.existsSync(sharedPath) && fs.statSync(sharedPath).size > 0) {
      extraLibraries.push(sharedPath)
    }
  }

  const effectiveLibDir = fs.existsSync(instLibDir) ? instLibDir : librariesDir
  const versionName = profile.id || `neoforge-${neoVersion}`
  const jvmArgs = resolveJvmArgs(profile.arguments?.jvm || [], effectiveLibDir, versionName)

  const gameArgs = Array.isArray(profile.arguments?.game)
    ? profile.arguments.game.filter(a => typeof a === 'string')
    : []

  onProgress?.({ phase: 'neoforge_ready', log: `NeoForge ${neoVersion} ready. Main: ${mainClass}`, done: 1, total: 1 })

  return {
    mainClass,
    extraLibraries,
    jvmArgs,
    gameArgs,
    shimJar:              null,
    customClientJar:      null,
    needsVanillaClasspath: true,
  }
}

module.exports = { setupNeoForge }

