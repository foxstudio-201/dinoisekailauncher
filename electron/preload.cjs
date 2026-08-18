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

  getFilePath: (file) => {
    try {
      const { webUtils } = require('electron')
      return webUtils.getPathForFile(file)
    } catch {
      return null
    }
  },

  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  spigetSearch:            (opts)           => ipcRenderer.invoke('spiget:search', opts),

  launchGame:      (opts)       => ipcRenderer.invoke('launcher:launch', opts),
  stopGame:        (opts)       => ipcRenderer.invoke('launcher:stop', opts),
  preDownload:     (opts)       => ipcRenderer.invoke('launcher:preDownload', opts),
  hasGameResources:(opts)       => ipcRenderer.invoke('launcher:hasGameResources', opts),
  onPreDownloadProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('launcher:predownload:progress', handler)
    return () => ipcRenderer.removeListener('launcher:predownload:progress', handler)
  },
  isGameRunning:   (opts)       => ipcRenderer.invoke('launcher:isRunning', opts),
  checkDataSync:   ()           => ipcRenderer.invoke('dataSync:check'),
  runDataSync:     ()           => ipcRenderer.invoke('dataSync:run'),
  checkBaseData:   ()           => ipcRenderer.invoke('dataSync:checkBase'),
  runBaseDataSync: ()           => ipcRenderer.invoke('dataSync:runBase'),
  runRepairDataSync: ()         => ipcRenderer.invoke('dataSync:repair'),
  optionsBackupInfo: ()         => ipcRenderer.invoke('dataSync:optionsBackupInfo'),
  optionsBackup:    ()          => ipcRenderer.invoke('dataSync:optionsBackup'),
  cfPackCheck:     (opts)       => ipcRenderer.invoke('cfpack:check', opts),
  cfPackRun:       (opts)       => ipcRenderer.invoke('cfpack:run', opts),
  onCfPackProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('cfpack:progress', handler)
    return () => ipcRenderer.removeListener('cfpack:progress', handler)
  },
  dataControl:     (opts)       => ipcRenderer.invoke('data:control', opts),
  onDataSyncProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('dinosync:progress', handler)
    return () => ipcRenderer.removeListener('dinosync:progress', handler)
  },
  onRepairProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('repair:progress', handler)
    return () => ipcRenderer.removeListener('repair:progress', handler)
  },
  checkUpdate:      ()       => ipcRenderer.invoke('update:check'),
  downloadUpdate:   ()       => ipcRenderer.invoke('update:download'),
  installUpdate:    (p)      => ipcRenderer.invoke('update:install', { installerPath: p }),
  getSystemInfo:    ()       => ipcRenderer.invoke('system:info'),
  onUpdateProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('updater:progress', handler)
    return () => ipcRenderer.removeListener('updater:progress', handler)
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


  profileListMods:          (profileId, accountId)            => ipcRenderer.invoke('profile:listMods', profileId, accountId),
  profileGetInstalledContent: (profileId)                     => ipcRenderer.invoke('profile:getInstalledContent', profileId),
  onContentScanDone:          (cb)                            => {
    const listener = (_e, profileId) => cb(profileId)
    ipcRenderer.on('content:scanDone', listener)
    return () => ipcRenderer.removeListener('content:scanDone', listener)
  },
  profileToggleMod:         (profileId, fileName, accountId)  => ipcRenderer.invoke('profile:toggleMod', profileId, fileName, accountId),
  profileDeleteMod:         (profileId, fileName, accountId)  => ipcRenderer.invoke('profile:deleteMod', profileId, fileName, accountId),
  profileListShaders:       (profileId, accountId)            => ipcRenderer.invoke('profile:listShaders', profileId, accountId),
  profileDeleteShader:      (profileId, f, sub, accountId)    => ipcRenderer.invoke('profile:deleteShader', profileId, f, sub, accountId),
  profileListResourcePacks: (profileId, accountId)            => ipcRenderer.invoke('profile:listResourcePacks', profileId, accountId),
  profileDeleteResourcePack:(profileId, fileName, accountId)  => ipcRenderer.invoke('profile:deleteResourcePack', profileId, fileName, accountId),
  profileInstallFile:       (profileId, type, srcPath, accountId) => ipcRenderer.invoke('profile:installFile', profileId, type, srcPath, accountId),
  profileListWorlds:        (profileId, accountId)            => ipcRenderer.invoke('profile:listWorlds', profileId, accountId),
  profileDeleteWorld:       (profileId, folder, accountId)    => ipcRenderer.invoke('profile:deleteWorld', profileId, folder, accountId),
  profileListDirFull:       (profileId, subPath, accountId)   => ipcRenderer.invoke('profile:listDirFull', profileId, subPath, accountId),
  profileDeletePath:        (profileId, subPath)              => ipcRenderer.invoke('profile:deletePath', profileId, subPath),
  profileUploadTo:          (profileId, subPath, srcPaths)    => ipcRenderer.invoke('profile:uploadTo', profileId, subPath, srcPaths),
  profileReadOptions:       (profileId)                       => ipcRenderer.invoke('profile:readOptions', profileId),
  profileWriteOptions:      (profileId, newOptions)           => ipcRenderer.invoke('profile:writeOptions', profileId, newOptions),
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

})

