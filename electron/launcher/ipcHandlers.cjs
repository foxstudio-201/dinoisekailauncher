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

const { ipcMain } = require('electron')
const path = require('path')
const fs   = require('fs')
const { app } = require('electron')

const { resolveVersion }      = require('./vanilla/versionResolver.cjs')
const { ensureJava }          = require('./java/javaManager.cjs')
const { downloadAssets }      = require('./vanilla/assetManager.cjs')
const { setupForge }          = require('./forge/forgeLoader.cjs')
const { runDataSync, checkDataSync, runBaseDataSync, checkBaseData } = require('./dataSync.cjs')
const { launchGame }          = require('./vanilla/gameRunner.cjs')
const { startPlaytimeTracker, getProfileStats, getProfileAnalytics } = require('./statsTracker.cjs')
const { normalizeSingleForgeProfile, FIXED_LOADER } = require('../profileManager.cjs')
const rpc                     = require('../discordRPC.cjs')

const DATA_DIR      = path.join(app.getPath('appData'), '.DinoIsekai')
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')
const LAUNCHER_DIR  = path.join(DATA_DIR, 'launcher')

function readProfiles() {
  try { return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8')) }
  catch { return { profiles: [], selectedProfileId: null } }
}
function writeProfiles(data) {
  const tmp = PROFILES_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, PROFILES_FILE)
}
function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) }
  catch { return {} }
}
function getClientJarFromCache(versionJson, launcherDir) {
  return path.join(launcherDir, 'versions', versionJson.id, `${versionJson.id}.jar`)
}

const runningGames = new Map()

const preDlInFlight = { profileId: null, promise: null }

function makeKey(profileId, accountId) {
  return `${profileId}::${accountId}`
}

function forceKillGame(proc) {
  if (!proc || !proc.pid) return
  const pid = proc.pid
  const { execFile } = require('child_process')
  if (process.platform === 'win32') {
    try { execFile('taskkill', ['/F', '/T', '/PID', String(pid)], { windowsHide: true }, () => {}) } catch {}
    try { proc.kill('SIGKILL') } catch {}
    return
  }
  try { execFile('pkill', ['-9', '-P', String(pid)], () => {}) } catch {}
  try { proc.kill('SIGKILL') } catch {}
  try { process.kill(pid, 'SIGKILL') } catch {}
}


function registerLauncherHandlers(getTrustedWindow) {

  ipcMain.handle('launcher:launch', async (e, { profileId, ramMb, serverAddress, accountId }) => {
    const win = getTrustedWindow(e)
    if (!win) return { error: 'Unauthorized' }

    let profilesData = readProfiles()
    const norm = normalizeSingleForgeProfile(profilesData)
    if (norm.changed) writeProfiles(norm.data)
    profilesData = norm.data
    const profile = profilesData.profiles[0]
    if (!profile) return { error: 'Profile not found' }
    profileId = profile.id

    if (preDlInFlight.profileId === profile.id && preDlInFlight.promise) {
      await preDlInFlight.promise
    }

    let accountsData
    try {
      accountsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'accounts.json'), 'utf-8'))
    } catch { accountsData = { accounts: [], selectedId: null } }

    const targetId = accountId || accountsData.selectedId
    const account = accountsData.accounts.find(a => a.id === targetId)
    if (!account) return { error: 'No account selected' }

    const gameKey = makeKey(profileId, account.id)
    for (const k of runningGames.keys()) {
      if (k.startsWith(profileId + '::')) {
        return { error: `Profile "${profile.name}" đang chạy. Chỉ một tài khoản chạy một profile tại một thời điểm.` }
      }
    }
    if (runningGames.has(gameKey)) {
      return { error: `Profile "${profile.name}" is already running with account "${account.username}".` }
    }

    const settings      = readSettings()
    const hideLauncher  = settings.hideLauncherOnLaunch !== false
    const boostMode     = settings.boostMode === true
    const bigCoreMode   = settings.bigCoreMode === true

    const instancePath = profile.instancePath
    if (!fs.existsSync(instancePath)) fs.mkdirSync(instancePath, { recursive: true })

    const launcherDir  = LAUNCHER_DIR
    if (!fs.existsSync(launcherDir)) fs.mkdirSync(launcherDir, { recursive: true })

    const launcherProfilesPath = path.join(launcherDir, 'launcher_profiles.json')
    if (!fs.existsSync(launcherProfilesPath)) {
      fs.writeFileSync(launcherProfilesPath, JSON.stringify({
        profiles: {},
        selectedProfile: null,
        clientToken: 'Dino Isekai',
        authenticationDatabase: {},
        launcherVersion: { name: '2.0.0', format: 21 },
      }, null, 2))
    }

    const runtimesDir = path.join(DATA_DIR, 'runtimes')


    function sendProgress(data) {
      if (!win.isDestroyed()) win.webContents.send('launcher:progress', data)
    }

    const logsDir = path.join(profile.instancePath, 'logs')
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
    const logFilePath = path.join(logsDir, `${timestamp}.log`)
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a', encoding: 'utf-8' })
    logStream.on('error', () => {})

    function writeLog(line) {
      if (!win.isDestroyed()) win.webContents.send('launcher:log', { line })
      if (logStream.writable) { try { logStream.write(line + '\n') } catch {} }

      if (logWinRef && !logWinRef.isDestroyed()) logWinRef.webContents.send('launcher:log', { line })
    }

    let lastFileWriteTime = 0
    function writeLogUpdate(line) {
      if (!win.isDestroyed()) win.webContents.send('launcher:logUpdate', { line })
      const now = Date.now()
      if (now - lastFileWriteTime >= 1000) {
        lastFileWriteTime = now
        if (logStream.writable) { try { logStream.write(line + '\n') } catch {} }
      }
      if (logWinRef && !logWinRef.isDestroyed()) logWinRef.webContents.send('launcher:logUpdate', { line })
    }

    let logWinRef = null

    function sendProgressAndLog(data) {
      sendProgress(data)
      if (data.log) writeLog(`[Launcher] ${data.log}`)
    }

    function sendProgressAndUpdate(data) {
      sendProgress(data)
      if (data.log) writeLogUpdate(`[Launcher] ${data.log}`)
    }

    try {
      sendProgressAndLog({ phase: 'resolve', log: `Loading version info for ${profile.gameVersion}...`, percent: 2 })
      const versionJson = await resolveVersion(profile.gameVersion, launcherDir)

      sendProgressAndLog({ phase: 'java', log: 'Checking Java runtime...', percent: 5 })

      let javaPath
      if (profile.javaPath && fs.existsSync(profile.javaPath)) {
        javaPath = profile.javaPath
        sendProgressAndLog({ phase: 'java', log: `Using custom Java: ${path.basename(path.dirname(path.dirname(profile.javaPath)))}`, percent: 8 })
      } else {
        javaPath = await ensureJava(profile.gameVersion, runtimesDir, (p) => {
          const pct = p.phase === 'java_download' ? 5 + Math.round((p.done / p.total) * 25) : 5
          if (p.phase === 'java_download') {
            sendProgressAndUpdate({
              phase: 'java',
              log: `Java ${p.javaVersion}: ${p.done}/${p.total} files (${p.percent}%)`,
              percent: pct,
              doneFiles: p.done,
              totalFiles: p.total,
            })
          } else if (p.phase === 'java_ready') {
            sendProgressAndLog({ phase: 'java', log: `Java ${p.javaVersion} ready`, percent: pct })
          } else {
            sendProgressAndLog({ phase: 'java', log: `Downloading Java ${p.javaVersion}...`, percent: pct })
          }
        }, versionJson)
      }

      const fastVerify = true
      const skipIfReady = true
      sendProgressAndLog({ phase: 'assets', log: fastVerify ? 'Using cached assets...' : 'Checking game assets...', percent: 30 })
      let lastAssetPhase = ''
      const assets = await downloadAssets(versionJson, launcherDir, (p) => {
        let pct = 30
        if (p.totalFiles > 0) pct = 30 + Math.round((p.doneFiles / p.totalFiles) * 65)
        if (p.phase === 'asset_error') {
          writeLog(`[WARN] ${p.log}`)
          return
        }
        const phaseChanged = p.phase !== lastAssetPhase
        if (phaseChanged) {
          lastAssetPhase = p.phase
          sendProgressAndLog({
            phase: 'assets',
            log: p.log || `Assets: ${p.doneFiles}/${p.totalFiles}`,
            percent: pct,
            doneFiles: p.doneFiles,
            totalFiles: p.totalFiles,
            speed: p.speed,
          })
        } else if (p.phase === 'done') {
          sendProgressAndLog({ phase: 'assets', log: p.log, percent: pct })
        } else {
          sendProgressAndUpdate({
            phase: 'assets',
            log: p.log || `Assets: ${p.doneFiles}/${p.totalFiles}`,
            percent: pct,
            doneFiles: p.doneFiles,
            totalFiles: p.totalFiles,
            speed: p.speed,
          })
        }
      }, { fastVerify, skipIfReady })

      sendProgressAndLog({ phase: 'launching', log: `Launching as ${account.username}...`, percent: 98 })

      const accessToken = '0'

      let mainClassOverride = null
      let extraLibraries    = []
      let extraJvmArgs      = profile.jvmArgs ? profile.jvmArgs.trim().split(/\s+/).filter(Boolean) : []
      let extraGameArgs     = []
      let forgeShimJar      = null

      if (profile.loader === 'forge' && profile.loaderVersion) {
        sendProgressAndLog({ phase: 'forge', log: `Setting up Forge ${profile.loaderVersion}...`, percent: 93 })
        const forgeLibsDir = path.join(launcherDir, 'libraries')
        let lastForgePhase = ''

        const forgeResult = await setupForge(
          profile.gameVersion,
          profile.loaderVersion,
          forgeLibsDir,
          assets.clientJar,
          javaPath,
          launcherDir,
          (p) => {
            const phaseChanged = p.phase !== lastForgePhase
            if (phaseChanged) {
              lastForgePhase = p.phase
              sendProgressAndLog({ phase: 'forge', log: p.log, percent: 95, doneFiles: p.done, totalFiles: p.total })
            } else {
              sendProgressAndUpdate({ phase: 'forge', log: p.log, percent: 95, doneFiles: p.done, totalFiles: p.total })
            }
          }
        )

        mainClassOverride = forgeResult.mainClass
        extraJvmArgs      = forgeResult.jvmArgs  || []
        extraGameArgs     = forgeResult.gameArgs  || []
        forgeShimJar      = forgeResult.shimJar   || null

        function getArtifactKey(jarPath) {
          const normalized = jarPath.replace(/\\/g, '/')
          const match = normalized.match(/libraries\/(.+)\/[^/]+\/[^/]+\.jar$/)
          return match ? match[1] : jarPath
        }

        const forgeKeys = new Set(forgeResult.extraLibraries.map(getArtifactKey))
        const filteredVanillaLibs = assets.libraries.filter(lib => !forgeKeys.has(getArtifactKey(lib)))

        assets.libraries = [...forgeResult.extraLibraries, ...filteredVanillaLibs]

        if (forgeResult.customClientJar) {
          assets.clientJar = forgeResult.customClientJar
        }

        if (forgeResult.needsVanillaClasspath) {
          extraJvmArgs = [...extraJvmArgs, '__needsVanillaClasspath__']
        }

        sendProgressAndLog({ phase: 'forge', log: `Forge ready. Main: ${mainClassOverride}`, percent: 97 })
      }

      sendProgressAndLog({ phase: 'launching', log: `Launching as ${account.username}...`, percent: 98 })

      if (boostMode && process.platform === 'win32') {
        try {
          const { exec } = require('child_process')
          const BOOST_KILL_LIST = [
            'OneDrive.exe', 'Teams.exe', 'Slack.exe', 'Spotify.exe',
            'EpicGamesLauncher.exe', 'GalaxyClient.exe', 'upc.exe',
            'origin.exe', 'OriginWebHelperService.exe',
            'SearchIndexer.exe', 'SearchProtocolHost.exe', 'SearchFilterHost.exe',
            'SgrmBroker.exe', 'OneDriveSetup.exe',
            'SkypeApp.exe', 'SkypeBridge.exe',
            'Cortana.exe', 'WinStore.App.exe',
            'XboxApp.exe', 'XboxGameBarWidgets.exe', 'GameBar.exe', 'GameBarFTServer.exe',
            'RiotClientServices.exe', 'EADesktop.exe', 'BattleNet.exe', 'Agent.exe',
          ]
          const killPromises = BOOST_KILL_LIST.map(proc =>
            new Promise(resolve => {
              exec(`taskkill /F /IM "${proc}" /T`, { windowsHide: true }, () => resolve())
            })
          )
          await Promise.all(killPromises)
        } catch (boostErr) {
          writeLog(`[WARN] Boost Mode error: ${boostErr.message}`)
        }
      }

      if (process.platform === 'win32') {
        try {
          const { exec } = require('child_process')
          const javaExeNorm = javaPath.replace(/\//g, '\\')
          const javawExe    = javaExeNorm.replace(/java\.exe$/i, 'javaw.exe')
          const regEntries  = [javaExeNorm, javawExe].filter(Boolean)
          for (const exe of regEntries) {
            await new Promise(resolve => {
              exec(
                `reg add "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences" /v "${exe}" /t REG_SZ /d "GpuPreference=2;" /f`,
                { windowsHide: true },
                () => resolve()
              )
            })
          }
        } catch (gpuErr) {
          writeLog(`[WARN] GPU preference error: ${gpuErr.message}`)
        }
      }

      const proc = launchGame({
        javaPath,
        clientJar:         assets.clientJar,
        libraries:         assets.libraries,
        nativesDir:        assets.nativesDir,
        assetsDir:         assets.assetsDir,
        assetIndex:        assets.assetIndex,
        versionJson,
        mainClassOverride,
        extraJvmArgs,
        extraGameArgs,
        shimJar:           forgeShimJar,
        shimWorkDir:       instancePath,
        instancePath:      instancePath,
        gameVersion:       profile.gameVersion,
        username:          account.username,
        uuid:              account.uuid,
        accessToken,
        ramMb:             ramMb || 2048,
        boostMode,
        bigCoreMode,
        serverAddress,
        onLog: (line) => {
          writeLog(line)
        },
        onExit: (code) => {
          try { rpc.PRESETS.menu() } catch {}
          try { logStream.end() } catch {}
          logWinRef = null
          const game = runningGames.get(gameKey)
          if (game) {
            const elapsed = game.stopTracker(code !== 0)
            runningGames.delete(gameKey)
            try { process.setProcessPriority(process.pid, 'normal') } catch {}
            if (!win.isDestroyed()) {
              win.show()
              win.focus()
              win.webContents.send('launcher:stopped', { profileId, accountId: account.id, code, elapsed })
            }
          }
        },
      })

      if (hideLauncher && !win.isDestroyed()) {
        win.hide()
      }

      if (proc.pid) {
        try {
          if (boostMode) {
            process.setProcessPriority(proc.pid, 'above normal')
            process.setProcessPriority(process.pid, 'below normal')
          } else {
            process.setProcessPriority(proc.pid, 'normal')
            process.setProcessPriority(process.pid, 'below normal')
          }
        } catch {}
      }

      const stopTracker = startPlaytimeTracker(profileId, profilesData, writeProfiles)
      runningGames.set(gameKey, { proc, stopTracker })

      sendProgress({ phase: 'running', log: 'Minecraft is running!', percent: 100 })
      try { rpc.PRESETS.playing(profile.gameVersion, profile.name, account.username) } catch {}
      return { ok: true }

    } catch (err) {
      writeLog(`[Launcher] ERROR: ${err.message}`)
      try { logStream.end() } catch {}
      sendProgress({ phase: 'error', log: `Error: ${err.message}`, error: err.message, percent: 0 })
      return { error: err.message }
    }
  })

  ipcMain.handle('launcher:stop', (e, { profileId, accountId }) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const key = accountId ? makeKey(profileId, accountId) : null

    if (key && runningGames.has(key)) {
      forceKillGame(runningGames.get(key).proc)
      return { ok: true }
    }

    let stopped = 0
    for (const [k, game] of runningGames) {
      if (k.startsWith(profileId + '::')) {
        forceKillGame(game.proc)
        stopped++
      }
    }
    return stopped > 0 ? { ok: true, stopped } : { error: 'Game is not running' }
  })

  ipcMain.handle('launcher:preDownload', async (e, { profileId }) => {
    const win = getTrustedWindow(e)
    if (!win) return { error: 'Unauthorized' }
    const profilesData = readProfiles()
    const profile = profilesData.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }

    const launcherDir = LAUNCHER_DIR
    if (!fs.existsSync(launcherDir)) fs.mkdirSync(launcherDir, { recursive: true })
    const runtimesDir = path.join(DATA_DIR, 'runtimes')

    function formatEta(ms) {
      if (ms == null || !isFinite(ms) || ms < 0) return null
      const s = Math.round(ms / 1000)
      if (s < 60) return `~${s}s`
      const m = Math.floor(s / 60)
      if (m < 60) return `~${m}p ${s % 60}s`
      return `~${Math.floor(m / 60)}g ${m % 60}p`
    }

    let phaseStart = Date.now()
    let phaseRatio = 0
    function emit(phase, item, percent, opts = {}) {
      if (opts.done != null && opts.total) phaseRatio = opts.done / opts.total
      const ratio = Math.max(percent / 100, phaseRatio)
      let eta = null
      if (ratio > 0.02 && ratio < 1) {
        const elapsed = Date.now() - phaseStart
        eta = formatEta(Math.round(elapsed / ratio - elapsed))
      }
      if (!win.isDestroyed()) win.webContents.send('launcher:predownload:progress', {
        phase,
        item,
        percent: Math.max(0, Math.min(100, Math.round(percent))),
        eta,
        ...opts,
      })
    }
    function nextPhase(phase, item) {
      phaseStart = Date.now()
      phaseRatio = 0
      emit(phase, item, 0, { log: `Đang chuẩn bị ${item}...` })
    }

    const { startOp, endOp, isAborted } = require('./abortControl.cjs')
    startOp('preDl')
    const abortedErr = Object.assign(new Error('aborted'), { aborted: true })
    function checkAbort() { if (isAborted('preDl')) throw abortedErr }

    if (preDlInFlight.profileId === profileId && preDlInFlight.promise) return preDlInFlight.promise
    const run = (async () => {
    try {
      nextPhase('version', `Phiên bản ${profile.gameVersion}`)
      const versionJson = await resolveVersion(profile.gameVersion, launcherDir)
      emit('version', `Phiên bản ${profile.gameVersion}`, 100, { log: `Đã sẵn sàng ${profile.gameVersion}` })
      checkAbort()

      nextPhase('java', 'Java runtime')
      const javaPath = await ensureJava(profile.gameVersion, runtimesDir, (p) => {
        if (p.phase === 'java_download') {
          const pc = p.total ? Math.round(p.done / p.total * 100) : 0
          emit('java', 'Java runtime', pc, { log: `Java: ${p.done}/${p.total}`, done: p.done, total: p.total })
        } else if (p.phase === 'java_ready') {
          emit('java', 'Java runtime', 100, { log: 'Java đã sẵn sàng' })
        } else {
          emit('java', 'Java runtime', 0, { log: p.log || p.phase })
        }
      }, versionJson)
      checkAbort()

      nextPhase('assets', 'Game assets')
      let lastAssetPhase = ''
      const assets = await downloadAssets(versionJson, launcherDir, (p) => {
        const pc = p.totalFiles > 0 ? Math.round((p.doneFiles / p.totalFiles) * 100) : (p.phase === 'done' ? 100 : 0)
        if (p.phase === 'asset_error') return
        const phaseChanged = p.phase !== lastAssetPhase || p.phase === 'done'
        if (phaseChanged) lastAssetPhase = p.phase
        emit(p.phase, 'Game assets', pc, { log: p.log || `Assets: ${p.doneFiles}/${p.totalFiles}`, done: p.doneFiles, total: p.totalFiles })
      }, { fastVerify: true, skipIfReady: true })
      checkAbort()

      if (profile.loader === 'forge' && profile.loaderVersion) {
        const forgeLabel = `Forge ${profile.gameVersion}-${profile.loaderVersion}`
        nextPhase('forge', forgeLabel)
        await setupForge(profile.gameVersion, profile.loaderVersion, path.join(launcherDir, 'libraries'), assets.clientJar, javaPath, launcherDir, (p) => {
          const pc = p.total ? Math.round((p.done || 0) / p.total * 100) : 0
          emit('forge', forgeLabel, pc, { log: p.log, done: p.done, total: p.total })
        })
        emit('forge', forgeLabel, 100, { log: 'Forge đã sẵn sàng' })
      }
      checkAbort()

      emit('done', 'Hoàn tất', 100, { log: 'Tất cả tài nguyên đã sẵn sàng — bấm Play là vào game!' })
      return { ok: true }
    } catch (err) {
      if (err?.aborted) {
        const { getAction } = require('./abortControl.cjs')
        if (getAction('preDl') === 'cancel') {
          emit('cancelled', 'Đã hủy', 0, { log: 'Đã hủy tải tài nguyên.' })
          return { ok: false, cancelled: true }
        }
        emit('paused', 'Tạm dừng', 0, { log: 'Đã tạm dừng tải. Bấm Play để tiếp tục.' })
        return { ok: false, paused: true }
      }
      emit('done', 'Hoàn tất', 100, { log: `Cảnh báo: ${err.message}` })
      return { ok: false, error: err.message }
    } finally {
      endOp('preDl')
    }
    })()
    preDlInFlight.profileId = profileId
    preDlInFlight.promise = run
    try { return await run } finally {
      if (preDlInFlight.promise === run) { preDlInFlight.profileId = null; preDlInFlight.promise = null }
    }
  })

  ipcMain.handle('launcher:hasGameResources', (e, { profileId }) => {
    if (!getTrustedWindow(e)) return { ready: true }
    const profilesData = readProfiles()
    const profile = profilesData.profiles.find(p => p.id === profileId)
    if (!profile) return { ready: true }
    const versionsDir = path.join(LAUNCHER_DIR, 'versions', profile.gameVersion)
    const marker = path.join(versionsDir, '.assets.ready')
    const clientJar = path.join(versionsDir, `${profile.gameVersion}.jar`)
    return { ready: fs.existsSync(marker) && fs.existsSync(clientJar) }
  })

  ipcMain.handle('dataSync:check', async (e) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const profiles = readProfiles().profiles
    return checkDataSync(profiles[0])
  })

  ipcMain.handle('dataSync:checkBase', async (e) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const profiles = readProfiles().profiles
    return checkBaseData(profiles[0])
  })

  ipcMain.handle('dataSync:runBase', async (e) => {
    const win = getTrustedWindow(e)
    if (!win) return { error: 'Unauthorized' }
    const profiles = readProfiles().profiles
    const profile = profiles[0]
    if (!profile) return { error: 'Profile not found' }
    function send(data) {
      if (!win.isDestroyed()) win.webContents.send('dinosync:progress', data)
    }
    try {
      const settings = readSettings()
      return await runBaseDataSync(profile, send)
    } catch (err) {
      console.error('[dinosync] Lỗi tải dữ liệu gốc:', err)
      send({ phase: 'done', item: 'Lỗi', percent: 100, log: `Lỗi tải dữ liệu gốc: ${err.message}` })
      return { ok: false, error: err.message, stack: err.stack || '' }
    }
  })

  ipcMain.handle('dataSync:run', async (e) => {
    const win = getTrustedWindow(e)
    if (!win) return { error: 'Unauthorized' }
    const profiles = readProfiles().profiles
    const profile = profiles[0]
    if (!profile) return { error: 'Profile not found' }
    const settings = readSettings()
    if (settings.dataSyncEnabled === false) return { ok: false, skipped: true, error: 'disabled' }

    function send(data) {
      if (!win.isDestroyed()) win.webContents.send('dinosync:progress', data)
    }
    try {
      return await runDataSync(profile, send)
    } catch (err) {
      console.error('[dinosync] Lỗi đồng bộ:', err)
      send({ phase: 'done', item: 'Lỗi', percent: 100, log: `Lỗi đồng bộ: ${err.message}` })
      return { ok: false, error: err.message, stack: err.stack || '' }
    }
  })

  ipcMain.handle('data:control', (e, { op, action }) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const { abortOp, setAction } = require('./abortControl.cjs')
    setAction(op, action || 'pause')
    abortOp(op)
    return { ok: true }
  })

  ipcMain.handle('launcher:isRunning', (e, { profileId, accountId }) => {
    if (!getTrustedWindow(e)) return false
    if (accountId) return runningGames.has(makeKey(profileId, accountId))
    for (const k of runningGames.keys()) {
      if (k.startsWith(profileId + '::')) return true
    }
    return false
  })

  ipcMain.handle('launcher:listRunning', (e) => {
    if (!getTrustedWindow(e)) return []
    return Array.from(runningGames.keys()).map(key => {
      const [profileId, accountId] = key.split('::')
      return { profileId, accountId, key }
    })
  })

  ipcMain.handle('launcher:getStats', (e, { profileId }) => {
    if (!getTrustedWindow(e)) return null
    const profilesData = readProfiles()
    const profile = profilesData.profiles.find(p => p.id === profileId)
    if (!profile) return null
    return getProfileStats(profile)
  })

  ipcMain.handle('launcher:getAnalytics', (e, { profileId }) => {
    if (!getTrustedWindow(e)) return null
    const profilesData = readProfiles()
    const profile = profilesData.profiles.find(p => p.id === profileId)
    if (!profile) return null
    return getProfileAnalytics(profile)
  })

  ipcMain.handle('launcher:getLatestLog', (e, { profileId }) => {
    if (!getTrustedWindow(e)) return null
    const profilesData = readProfiles()
    const profile = profilesData.profiles.find(p => p.id === profileId)
    if (!profile) return null

    const logsDir = path.join(profile.instancePath, 'logs')
    if (!fs.existsSync(logsDir)) return null

    try {
      const files = fs.readdirSync(logsDir)
        .filter(f => f.endsWith('.log'))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(logsDir, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime)

      if (files.length === 0) return null

      const latestFile = path.join(logsDir, files[0].name)
      const content = fs.readFileSync(latestFile, 'utf-8')
      const lines = content.split('\n').filter(Boolean)
      return {
        filename: files[0].name,
        mtime: files[0].mtime.toISOString(),
        lines,
        profileName: profile.name,
      }
    } catch {
      return null
    }
  })

  ipcMain.handle('launcher:listLogs', (e, { profileId }) => {
    if (!getTrustedWindow(e)) return []
    const profilesData = readProfiles()
    const profile = profilesData.profiles.find(p => p.id === profileId)
    if (!profile) return []

    const logsDir = path.join(profile.instancePath, 'logs')
    if (!fs.existsSync(logsDir)) return []

    try {
      return fs.readdirSync(logsDir)
        .filter(f => f.endsWith('.log'))
        .map(f => {
          const stat = fs.statSync(path.join(logsDir, f))
          return { filename: f, mtime: stat.mtime.toISOString(), size: stat.size }
        })
        .sort((a, b) => new Date(b.mtime) - new Date(a.mtime))
    } catch {
      return []
    }
  })

  ipcMain.handle('spiget:search', async (e, opts) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const { query = '', size = 20, page = 1 } = opts || {}
    const https = require('https')
    try {
      const data = await new Promise((resolve, reject) => {
        const encoded = encodeURIComponent(query || '*')

        const url = query
          ? `https://api.spiget.org/v2/search/resources/${encoded}?size=${size}&page=${page}&sort=-downloads&fields=id,name,tag,icon,downloads,rating,testedVersions,premium,file`
          : `https://api.spiget.org/v2/resources/free?size=${size}&page=${page}&sort=-downloads&fields=id,name,tag,icon,downloads,rating,testedVersions,premium,file`
        https.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' }, timeout: 8000 }, res => {
          let body = ''
          res.on('data', c => { body += c })
          res.on('end', () => {
            try { resolve(JSON.parse(body)) } catch { resolve([]) }
          })
        }).on('error', reject).on('timeout', reject)
      })

      const list = Array.isArray(data) ? data : (data?.results || [])

      const results = list.map(r => ({
        ...r,
        icon_url: r.icon?.url ? `https://www.spigotmc.org/${r.icon.url}` : null,
        title:    r.name,
        description: r.tag || '',
        downloads: r.downloads || 0,
        resource_id: r.id,
      }))
      return { ok: true, results }
    } catch (err) {
      return { error: err.message }
    }
  })
}

module.exports = { registerLauncherHandlers }

