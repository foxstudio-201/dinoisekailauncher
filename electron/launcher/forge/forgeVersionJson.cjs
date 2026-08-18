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
const fs   = require('fs')
const path = require('path')
const https = require('https')
const http  = require('http')
const { spawnSync } = require('child_process')
const AdmZip = require('adm-zip')


function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client  = url.startsWith('https') ? https : http
    const dir     = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const tmpPath = destPath + '.' + process.pid + '.tmp'
    const req = client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}: ${url}`)) }
      const out = fs.createWriteStream(tmpPath)
      res.pipe(out)
      out.on('finish', () => {
        try { fs.renameSync(tmpPath, destPath) } catch {
          try { fs.copyFileSync(tmpPath, destPath); fs.unlinkSync(tmpPath) } catch {}
        }
        resolve()
      })
      out.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
      res.on('error',  err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
    })
    req.on('error', reject)
  })
}

function readInstallerEntry(installerPath, entryName) {
  try {
    const zip = new AdmZip(installerPath)
    const entry = zip.getEntry(entryName)
    if (entry) {
      const text = entry.getData().toString('utf8')
      try { return JSON.parse(text) } catch {}
    }
  } catch {}
  return null
}

function readVersionJsonFromInstaller(installerPath) {
  return readInstallerEntry(installerPath, 'version.json')
}

function readInstallProfile(installerPath) {
  return readInstallerEntry(installerPath, 'install_profile.json')
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

const FML_JAR_PATTERNS = [
  /:fmlcore:/,
  /:javafmllanguage:/,
  /:lowcodelanguage:/,
  /:mclanguage:/,
  /:(?:forge|neoforge):.*:universal/,
]

const TOOL_LIB_PATTERNS = [
  /^net\.minecraftforge:binarypatcher:/,
  /^commons-io:commons-io:/,
  /^com\.google\.guava:guava:/,
  /^net\.sf\.jopt-simple:jopt-simple:/,
  /^com\.github\.jponge:lzma-java:/,
  /^com\.nothome:javaxdelta:/,
  /:(?:forge|neoforge):.*:clientdata@lzma/,
]

function mergeLoaderLibraries(versionJson, installProfile) {
  const seen = new Set()
  const classpathLibs = []
  const downloadOnlyLibs = []

  const addLibs = (libs, target) => {
    for (const lib of (libs || [])) {
      if (!lib || typeof lib !== 'object') continue
      const artifact = lib.downloads?.artifact || lib.artifact
      const relPath  = artifact?.path || mavenToPath(lib.name)
      if (!relPath) continue
      if (seen.has(relPath)) continue
      seen.add(relPath)
      target.push({
        relPath,
        url:      artifact?.url || (lib.url ? `${lib.url.replace(/\/$/, '')}/${relPath}` : null),
        sha1:     artifact?.sha1 || null,
        size:     artifact?.size || null,
      })
    }
  }

  addLibs(versionJson?.libraries, classpathLibs)

  for (const lib of (installProfile?.libraries || [])) {
    const name = lib?.name || ''
    if (!FML_JAR_PATTERNS.some(p => p.test(name)) && !TOOL_LIB_PATTERNS.some(p => p.test(name))) continue
    const artifact = lib.downloads?.artifact || lib.artifact
    const relPath  = artifact?.path || mavenToPath(name)
    if (!relPath || seen.has(relPath)) continue
    seen.add(relPath)
    downloadOnlyLibs.push({
      relPath,
      url:      artifact?.url || (lib.url ? `${lib.url.replace(/\/$/, '')}/${relPath}` : null),
      sha1:     artifact?.sha1 || null,
      size:     artifact?.size || null,
    })
  }

  return { classpathLibs, downloadOnlyLibs }
}

async function downloadLibraries(libList, librariesDir, onProgress) {
  const paths = []
  const tasks = []
  for (const lib of libList) {
    const dest = path.join(librariesDir, lib.relPath)
    paths.push(dest)
    if (lib.url) {
      tasks.push(async () => {
        if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return
        try { await downloadFile(lib.url, dest) } catch {}
      })
    }
  }
  let done = 0
  async function worker() {
    while (tasks.length > 0) {
      const task = tasks.shift()
      await task()
      done++
      onProgress?.({ done, total: tasks.length + done })
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, tasks.length) }, worker))
  return paths
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

  const forgeToken = /^forge-[\d.]+$/.test(versionName) ? `,${versionName}` : ''
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







async function buildLoaderConfig({ installerPath, mcVersion, loaderName, versionSuffix, librariesDir, instanceRoot, onProgress, versionJson: providedVersionJson, installProfile: providedInstallProfile, javaPath }) {
  const versionJson = providedVersionJson || (installerPath ? readVersionJsonFromInstaller(installerPath) : null)
  const installProfile = providedInstallProfile || (installerPath ? readInstallProfile(installerPath) : null)
  if (!versionJson) return null

  const versionId  = versionJson.id || `${mcVersion}-${loaderName}-${versionSuffix}`
  const versionDir = path.join(instanceRoot, 'versions', versionId)
  if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true })

  const { classpathLibs, downloadOnlyLibs } = mergeLoaderLibraries(versionJson, installProfile)
  const allLibs = [...classpathLibs, ...downloadOnlyLibs]

  onProgress?.({ phase: 'loader_libs', log: `Downloading ${allLibs.length} ${loaderName} libraries...`, done: 0, total: allLibs.length })
  await downloadLibraries(allLibs, librariesDir, (p) => {
    onProgress?.({ phase: 'loader_libs', log: `${loaderName} libraries: ${p.done}/${p.total}`, done: p.done, total: p.total })
  })

  const libraryPaths = classpathLibs.map(l => path.join(librariesDir, l.relPath))

  const mainClass = versionJson.mainClass
  const rawSuffix2 = versionSuffix || ''
  const buildOnly2 = rawSuffix2.startsWith(`${mcVersion}-`) ? rawSuffix2.slice(mcVersion.length + 1) : rawSuffix2
  const jvmVersionName = loaderName === 'forge' ? `forge-${buildOnly2}` : versionId
  const jvmArgs   = resolveJvmArgs(versionJson.arguments?.jvm || [], librariesDir, jvmVersionName)
  const gameArgs  = Array.isArray(versionJson.arguments?.game)
    ? versionJson.arguments.game.filter(a => typeof a === 'string')
    : []

  const isNeo = loaderName === 'neoforge'
  const isLegacyNeo = isNeo && /^\d+\.\d+\.\d+-/.test(versionSuffix || '')
  const isModernNeo = isNeo && !isLegacyNeo
  const usesNeoForm = () => {
    const a = Array.isArray(versionJson.arguments?.game) ? versionJson.arguments.game : []
    return a.includes('--fml.neoFormVersion')
  }
  const isModernForge = loaderName === 'forge' && usesNeoForm()
  const isModernLoader = isModernNeo || isModernForge
  const findClientKey = () => {
    const a = Array.isArray(versionJson.arguments?.game) ? versionJson.arguments.game : []
    const token = isModernLoader ? '--fml.neoFormVersion' : '--fml.mcpVersion'
    const i = a.indexOf(token)
    return i >= 0 && typeof a[i + 1] === 'string' ? a[i + 1] : null
  }
  const clientKey = findClientKey()
  const mcClientDir = clientKey ? path.join(librariesDir, 'net', 'minecraft', 'client', `${mcVersion}-${clientKey}`) : null

  const needsClientJars = loaderName === 'forge' || isNeo

  if (needsClientJars && !isModernLoader) {
    if (mcClientDir) {
      const p = path.join(mcClientDir, `client-${mcVersion}-${clientKey}-extra.jar`)
      if (fs.existsSync(p) && fs.statSync(p).size > 0) libraryPaths.push(p)
    }
  }

  if (isModernLoader) {
    const srgJar  = mcClientDir ? path.join(mcClientDir, `client-${mcVersion}-${clientKey}-srg.jar`) : null
    const extraJar = mcClientDir ? path.join(mcClientDir, `client-${mcVersion}-${clientKey}-extra.jar`) : null
    const loaderGroup = isNeo
      ? path.join('net', 'neoforged', 'neoforge')
      : path.join('net', 'minecraftforge', 'forge')
    const loaderNameLower = isNeo ? 'neoforge' : 'forge'
    const clientJarDir = path.join(librariesDir, loaderGroup, versionSuffix || '')
    const clientJarName = `${loaderNameLower}-${versionSuffix}-client.jar`
    const clientJar = versionSuffix ? path.join(clientJarDir, clientJarName) : null
    const jarOk = p => p && fs.existsSync(p) && fs.statSync(p).size > 0
    if (!jarOk(srgJar) || !jarOk(extraJar) || !jarOk(clientJar)) {
      onProgress?.({ phase: 'loader_patch', log: `${isNeo ? 'NeoForge' : 'Forge'} client jars missing — running the installer to generate them.`, done: 1, total: 1 })
      return null
    }
  }

  let customClientJar = null
  if (needsClientJars && !isModernLoader && installerPath) {
    customClientJar = await buildPatchedClient(loaderName, librariesDir, mcVersion, versionSuffix, mcClientDir, clientKey, installerPath, onProgress, javaPath)
    const srgOk  = mcClientDir && fs.existsSync(path.join(mcClientDir, `client-${mcVersion}-${clientKey}-srg.jar`))
    const extraOk = mcClientDir && fs.existsSync(path.join(mcClientDir, `client-${mcVersion}-${clientKey}-extra.jar`))
    if (!srgOk || !extraOk || !customClientJar) {
      onProgress?.({ phase: 'loader_patch', log: 'Client jars missing — falling back to the installer.', done: 1, total: 1 })
      return null
    }
  }

  try {
    fs.writeFileSync(path.join(versionDir, `${versionId}.json`), JSON.stringify(versionJson, null, 2))
  } catch {}

  return { versionJson, installProfile, libList: allLibs, libraryPaths, versionId, mainClass, jvmArgs, gameArgs, customClientJar }
}

async function buildPatchedClient(loaderName, librariesDir, mcVersion, versionSuffix, mcClientDir, mcpVersion, installerPath, onProgress, javaPath) {
  if (!javaPath) return null
  if (!mcClientDir || !mcpVersion) return null
  const isNeo = loaderName === 'neoforge'
  const isLegacyNeo = isNeo && /^\d+\.\d+\.\d+-/.test(versionSuffix || '')
  if (!isNeo && loaderName !== 'forge') return null
  if (isNeo && !isLegacyNeo) return null

  const srgJar = path.join(mcClientDir, `client-${mcVersion}-${mcpVersion}-srg.jar`)
  if (!fs.existsSync(srgJar) || fs.statSync(srgJar).size === 0) return null

  const rawSuffix = versionSuffix || ''
  const buildOnly = rawSuffix.startsWith(`${mcVersion}-`) ? rawSuffix.slice(mcVersion.length + 1) : rawSuffix
  const fullVersion = `${mcVersion}-${buildOnly}`
  const outDir  = isNeo
    ? path.join(librariesDir, 'net', 'neoforged', 'forge', fullVersion)
    : path.join(librariesDir, 'net', 'minecraftforge', 'forge', fullVersion)
  const outJar  = path.join(outDir, `forge-${fullVersion}-client.jar`)
  if (fs.existsSync(outJar) && fs.statSync(outJar).size > 0) return outJar

  let lzmaPath = null
  try {
    const zip = new AdmZip(installerPath)
    const entry = zip.getEntry('data/client.lzma')
    if (entry) {
      lzmaPath = path.join(outDir, 'client.lzma')
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(lzmaPath, entry.getData())
    }
  } catch {}

  if (!lzmaPath) return null

  const binpatcherPath = path.join(librariesDir, 'net', 'minecraftforge', 'binarypatcher', '1.1.1', 'binarypatcher-1.1.1.jar')
  if (!fs.existsSync(binpatcherPath)) return null

  const sep = process.platform === 'win32' ? ';' : ':'
  const toolJars = [
    binpatcherPath,
    path.join(librariesDir, 'commons-io', 'commons-io', '2.4', 'commons-io-2.4.jar'),
    path.join(librariesDir, 'com', 'google', 'guava', 'guava', '25.1-jre', 'guava-25.1-jre.jar'),
    path.join(librariesDir, 'net', 'sf', 'jopt-simple', 'jopt-simple', '5.0.4', 'jopt-simple-5.0.4.jar'),
    path.join(librariesDir, 'com', 'github', 'jponge', 'lzma-java', '1.3', 'lzma-java-1.3.jar'),
    path.join(librariesDir, 'com', 'nothome', 'javaxdelta', '2.0.1', 'javaxdelta-2.0.1.jar'),
  ].filter(p => fs.existsSync(p) && fs.statSync(p).size > 0)

  if (!toolJars.includes(binpatcherPath)) return null

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  onProgress?.({ phase: 'loader_patch', log: 'Patching client jar (binarypatcher)...', done: 0, total: 1 })
  try {
    const r = spawnSync(javaPath, ['-cp', toolJars.join(sep), 'net.minecraftforge.binarypatcher.ConsoleTool',
      '--clean', srgJar, '--output', outJar, '--apply', lzmaPath],
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 300_000, maxBuffer: 64 * 1024 * 1024 })
    if (r.error) throw r.error
    if (r.status !== 0) {
      onProgress?.({ phase: 'loader_patch', log: `[WARN] binarypatcher exited ${r.status}: ${(r.stderr?.toString() || r.stdout?.toString() || '').slice(-300)}`, done: 1, total: 1 })
      return null
    }
  } catch (err) {
    onProgress?.({ phase: 'loader_patch', log: `[WARN] binarypatcher failed: ${err.message}`, done: 1, total: 1 })
    return null
  }
  if (fs.existsSync(outJar) && fs.statSync(outJar).size > 0) {
    onProgress?.({ phase: 'loader_patch', log: `Patched client jar ready (${(fs.statSync(outJar).size / 1024 / 1024).toFixed(1)} MB)`, done: 1, total: 1 })
    return outJar
  }
  return null
}

module.exports = {
  buildLoaderConfig,
  readVersionJsonFromInstaller,
  readInstallProfile,
  mergeLoaderLibraries,
  downloadLibraries,
  resolveJvmArgs,
}
