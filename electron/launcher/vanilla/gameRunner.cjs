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

const { spawn, execFileSync } = require('child_process')
const path  = require('path')
const fs    = require('fs')

/**
 * Linux: detect high-performance (big) CPU cores by reading max frequency.
 * Returns an array of core indices with the highest frequency, or empty array on error.
 */
function detectPerformanceCores() {
  try {
    const cores = []
    let maxFreq = 0
    for (let i = 0; i < 256; i++) {
      const freqPath = `/sys/devices/system/cpu/cpu${i}/cpufreq/cpuinfo_max_freq`
      if (!fs.existsSync(freqPath)) break
      const freq = parseInt(fs.readFileSync(freqPath, 'utf8').trim(), 10)
      if (freq > maxFreq) maxFreq = freq
      cores.push({ id: i, freq })
    }
    if (maxFreq === 0) return []
    return cores.filter(c => c.freq === maxFreq).map(c => c.id)
  } catch {
    return []
  }
}

function detectJavaMajorVersion(javaPath) {
  try {
    let combined = ''
    try {
      execFileSync(javaPath, ['-version'], {
        stdio: ['ignore', 'ignore', 'pipe'],
        timeout: 5000,
      })
    } catch (e) {
      combined = e.stderr?.toString() || ''
    }
    if (!combined) {
      try {
        combined = execFileSync(javaPath, ['-version'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 5000,
        }).toString()
      } catch (e2) {
        combined = e2.stderr?.toString() || e2.stdout?.toString() || ''
      }
    }
    const match = combined.match(/version "(\d+)(?:\.(\d+))?/)
    if (!match) return null
    const major = parseInt(match[1], 10)
    return major === 1 ? parseInt(match[2] || '8', 10) : major
  } catch {
    return null
  }
}

function buildGcArgs(javaMajor, ramMb) {
  return []
}

function substituteArgs(args, vars) {
  if (!Array.isArray(args)) return []
  return args.flatMap(arg => {
    if (typeof arg === 'string') {
      return [arg.replace(/\$\{(\w+)\}/g, (_, k) => vars[k] ?? '')]
    }

    if (arg.rules) {
      const allowed = arg.rules.every(rule => {
        if (rule.action === 'allow') {
          if (rule.os) return rule.os.name === vars._os
          if (rule.features) {
            return Object.entries(rule.features).every(([k, v]) => vars._features?.[k] === v)
          }
          return true
        }
        return false
      })
      if (!allowed) return []
      const value = arg.value
      return Array.isArray(value) ? value : [value]
    }
    return []
  }).map(a => typeof a === 'string'
    ? a.replace(/\$\{(\w+)\}/g, (_, k) => vars[k] ?? '')
    : String(a)
  )
}

function getOS() {
  switch (process.platform) {
    case 'win32':  return 'windows'
    case 'darwin': return 'osx'
    default:       return 'linux'
  }
}

function buildClasspath(libraries, clientJar) {
  const sep = process.platform === 'win32' ? ';' : ':'
  const normalize = p => p.replace(/\\/g, '/').toLowerCase()
  const clientNorm = normalize(clientJar)

  const seen = new Set()
  const libs = libraries.filter(l => {
    if (!fs.existsSync(l)) return false
    const n = normalize(l)
    if (seen.has(n)) return false
    seen.add(n)
    return true
  })
  const alreadyIncluded = libs.some(l => normalize(l) === clientNorm)
  const all = alreadyIncluded ? libs : [...libs, clientJar]
  return all.join(sep)
}

function launchGame(opts) {
  const {
    javaPath, clientJar, libraries, nativesDir, assetsDir, assetIndex,
    versionJson, instancePath, gameVersion, username, uuid, accessToken,
    ramMb = 2048, mainClassOverride, extraJvmArgs = [], extraGameArgs = [],
    shimJar = null, shimWorkDir = null,
    boostMode = false,
    bigCoreMode = false,
    serverAddress,
    onLog, onExit,
  } = opts

  const os = getOS()
  const classpath = buildClasspath(libraries, clientJar)

  if (!fs.existsSync(instancePath)) fs.mkdirSync(instancePath, { recursive: true })

  cleanOldLogs(instancePath)

  const vars = {
    _os:              os,
    _features:        { is_demo_user: false, has_custom_resolution: false },
    auth_player_name: username,
    auth_uuid:        uuid,
    auth_access_token: accessToken || '0',
    auth_xuid:        '0',
    user_type:        accessToken && accessToken !== '0' ? 'msa' : 'legacy',
    version_name:     versionJson.id,
    game_directory:   instancePath,
    assets_root:      assetsDir,
    assets_index_name: assetIndex,
    version_type:     versionJson.type || 'release',
    natives_directory: nativesDir,
    launcher_name:    'Dino Isekai',
    launcher_version: '1.0.0',
    classpath,

    resolution_width:  '1280',
    resolution_height: '720',
  }

  const xmx = ramMb
  const xms = 512

  const javaMajor = detectJavaMajorVersion(javaPath) ?? (versionJson?.javaVersion?.majorVersion ?? 17)
  const gcArgs    = buildGcArgs(javaMajor, ramMb)

  const bigCores = bigCoreMode ? detectPerformanceCores() : []

  const boostJvmArgs = boostMode ? [
    '-XX:+UseThreadPriorities',
    '-XX:ThreadPriorityPolicy=1',
  ] : []

  const bigCoreJvmArgs = bigCores.length > 0 ? [
    `-XX:ActiveProcessorCount=${bigCores.length}`,
  ] : []

  const useTaskset = bigCores.length > 0 && process.platform === 'linux'
  const bigCoreCmd = useTaskset ? 'taskset' : null
  const bigCoreArgs = useTaskset ? ['-c', bigCores.join(',')] : []

  const jvmArgs = [
    `-Xmx${xmx}m`,
    `-Xms${xms}m`,
    `-Dorg.lwjgl.library.path=${nativesDir}`,
    `-Dorg.lwjgl.librarypath=${nativesDir}`,
    `-Djava.library.path=${nativesDir}`,
    `-Dminecraft.launcher.brand=Dino Isekai`,
    `-Dminecraft.launcher.version=1.0.0`,

    '-Dfile.encoding=UTF-8',
    '-Dstdout.encoding=UTF-8',
    '-Dstderr.encoding=UTF-8',
    '-Djava.util.logging.config.file=',
    '-Djava.awt.headless=false',

    ...gcArgs,
    ...boostJvmArgs,
    ...bigCoreJvmArgs,

    '--add-opens=java.base/java.lang=ALL-UNNAMED',
    '-Dorg.lwjgl.util.NoChecks=true',
    '-Dorg.lwjgl.opengl.Display.allowSoftwareOpenGL=false',
    '-Dorg.lwjgl.opengl.Display.enableHighDPI=true',
    '-Dorg.lwjgl.system.allocator=system',
  ]

  const needsVanillaCP = extraJvmArgs.includes('__needsVanillaClasspath__')
  const cleanExtraJvmArgs = extraJvmArgs.filter(a => a !== '__needsVanillaClasspath__')

  const isForge = !needsVanillaCP && cleanExtraJvmArgs.length > 0 && cleanExtraJvmArgs.some(
    a => typeof a === 'string' && (
      a.includes('bootstraplauncher') ||
      a === '--add-modules' ||
      a === 'ALL-MODULE-PATH' ||
      a === '-p'
    )
  )

  let versionJvmArgs
  if (isForge) {
    versionJvmArgs = ['-cp', classpath]
  } else if (needsVanillaCP) {

    const sep = process.platform === 'win32' ? ';' : ':'
    const normalize = p => p.replace(/\\/g, '/').toLowerCase()
    const clientNorm = normalize(clientJar)
    const libsOnly = libraries.filter(l => fs.existsSync(l) && normalize(l) !== clientNorm)
    const classpathNoClient = libsOnly.join(sep)

    const vanillaArgs = versionJson.arguments?.jvm
      ? substituteArgs(versionJson.arguments.jvm, { ...vars, classpath: classpathNoClient })
      : [`-Djava.library.path=${nativesDir}`, '-cp', classpathNoClient]

    const cpIdx = vanillaArgs.indexOf('-cp')
    versionJvmArgs = cpIdx >= 0 ? ['-cp', vanillaArgs[cpIdx + 1]] : ['-cp', classpathNoClient]
  } else {
    versionJvmArgs = versionJson.arguments?.jvm
      ? substituteArgs(versionJson.arguments.jvm, vars)
      : [`-Djava.library.path=${nativesDir}`, '-cp', classpath]
  }

  const gameArgs = versionJson.arguments?.game
    ? substituteArgs(versionJson.arguments.game, vars)
    : (versionJson.minecraftArguments || '').split(' ').map(a =>
        a.replace(/\$\{(\w+)\}/g, (_, k) => vars[k] ?? '')
      )

  const mainClass = mainClassOverride || versionJson.mainClass

  let finalGameArgs = gameArgs
  if (extraGameArgs.length > 0) {
    const extraKeys = new Set()
    for (let i = 0; i < extraGameArgs.length; i++) {
      if (extraGameArgs[i].startsWith('--')) extraKeys.add(extraGameArgs[i])
    }
    finalGameArgs = []
    for (let i = 0; i < gameArgs.length; i++) {
      if (gameArgs[i].startsWith('--') && extraKeys.has(gameArgs[i])) {
        i++
      } else {
        finalGameArgs.push(gameArgs[i])
      }
    }
  }

  const serverArgs = []
  if (serverAddress) {
    const parts = serverAddress.split(':')
    const host = parts[0]
    const port = parts.length > 1 ? parseInt(parts[1], 10) : 25565

    let useQuickPlay = false
    const gameArgs = versionJson.arguments?.game
    if (Array.isArray(gameArgs)) {
      for (const arg of gameArgs) {
        if (arg?.rules) {
          for (const rule of arg.rules) {
            if (rule.features?.is_quick_play_multiplayer) {
              useQuickPlay = true
              break
            }
          }
          if (useQuickPlay) break
        }
      }
    }

    if (useQuickPlay) {
      serverArgs.push('--quickPlayMultiplayer', `${host}:${port}`)
    } else {
      serverArgs.push('--server', host, '--port', String(port))
    }
    onLog?.(`[Launcher] Quick-play server: ${host}:${port} (${useQuickPlay ? 'quickPlayMultiplayer' : 'legacy'})`)
  }

  const spawnArgs = [
    ...jvmArgs,
    ...versionJvmArgs,
    `-Djava.library.path=${nativesDir}`,
    ...cleanExtraJvmArgs,
    mainClass,
    ...finalGameArgs,
    ...serverArgs,
    ...extraGameArgs,
  ]
  const spawnCwd = shimWorkDir || instancePath

  onLog?.(`[Launcher] Java: ${javaPath}`)
  onLog?.(`[Launcher] Java version: ${javaMajor}`)
  onLog?.(`[Launcher] Main: ${mainClass}`)
  onLog?.(`[Launcher] Args: ${spawnArgs.slice(0, 5).join(' ')}...`)

  const spawnEnv = { ...process.env }
  delete spawnEnv.JAVA_TOOL_OPTIONS
  delete spawnEnv._JAVA_OPTIONS
  delete spawnEnv.JDK_JAVA_OPTIONS

  if (bigCores.length > 0) {
    onLog?.(`[Launcher] Pinning to performance cores: ${bigCores.join(',')}`)
  }

  const proc = spawn(bigCoreCmd || javaPath, bigCoreCmd ? [...bigCoreArgs, javaPath, ...spawnArgs] : spawnArgs, {
    cwd:      spawnCwd,
    stdio:    ['ignore', 'pipe', 'pipe'],
    detached: false,
    env: spawnEnv,
  })

  if (bigCores.length > 0 && proc.pid) {
    if (process.platform === 'win32') {
      setWindowsProcessAffinity(proc.pid, bigCores)
    } else if (process.platform === 'darwin') {
      setMacOsProcessAffinity(proc.pid)
    }
  }

  const { StringDecoder } = require('string_decoder')
  const outDecoder = new StringDecoder('utf8')
  const errDecoder = new StringDecoder('utf8')
  let outBuf = ''
  let errBuf = ''

  proc.stdout.on('data', chunk => {
    outBuf += outDecoder.write(chunk)
    const lines = outBuf.split('\n')
    outBuf = lines.pop()
    lines.filter(Boolean).forEach(line => onLog?.(line))
  })
  proc.stdout.on('end', () => {
    const rem = outDecoder.end()
    if (outBuf + rem) onLog?.(outBuf + rem)
  })

  proc.stderr.on('data', chunk => {
    errBuf += errDecoder.write(chunk)
    const lines = errBuf.split('\n')
    errBuf = lines.pop()
    lines.filter(Boolean).forEach(line => onLog?.(`[ERR] ${line}`))
  })
  proc.stderr.on('end', () => {
    const rem = errDecoder.end()
    if (errBuf + rem) onLog?.(`[ERR] ${errBuf + rem}`)
  })
  proc.on('close', code => {
    onLog?.(`[Launcher] Game exited with code ${code}`)
    onExit?.(code)
  })
  proc.on('error', err => {
    onLog?.(`[Launcher] Spawn error: ${err.message}`)
    onExit?.(-1)
  })

  return proc
}

function setWindowsProcessAffinity(pid, cores) {
  try {
    const mask = cores.reduce((acc, c) => acc | (1 << c), 0)
    const psCmd = [
      `$p = Get-Process -Id ${pid};`,
      `$p.ProcessorAffinity = ${mask};`,
      `$p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High;`,
    ].join(' ')
    const { exec } = require('child_process')
    exec(`powershell.exe -NoProfile -Command "${psCmd}"`, { windowsHide: true }, () => {})
  } catch {}
}

function setMacOsProcessAffinity(pid) {
  try {
    const { exec } = require('child_process')
    exec(`renice -n -20 -p ${pid}`, () => {})
    exec(`taskpolicy -d -p ${pid}`, () => {})
  } catch {}
}

function cleanOldLogs(instancePath) {
  try {
    const keepNewest = (dir, filter) => {
      if (!fs.existsSync(dir)) return
      const files = fs.readdirSync(dir)
        .filter(f => filter(f))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
      files.slice(1).forEach(f => {
        try { fs.rmSync(path.join(dir, f.name), { recursive: true, force: true }) } catch {}
      })
    }
    const isLog = f => /\.log$/i.test(f)
    keepNewest(path.join(instancePath, 'logs'), isLog)
    keepNewest(path.join(instancePath, 'crash-reports'), f => /\.(txt|log)$/i.test(f))
    keepNewest(instancePath, f => /^hs_err_pid.*\.log$/i.test(f))
  } catch {}
}

module.exports = { launchGame }

