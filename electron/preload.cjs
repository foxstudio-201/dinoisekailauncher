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

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {

  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow:    () => ipcRenderer.send('window-close'),
  quitApp:        () => ipcRenderer.send('quit-app'),

  getAccounts:   ()        => ipcRenderer.invoke('accounts:get'),
  addAccount:    (account) => ipcRenderer.invoke('accounts:add', account),
  removeAccount: (id)      => ipcRenderer.invoke('accounts:remove', id),
  selectAccount: (id)      => ipcRenderer.invoke('accounts:select', id),
  updateAccount: (id, patch) => ipcRenderer.invoke('accounts:update', { id, patch }),

  getVersion:  () => ipcRenderer.invoke('app:version'),
  getHwid:     () => ipcRenderer.invoke('app:hwid'),

  getSettings:  ()       => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch)  => ipcRenderer.invoke('settings:save', patch),
  isInitialSetupRequired: () => ipcRenderer.invoke('settings:isInitialSetupRequired'),
  pickBgFile:   ()       => ipcRenderer.invoke('bg:pickFile'),
  readBgFile:   (path)   => ipcRenderer.invoke('bg:readFile', path),
  getBackgroundPath: () => ipcRenderer.invoke('app:backgroundPath'),
  getServerStatus: () => ipcRenderer.invoke('server:status'),
  systemBoostMode: (enable) => ipcRenderer.invoke('system:boostMode', enable),

  getProfiles:    ()            => ipcRenderer.invoke('profiles:get'),
  createProfile:  (profileData) => ipcRenderer.invoke('profiles:create', profileData),
  deleteProfile:  (id)          => ipcRenderer.invoke('profiles:delete', id),
  selectProfile:  (id)          => ipcRenderer.invoke('profiles:select', id),
  browseFolder:      ()            => ipcRenderer.invoke('profiles:browse'),
  openProfileFolder: (id)          => ipcRenderer.invoke('profiles:openFolder', id),
  updateProfileRam:  (id, ramGb)   => ipcRenderer.invoke('profiles:updateRam', id, ramGb),

  fabricGetLoaderVersions: (gameVersion) => ipcRenderer.invoke('fabric:getLoaderVersions', gameVersion),

  forgeGetVersions: (gameVersion) => ipcRenderer.invoke('forge:getVersions', gameVersion),

  neoforgeGetVersions: (gameVersion) => ipcRenderer.invoke('neoforge:getVersions', gameVersion),

  minecraftListVersions: () => ipcRenderer.invoke('minecraft:listVersions'),

  importModpack: (opts) => ipcRenderer.invoke('profiles:importModpack', opts),
  onImportProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('import:progress', handler)
    return () => ipcRenderer.removeListener('import:progress', handler)
  },
  saveTempFile: (opts) => ipcRenderer.invoke('profiles:saveTempFile', opts),

  downloadAndImportModpack: (opts) => ipcRenderer.invoke('modpack:downloadAndImport', opts),
  cancelModpackDownload: () => ipcRenderer.invoke('modpack:cancel'),

  browseModpack: ()         => ipcRenderer.invoke('modpack:browse'),
  readModpackMeta: (path)   => ipcRenderer.invoke('modpack:readMeta', path),

  getFilePath: (file) => {
    try {
      const { webUtils } = require('electron')
      return webUtils.getPathForFile(file)
    } catch {
      return null
    }
  },

  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  modrinthSearch:          (opts)           => ipcRenderer.invoke('modrinth:search', opts),
  spigetSearch:            (opts)           => ipcRenderer.invoke('spiget:search', opts),
  modrinthGetProject:      (idOrSlug)       => ipcRenderer.invoke('modrinth:getProject', idOrSlug),
  modrinthGetVersions:     (idOrSlug, f)    => ipcRenderer.invoke('modrinth:getVersions', idOrSlug, f),
  modrinthInstall:         (opts)           => ipcRenderer.invoke('modrinth:install', opts),
  modrinthGetGameVersions: ()               => ipcRenderer.invoke('modrinth:getGameVersions'),
  modrinthGetCategories:   ()               => ipcRenderer.invoke('modrinth:getCategories'),
  onModrinthInstallProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('modrinth:installProgress', handler)
    return () => ipcRenderer.removeListener('modrinth:installProgress', handler)
  },

  curseforgeSearch:          (opts)           => ipcRenderer.invoke('curseforge:search', opts),
  curseforgeGetProject:      (id)             => ipcRenderer.invoke('curseforge:getProject', id),
  curseforgeGetVersions:     (id, f)          => ipcRenderer.invoke('curseforge:getVersions', id, f),
  curseforgeGetCategories:   (type)           => ipcRenderer.invoke('curseforge:getCategories', type),
  curseforgeInstall:         (opts)           => ipcRenderer.invoke('curseforge:install', opts),
  onCurseForgeInstallProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('curseforge:installProgress', handler)
    return () => ipcRenderer.removeListener('curseforge:installProgress', handler)
  },

  technicSearch:          (opts)           => ipcRenderer.invoke('technic:search', opts),
  technicGetProject:      (id)             => ipcRenderer.invoke('technic:getProject', id),
  technicGetVersions:     (id)             => ipcRenderer.invoke('technic:getVersions', id),
  technicInstall:         (opts)           => ipcRenderer.invoke('technic:install', opts),
  onTechnicInstallProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('technic:installProgress', handler)
    return () => ipcRenderer.removeListener('technic:installProgress', handler)
  },

  ftbSearch:          (opts)  => ipcRenderer.invoke('ftb:search', opts),
  ftbGetProject:      (id)    => ipcRenderer.invoke('ftb:getProject', id),
  ftbGetVersions:     (id)    => ipcRenderer.invoke('ftb:getVersions', id),
  ftbInstall:         (opts)  => ipcRenderer.invoke('ftb:install', opts),
  onFtbInstallProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('ftb:installProgress', handler)
    return () => ipcRenderer.removeListener('ftb:installProgress', handler)
  },

  launchGame:      (opts)       => ipcRenderer.invoke('launcher:launch', opts),
  stopGame:        (opts)       => ipcRenderer.invoke('launcher:stop', opts),
  preDownload:     (opts)       => ipcRenderer.invoke('launcher:preDownload', opts),
  onPreDownloadProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('launcher:predownload:progress', handler)
    return () => ipcRenderer.removeListener('launcher:predownload:progress', handler)
  },
  isGameRunning:   (opts)       => ipcRenderer.invoke('launcher:isRunning', opts),
  checkDataSync:   ()           => ipcRenderer.invoke('dataSync:check'),
  runDataSync:     ()           => ipcRenderer.invoke('dataSync:run'),
  onDataSyncProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('dinosync:progress', handler)
    return () => ipcRenderer.removeListener('dinosync:progress', handler)
  },
  listRunningGames: ()          => ipcRenderer.invoke('launcher:listRunning'),
  getProfileStats: (opts) => ipcRenderer.invoke('launcher:getStats', opts),
  getProfileAnalytics: (opts) => ipcRenderer.invoke('launcher:getAnalytics', opts),
  getLatestLog:    (opts)       => ipcRenderer.invoke('launcher:getLatestLog', opts),
  listLogs:        (opts)       => ipcRenderer.invoke('launcher:listLogs', opts),
  onLaunchProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('launcher:progress', handler)
    return () => ipcRenderer.removeListener('launcher:progress', handler)
  },
  onLaunchLog: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('launcher:log', handler)
    return () => ipcRenderer.removeListener('launcher:log', handler)
  },
  onLaunchLogUpdate: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('launcher:logUpdate', handler)
    return () => ipcRenderer.removeListener('launcher:logUpdate', handler)
  },
  onGameStopped: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('launcher:stopped', handler)
    return () => ipcRenderer.removeListener('launcher:stopped', handler)
  },

  saveSkinPrefs: (opts) => ipcRenderer.invoke('skin:savePrefs', opts),
  getSkinPrefs:  (opts) => ipcRenderer.invoke('skin:getPrefs', opts),
  uploadSkinToWeb: (opts) => ipcRenderer.invoke('skin:uploadToWeb', opts),

  profileListMods:          (profileId, accountId)            => ipcRenderer.invoke('profile:listMods', profileId, accountId),
  profileGetInstalledContent: (profileId)                     => ipcRenderer.invoke('profile:getInstalledContent', profileId),
  profileMatchInstalledContent: (profileId)                   => ipcRenderer.invoke('profile:matchInstalledContent', profileId),
  onContentScanDone:          (cb)                            => {
    const listener = (_e, profileId) => cb(profileId)
    ipcRenderer.on('content:scanDone', listener)
    return () => ipcRenderer.removeListener('content:scanDone', listener)
  },
  profileToggleMod:         (profileId, fileName, accountId)  => ipcRenderer.invoke('profile:toggleMod', profileId, fileName, accountId),
  profileDeleteMod:         (profileId, fileName, accountId)  => ipcRenderer.invoke('profile:deleteMod', profileId, fileName, accountId),
  profileGetModMeta:        (profileId, fileName, accountId)  => ipcRenderer.invoke('profile:getModMeta', profileId, fileName, accountId),
  profileGetShaderMeta:     (profileId, fileName, accountId)  => ipcRenderer.invoke('profile:getShaderMeta', profileId, fileName, accountId),
  profileGetResourcePackMeta: (profileId, fileName, accountId) => ipcRenderer.invoke('profile:getResourcePackMeta', profileId, fileName, accountId),
  profileListShaders:       (profileId, accountId)            => ipcRenderer.invoke('profile:listShaders', profileId, accountId),
  profileDeleteShader:      (profileId, f, sub, accountId)    => ipcRenderer.invoke('profile:deleteShader', profileId, f, sub, accountId),
  profileListResourcePacks: (profileId, accountId)            => ipcRenderer.invoke('profile:listResourcePacks', profileId, accountId),
  profileDeleteResourcePack:(profileId, fileName, accountId)  => ipcRenderer.invoke('profile:deleteResourcePack', profileId, fileName, accountId),
  profileInstallFile:       (profileId, type, srcPath, accountId) => ipcRenderer.invoke('profile:installFile', profileId, type, srcPath, accountId),
  profileListWorlds:        (profileId, accountId)            => ipcRenderer.invoke('profile:listWorlds', profileId, accountId),
  profileDeleteWorld:       (profileId, folder, accountId)    => ipcRenderer.invoke('profile:deleteWorld', profileId, folder, accountId),
  profileListDirFull:       (profileId, subPath, accountId)   => ipcRenderer.invoke('profile:listDirFull', profileId, subPath, accountId),
  profileUpdate:            (profileId, patch)     => ipcRenderer.invoke('profile:update', profileId, patch),
  profileListJavas:         ()                     => ipcRenderer.invoke('profile:listJavas'),

  javaFetchDistros: (profileId) => ipcRenderer.invoke('java:fetchDistros', profileId),
  javaGetInstalled: (profileId) => ipcRenderer.invoke('java:getInstalled', profileId),
  javaInstall:      (pkg, profileId) => ipcRenderer.invoke('java:install', pkg, profileId),
  javaInstallToDir: (pkg, dir)       => ipcRenderer.invoke('java:installToDir', pkg, dir),
  javaSelect:       (profileId, javaExe) => ipcRenderer.invoke('java:select', profileId, javaExe),
  javaDelete:       (profileId, distro, javaVersion) => ipcRenderer.invoke('java:delete', profileId, distro, javaVersion),
  onJavaInstallProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('java:installProgress', handler)
    return () => ipcRenderer.removeListener('java:installProgress', handler)
  },

  serverList:          ()                    => ipcRenderer.invoke('server:list'),
  serverCreate:        (opts)                => ipcRenderer.invoke('server:create', opts),
  serverDelete:        (id)                  => ipcRenderer.invoke('server:delete', id),
  serverUpdate:        (id, patch)           => ipcRenderer.invoke('server:update', id, patch),
  serverDownloadJar:   (id)                  => ipcRenderer.invoke('server:downloadJar', id),
  serverStart:         (id)                  => ipcRenderer.invoke('server:start', id),
  serverStop:          (id)                  => ipcRenderer.invoke('server:stop', id),
  serverRestart:       (id)                  => ipcRenderer.invoke('server:restart', id),
  serverSendCommand:   (id, cmd)             => ipcRenderer.invoke('server:sendCommand', id, cmd),
  serverGetLogs:       (id)                  => ipcRenderer.invoke('server:getLogs', id),
  serverGetStats:      (id)                  => ipcRenderer.invoke('server:getStats', id),
  serverGetStatus:     (id)                  => ipcRenderer.invoke('server:getStatus', id),
  serverReadServerProps:  (id)               => ipcRenderer.invoke('server:readServerProps', id),
  serverWriteServerProps: (id, patch)        => ipcRenderer.invoke('server:writeServerProps', id, patch),
  serverGetWhitelist:  (id)                  => ipcRenderer.invoke('server:getWhitelist', id),
  serverAddWhitelist:  (id, name, uuid)      => ipcRenderer.invoke('server:addWhitelist', id, name, uuid),
  serverRemoveWhitelist:(id, names)          => ipcRenderer.invoke('server:removeWhitelist', id, names),
  serverGetBanlist:    (id)                  => ipcRenderer.invoke('server:getBanlist', id),
  serverUnban:         (id, names)           => ipcRenderer.invoke('server:unban', id, names),
  serverUpdateConfig:  (id, patch)           => ipcRenderer.invoke('server:updateConfig', id, patch),
  serverListDir:       (id, sub)             => ipcRenderer.invoke('server:listDir', id, sub),
  serverListDirFull:   (id, sub)             => ipcRenderer.invoke('server:listDirFull', id, sub),
  serverListFiles:     (id)                  => ipcRenderer.invoke('server:listFiles', id),
  serverReadFile:      (id, filePath)        => ipcRenderer.invoke('server:readFile', id, filePath),
  serverWriteFile:     (id, filePath, content) => ipcRenderer.invoke('server:writeFile', id, filePath, content),
  serverDeleteItems:   (id, paths)           => ipcRenderer.invoke('server:deleteItems', id, paths),
  serverCompress:      (id, paths, zipName)  => ipcRenderer.invoke('server:compress', id, paths, zipName),
  serverExtract:       (id, filePath)        => ipcRenderer.invoke('server:extract', id, filePath),
  serverUploadFile:    (id, sub, name, b64)  => ipcRenderer.invoke('server:uploadFile', id, sub, name, b64),
  serverGetNetworkInfo:(id)                  => ipcRenderer.invoke('server:getNetworkInfo', id),
  serverStartTunnel:   (id, port)            => ipcRenderer.invoke('server:startTunnel', id, port),
  serverStopTunnel:    (id)                  => ipcRenderer.invoke('server:stopTunnel', id),
  onServerTunnelLog:   (cb) => {
    const handler = (_, data) => cb(data)
    require('electron').ipcRenderer.on('server:tunnelLog', handler)
    return () => require('electron').ipcRenderer.removeListener('server:tunnelLog', handler)
  },

  // ── LAN World Auto-Tunnel ──────────────────────────────────────────────────
  lanStartScan:  ()  => ipcRenderer.invoke('lan:startScan'),
  lanStopScan:   ()  => ipcRenderer.invoke('lan:stopScan'),
  lanStopTunnel: ()  => ipcRenderer.invoke('lan:stopTunnel'),
  lanGetStatus:  ()  => ipcRenderer.invoke('lan:getStatus'),
  lanOpenWindow: ()  => ipcRenderer.invoke('lan:openWindow'),
  closeLanWindow: () => ipcRenderer.send('lan:closeWindow'),

  onLanDetected: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('lan:detected', handler)
    return () => ipcRenderer.removeListener('lan:detected', handler)
  },
  onLanScanning: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('lan:scanning', handler)
    return () => ipcRenderer.removeListener('lan:scanning', handler)
  },
  onLanTunnelStatus: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('lan:tunnelStatus', handler)
    return () => ipcRenderer.removeListener('lan:tunnelStatus', handler)
  },
  offLanTunnelStatus: (cb) => ipcRenderer.removeListener('lan:tunnelStatus', cb),
  onLanTunnelLog: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('lan:tunnelLog', handler)
    return () => ipcRenderer.removeListener('lan:tunnelLog', handler)
  },
  offLanTunnelLog: (cb) => ipcRenderer.removeListener('lan:tunnelLog', cb),
  onLanWindowData: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('lan:windowData', handler)
    return () => ipcRenderer.removeListener('lan:windowData', handler)
  },
  offLanWindowData: (cb) => ipcRenderer.removeListener('lan:windowData', cb),
  onLanError: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('lan:error', handler)
    return () => ipcRenderer.removeListener('lan:error', handler)
  },

  // ── Skin/Cape Local Files (for offline Authlib-Injector) ─────────────────
  saveSkinLocalFile:   (opts)              => ipcRenderer.invoke('skin:saveLocalFile', opts),
  getSkinLocalStatus:  (uuid)              => ipcRenderer.invoke('skin:getLocalStatus', { uuid }),
  deleteSkinLocalFile: (opts)              => ipcRenderer.invoke('skin:deleteLocalFile', opts),

  // ── VoxelX P2P LAN (WireGuard) ────────────────────────────────────────────
  vxlanCheck:  ()                    => ipcRenderer.invoke('vxlan:check'),
  vxlanCreate: (opts)                => ipcRenderer.invoke('vxlan:create', opts),
  vxlanJoin:   (opts)                => ipcRenderer.invoke('vxlan:join', opts),
  vxlanLeave:  ()                    => ipcRenderer.invoke('vxlan:leave'),
  vxlanState:  ()                    => ipcRenderer.invoke('vxlan:state'),
  vxlanRelaunchAsAdmin: ()           => ipcRenderer.invoke('vxlan:relaunchAsAdmin'),

  onVxlanLog: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('vxlan:log', handler)
    return () => ipcRenderer.removeListener('vxlan:log', handler)
  },
  onVxlanCreated: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('vxlan:created', handler)
    return () => ipcRenderer.removeListener('vxlan:created', handler)
  },
  onVxlanJoined: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('vxlan:joined', handler)
    return () => ipcRenderer.removeListener('vxlan:joined', handler)
  },
  onVxlanPeers: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('vxlan:peers', handler)
    return () => ipcRenderer.removeListener('vxlan:peers', handler)
  },
  onVxlanLeft: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('vxlan:left', handler)
    return () => ipcRenderer.removeListener('vxlan:left', handler)
  },
})

