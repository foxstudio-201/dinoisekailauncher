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
const { spawn } = require('child_process')

// Chạy tiến trình con bất đồng bộ — không block main process (tránh window "not responding")
// và stream log theo dòng để UI cập nhật tiến trình.
function runProcess(cmd, args, opts = {}, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...(opts.timeout ? { timeout: opts.timeout } : {}),
    })
    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = opts.timeout ? setTimeout(() => {
      if (settled) return
      settled = true
      try { child.kill('SIGKILL') } catch {}
      reject(new Error(`Tiến trình hết thời gian (${opts.timeout}ms)`))
    }, opts.timeout) : null

    child.stdout.on('data', d => { stdout += d.toString(); for (const line of d.toString().split('\n')) if (line.trim()) onLine?.(line) })
    child.stderr.on('data', d => { stderr += d.toString(); for (const line of d.toString().split('\n')) if (line.trim()) onLine?.(line) })
    child.on('error', err => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      reject(err)
    })
    child.on('close', code => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })
  })
}

const { buildLoaderConfig, readVersionJsonFromInstaller, readVersionJsonFromInstance, readInstallProfileFromInstance } = require('./forgeVersionJson.cjs')

const BMCLAPI      = 'https://bmclapi2.bangbang93.com'
const FORGE_MAVEN  = 'https://files.minecraftforge.net/maven'

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
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}: ${url}`)) }
      const out = fs.createWriteStream(tmpPath)
      res.pipe(out)
      out.on('finish', () => {
        try { fs.renameSync(tmpPath, destPath) } catch {
          fs.copyFileSync(tmpPath, destPath); try { fs.unlinkSync(tmpPath) } catch {}
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
  const sep       = process.platform === 'win32' ? ';' : ':'
  const libDirFwd = librariesDir.replace(/\\/g, '/')
  function subst(s) {
    return s
      .replace(/\$\{library_directory\}/g,   libDirFwd)
      .replace(/\$\{classpath_separator\}/g, sep)
      .replace(/\$\{version_name\}/g,        versionName)
  }
  // CurseForge's generated ignoreList also ends with the bare forge version
  // (e.g. "...,forge-47.4.4.jar,forge-47.4.4"). Match it exactly.
  const forgeToken = /^forge-[\d.]+$/.test(versionName) ? `,${versionName}` : ''
  // CustomSkinLoader's runtime Common jar exports net.minecraft.client.renderer
  // (the same package the client srg jar exports). If it's left on the module
  // path, bootstraplauncher fails to build the layer with a split-package
  // error. Adding it to the ignoreList keeps it on the classpath instead.
  const cslToken = ',CustomSkinLoader'
  const result = []
  for (const arg of rawArgs) {
    if (typeof arg === 'string') {
      const s = subst(arg)
      if (s.startsWith('-DignoreList=')) {
        const extra = (forgeToken || cslToken) && (!s.includes('CustomSkinLoader') ? cslToken : '')
        result.push(s + forgeToken + extra)
      } else {
        result.push(s)
      }
      continue
    }
    if (arg && typeof arg === 'object' && arg.value) {
      let allowed = true
      if (Array.isArray(arg.rules)) {
        allowed = arg.rules.every(rule => {
          if (rule.action !== 'allow') return false
          if (rule.os) {
            const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'
            return rule.os.name === osName
          }
          return true
        })
      }
      if (!allowed) continue
      const values = Array.isArray(arg.value) ? arg.value : [arg.value]
      for (const v of values) { if (typeof v === 'string') result.push(subst(v)) }
    }
  }
  return result
}

async function setupForge(mcVersion, forgeVersion, librariesDir, clientJar, javaPath, instanceRoot, onProgress) {
  // forgeVersion có thể là "40.3.0" hoặc "1.18.2-40.3.0" (đã có mcVersion prefix)
  const fullVersion = forgeVersion.startsWith(`${mcVersion}-`)
    ? forgeVersion
    : `${mcVersion}-${forgeVersion}`
  // buildOnlyVersion = phần sau mcVersion prefix, ví dụ "40.3.0"
  const buildOnlyVersion = fullVersion.startsWith(`${mcVersion}-`)
    ? fullVersion.slice(mcVersion.length + 1)
    : forgeVersion

  // For CurseForge instances the complete version.json is stored in
  // minecraftinstance.json — no installer download/run needed at all.
  let providedVersionJson = null
  let providedInstallProfile = null
  try {
    const instJsonPath = path.join(instanceRoot, 'minecraftinstance.json')
    if (fs.existsSync(instJsonPath)) {
      providedVersionJson = readVersionJsonFromInstance(instJsonPath)
      providedInstallProfile = readInstallProfileFromInstance(instJsonPath)
    }
  } catch {}

  if (providedVersionJson) {
    const config = await buildLoaderConfig({
      mcVersion,
      loaderName: 'forge',
      versionSuffix: buildOnlyVersion,
      librariesDir,
      instanceRoot,
      onProgress,
      javaPath,
      versionJson: providedVersionJson,
      installProfile: providedInstallProfile,
    })
    if (config) {
      onProgress?.({ phase: 'forge_ready', log: `Forge ${config.versionId} ready. Main: ${config.mainClass}`, done: 1, total: 1 })
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
  }

  const installerName = `forge-${fullVersion}-installer.jar`
  const installerDir  = path.join(librariesDir, 'net', 'minecraftforge', 'forge', fullVersion)
  const installerPath = path.join(installerDir, installerName)
  const installerUrl  = `${FORGE_MAVEN}/net/minecraftforge/forge/${fullVersion}/${installerName}`
  const bmclapiUrl    = `${BMCLAPI}/maven/net/minecraftforge/forge/${fullVersion}/${installerName}`

  if (!fs.existsSync(installerDir)) fs.mkdirSync(installerDir, { recursive: true })

  // ── Download installer ─────────────────────────────────────────────────────
  if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size === 0) {
    onProgress?.({ phase: 'forge_download', log: `Downloading Forge ${fullVersion} installer...`, done: 0, total: 1 })
    let downloaded = false
    for (const url of [installerUrl, bmclapiUrl]) {
      try {
        onProgress?.({ phase: 'forge_download', log: `Trying ${url.split('?')[0]}...` })
        await downloadFile(url, installerPath)
        if (fs.existsSync(installerPath) && fs.statSync(installerPath).size > 0) { downloaded = true; break }
      } catch (e) {
        onProgress?.({ phase: 'forge_download', log: `[WARN] Mirror failed: ${e.message}` })
        try { fs.unlinkSync(installerPath) } catch {}
      }
    }
    if (!downloaded) throw new Error('Failed to download Forge installer from all mirrors.')
    onProgress?.({ phase: 'forge_download', log: 'Forge installer downloaded.', done: 1, total: 1 })
  } else {
    onProgress?.({ phase: 'forge_download', log: 'Forge installer already cached.', done: 1, total: 1 })
  }

  const versionId       = `${mcVersion}-forge-${buildOnlyVersion}`
  const versionDir      = path.join(instanceRoot, 'versions', versionId)
  const versionJsonPath = path.join(versionDir, `${versionId}.json`)

  // ── Preferred path: build config from the installer's embedded version.json ──
  // No `--installClient` run, no Linux SHA1 processor dance.
  const config = await buildLoaderConfig({
    installerPath,
    mcVersion,
    loaderName: 'forge',
    versionSuffix: buildOnlyVersion,
    librariesDir,
    instanceRoot,
    onProgress,
    javaPath,
  })

  if (config) {
    onProgress?.({ phase: 'forge_ready', log: `Forge ${config.versionId} ready. Main: ${config.mainClass}`, done: 1, total: 1 })
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

  // ── Fallback: place vanilla jar and run the installer ─────────────────────
  const vanillaVersionDir = path.join(instanceRoot, 'versions', mcVersion)
  const vanillaJarDest    = path.join(vanillaVersionDir, `${mcVersion}.jar`)
  if (!fs.existsSync(vanillaJarDest) && clientJar && fs.existsSync(clientJar)) {
    if (!fs.existsSync(vanillaVersionDir)) fs.mkdirSync(vanillaVersionDir, { recursive: true })
    fs.copyFileSync(clientJar, vanillaJarDest)
    onProgress?.({ phase: 'forge_install', log: 'Placed vanilla client.jar for installer.' })
  }
  // Modern Forge (1.21+) needs a launcher profile just like NeoForge. Create
  // a minimal one if missing, otherwise the installer exits with
  // "There is no minecraft launcher profile ... you need to run the launcher first!".
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
      onProgress?.({ phase: 'forge_install', log: 'Created launcher_profiles.json for the installer.' })
    } catch {}
  }
  const vanillaJsonDest = path.join(vanillaVersionDir, `${mcVersion}.json`)
  if (!fs.existsSync(vanillaJsonDest)) {
    try {
      const shared = path.join(instanceRoot, 'versions', mcVersion, `${mcVersion}.json`)
      if (fs.existsSync(shared)) fs.copyFileSync(shared, vanillaJsonDest)
    } catch {}
  }

  // instLibDir is where the installer places processed libraries
  const instLibDir = path.join(instanceRoot, 'libraries')

  // ── Check if Forge post-processed JARs exist ───────────────────────────────
  // On Linux the installer validates SHA1 of its output and deletes files if they
  // don't match its hardcoded expected hashes (which were computed on Windows with
  // deterministic ZIP ordering). We detect this and run each processor tool directly.
  const forgeClientJar = path.join(instLibDir, 'net', 'minecraftforge', 'forge', fullVersion, `forge-${fullVersion}-client.jar`)
  const srgJar         = path.join(instLibDir, 'net', 'minecraft', 'client', `${mcVersion}-20230612.114412`, `client-${mcVersion}-20230612.114412-srg.jar`)
  const extraJar       = path.join(instLibDir, 'net', 'minecraft', 'client', `${mcVersion}-20230612.114412`, `client-${mcVersion}-20230612.114412-extra.jar`)

  const jarOk = p => fs.existsSync(p) && fs.statSync(p).size > 0
  const forgeOutputsExist = () => jarOk(forgeClientJar) && jarOk(srgJar) && jarOk(extraJar)

  // ── Run installer (only if versionJson is missing OR modern Forge client jars missing) ──
  // Modern Forge (1.21+) uses --fml.neoFormVersion and FML's ProductionClientProvider
  // which needs srg/extra/forge-client jars generated by the installer.
  // A stale version.json must NOT make us skip the installer while those jars are missing.
  const usesNeoForm = () => {
    let vj = null
    try {
      vj = fs.existsSync(versionJsonPath)
        ? JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
        : readVersionJsonFromInstaller(installerPath)
    } catch {}
    const a = Array.isArray(vj?.arguments?.game) ? vj.arguments.game : []
    return a.includes('--fml.neoFormVersion')
  }
  const isModernForge = usesNeoForm()
  const clientJarsMissing = (() => {
    if (!isModernForge) return false
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
    const mcClientDir = path.join(instLibDir, 'net', 'minecraft', 'client', `${mcVersion}-${clientKey}`)
    const srgJar  = path.join(mcClientDir, `client-${mcVersion}-${clientKey}-srg.jar`)
    const extraJar = path.join(mcClientDir, `client-${mcVersion}-${clientKey}-extra.jar`)
    const forgeClientJar = path.join(instLibDir, 'net', 'minecraftforge', 'forge', fullVersion, `forge-${fullVersion}-client.jar`)
    return !jarOk(srgJar) || !jarOk(extraJar) || !jarOk(forgeClientJar)
  })()

  if (!fs.existsSync(versionJsonPath) || clientJarsMissing) {
    onProgress?.({ phase: 'forge_install', log: 'Đang cài đặt Forge...', done: 0, total: 1 })
    const res = await runProcess(javaPath, [
      '-Djava.awt.headless=true', '-jar', installerPath, '--installClient', instanceRoot,
    ], { cwd: instanceRoot, timeout: 600_000 })
    if (res.code !== 0 && !fs.existsSync(versionJsonPath)) {
      throw new Error(`Forge installer exited with code ${res.code}.\n${res.stderr.slice(-500)}`)
    }
    onProgress?.({ phase: 'forge_install', log: 'Đã cài xong Forge.', done: 1, total: 1 })
  } else {
    onProgress?.({ phase: 'forge_install', log: 'Đã cài xong Forge.', done: 1, total: 1 })
  }

  // ── Linux fix: run processor tools directly if output JARs are missing ────
  // The installer's SHA1 validation deletes output files when hashes don't match
  // (common on Linux due to non-deterministic ZIP entry ordering). We bypass this
  // by running jarsplitter, ForgeAutoRenamingTool, and binarypatcher directly.
  if (!isModernForge && !forgeOutputsExist() && process.platform !== 'win32') {
    onProgress?.({ phase: 'forge_install', log: 'Đang cài đặt Forge...', done: 0, total: 1 })

    const sep = ':'
    const mcClientDir  = path.join(instLibDir, 'net', 'minecraft', 'client', `${mcVersion}-20230612.114412`)
    const slimJar      = path.join(mcClientDir, `client-${mcVersion}-20230612.114412-slim.jar`)
    const mergedMappings = path.join(instLibDir, 'de', 'oceanlabs', 'mcp', 'mcp_config',
      `${mcVersion}-20230612.114412`, `mcp_config-${mcVersion}-20230612.114412-mappings-merged.txt`)

    async function runTool(args) {
      onProgress?.({ phase: 'forge_install', log: 'Đang cài đặt Forge...' })
      const r = await runProcess(javaPath, args, { timeout: 300_000 })
      return r.code === 0
    }

    // Step 1: jarsplitter → slim + extra
    if (!jarOk(slimJar) || !jarOk(extraJar)) {
      const cp1 = [
        path.join(instLibDir, 'net', 'minecraftforge', 'jarsplitter', '1.1.4', 'jarsplitter-1.1.4.jar'),
        path.join(instLibDir, 'net', 'sf', 'jopt-simple', 'jopt-simple', '5.0.4', 'jopt-simple-5.0.4.jar'),
        path.join(instLibDir, 'net', 'minecraftforge', 'srgutils', '0.4.3', 'srgutils-0.4.3.jar'),
      ].filter(jarOk).join(sep)
      await runTool(['-cp', cp1, 'net.minecraftforge.jarsplitter.ConsoleTool',
        '--input', vanillaJarDest, '--slim', slimJar, '--extra', extraJar, '--srg', mergedMappings])
    }

    // Step 2: ForgeAutoRenamingTool → srg
    if (!jarOk(srgJar)) {
      const fart = path.join(instLibDir, 'net', 'minecraftforge', 'ForgeAutoRenamingTool', '0.1.22', 'ForgeAutoRenamingTool-0.1.22-all.jar')
      if (jarOk(fart) && jarOk(slimJar)) {
        await runTool(['-jar', fart,
          '--input', slimJar, '--output', srgJar, '--names', mergedMappings,
          '--ann-fix', '--ids-fix', '--src-fix', '--record-fix'])
      }
    }

    // Step 3: binarypatcher → forge client jar
    if (!jarOk(forgeClientJar) && jarOk(srgJar)) {
      // Extract client.lzma from installer JAR
      const lzmaPath = path.join(installerDir, 'client.lzma')
      if (!jarOk(lzmaPath)) {
        const fd = require('fs').openSync(lzmaPath, 'w')
        try {
          await new Promise((resolve, reject) => {
            const child = spawn('unzip', ['-p', installerPath, 'data/client.lzma'], { stdio: ['ignore', fd, 'pipe'] })
            child.on('error', reject)
            child.on('close', code => code === 0 ? resolve() : reject(new Error(`unzip exit ${code}`)))
          })
        } catch (e) {
          onProgress?.({ phase: 'forge_install', log: `[WARN] Failed to extract client.lzma: ${e.message}` })
        } finally {
          require('fs').closeSync(fd)
        }
      }
      if (jarOk(lzmaPath)) {
        const bp = path.join(instLibDir, 'net', 'minecraftforge', 'binarypatcher', '1.1.1', 'binarypatcher-1.1.1.jar')
        const bpCp = [
          bp,
          path.join(instLibDir, 'commons-io', 'commons-io', '2.4', 'commons-io-2.4.jar'),
          path.join(instLibDir, 'com', 'google', 'guava', 'guava', '25.1-jre', 'guava-25.1-jre.jar'),
          path.join(instLibDir, 'net', 'sf', 'jopt-simple', 'jopt-simple', '5.0.4', 'jopt-simple-5.0.4.jar'),
          path.join(instLibDir, 'com', 'github', 'jponge', 'lzma-java', '1.3', 'lzma-java-1.3.jar'),
          path.join(instLibDir, 'com', 'nothome', 'javaxdelta', '2.0.1', 'javaxdelta-2.0.1.jar'),
        ].filter(jarOk).join(sep)
        if (jarOk(bp)) {
          await runTool(['-cp', bpCp, 'net.minecraftforge.binarypatcher.ConsoleTool',
            '--clean', srgJar, '--output', forgeClientJar, '--apply', lzmaPath])
        }
      }
    }

    if (forgeOutputsExist()) {
      onProgress?.({ phase: 'forge_install', log: '[Linux] All Forge output JARs generated successfully.', done: 1, total: 1 })
    } else {
      onProgress?.({ phase: 'forge_install', log: '[WARN] Some Forge output JARs still missing after manual processing.', done: 1, total: 1 })
    }
  }

  if (!fs.existsSync(versionJsonPath)) throw new Error(`Forge version JSON not found: ${versionJsonPath}`)
  const profile   = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'))
  const mainClass = profile.mainClass
  if (!mainClass) throw new Error('Forge version JSON missing mainClass')

  const extraLibraries = []
  for (const lib of (profile.libraries || [])) {
    const relPath = lib.downloads?.artifact?.path || mavenToPath(lib.name)
    if (!relPath) continue
    const instPath   = path.join(instLibDir, relPath)
    const sharedPath = path.join(librariesDir, relPath)
    if      (fs.existsSync(instPath)   && fs.statSync(instPath).size   > 0) extraLibraries.push(instPath)
    else if (fs.existsSync(sharedPath) && fs.statSync(sharedPath).size > 0) extraLibraries.push(sharedPath)
  }

  const effectiveLibDir = fs.existsSync(instLibDir) ? instLibDir : librariesDir
  // ${version_name} must be "forge-{build}" (e.g. "forge-47.4.4") to match what
  // bootstraplauncher expects — NOT profile.id which may be "1.20.1-forge-47.4.4".
  const versionName     = `forge-${buildOnlyVersion}`
  const jvmArgs         = resolveJvmArgs(profile.arguments?.jvm || [], effectiveLibDir, versionName)

  const gameArgs = Array.isArray(profile.arguments?.game)
    ? profile.arguments.game.filter(a => typeof a === 'string')
    : []

  onProgress?.({ phase: 'forge_ready', log: `Forge ${versionName} ready. Main: ${mainClass}`, done: 1, total: 1 })

  return {
    mainClass,
    extraLibraries,
    jvmArgs,
    gameArgs,
    shimJar:               null,
    customClientJar:       null,
    needsVanillaClasspath: true,
  }
}

module.exports = { setupForge }

