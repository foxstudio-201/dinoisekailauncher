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














 
















const { ipcMain, dialog, shell } = require('electron')
const path  = require('path')
const fs    = require('fs')
const { app } = require('electron')

const DATA_DIR      = path.join(app.getPath('appData'), '.DinoIsekai')
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json')
const INSTANCES_DIR = path.join(DATA_DIR, 'instances')

const FIXED_GAME_VERSION = '1.20.1'
const FIXED_FORGE_VERSION = '47.4.22'
const FIXED_LOADER = 'forge'
const FIXED_PROFILE_NAME = 'Dino Isekai'
const NIGHTFALL_PROFILE_NAME = 'NightfallCraft - The Casket of Reveries'

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function ensureProfilesFile() {
  ensureDir(DATA_DIR)
  if (!fs.existsSync(PROFILES_FILE)) {
    fs.writeFileSync(
      PROFILES_FILE,
      JSON.stringify({ profiles: [], selectedProfileId: null }, null, 2),
      { mode: 0o600 }
    )
  }
}

function readProfiles() {
  ensureProfilesFile()
  try {
    const data = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'))
    if (!Array.isArray(data.profiles)) data.profiles = []
    return data
  } catch {
    return { profiles: [], selectedProfileId: null }
  }
}

function writeProfiles(data) {
  ensureProfilesFile()
  const tmp = PROFILES_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, PROFILES_FILE)
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function slugifyName(name) {
  return String(name || 'profile')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'profile'
}

function uniqueInstanceDir(baseName, existingPaths) {
  const slug = slugifyName(baseName)
  let folder = slug
  let n = 2
  const isTaken = p => {
    const resolved = path.resolve(p)
    return existingPaths.some(ex => path.resolve(ex) === resolved)
  }
  while (isTaken(path.join(INSTANCES_DIR, folder))) {
    folder = `${slug}-${n}`
    n++
  }
  return path.join(INSTANCES_DIR, folder)
}

function validateId(id) {
  return typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id)
}

function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') return 'Dữ liệu không hợp lệ'
  if (profile.loader && profile.loader !== FIXED_LOADER) return 'Chỉ hỗ trợ loader Forge'
  if (typeof profile.gameVersion !== 'string') return 'Phiên bản game không hợp lệ'
  return null
}

function createDefaultProfile(name = FIXED_PROFILE_NAME) {
  const existing = readProfiles().profiles.map(p => p.instancePath).filter(Boolean)
  const instancePath = uniqueInstanceDir(name, existing)
  ensureDir(instancePath)
  return {
    id:           generateUUID(),
    name,
    loader:       FIXED_LOADER,
    gameVersion:  FIXED_GAME_VERSION,
    loaderVersion: FIXED_FORGE_VERSION,
    jvmArgs:      '',
    instancePath,
    isCustomPath: false,
    createdAt:    new Date().toISOString(),
    lastPlayed:   null,
    sizeBytes:    0,
    importSource:  null,
    importIconUrl: null,
    importBgUrl:   null,
  }
}

function normalizeSingleForgeProfile(data) {
  if (!data || typeof data !== 'object') data = { profiles: [], selectedProfileId: null }
  if (!Array.isArray(data.profiles)) data.profiles = []
  const names = [FIXED_PROFILE_NAME, NIGHTFALL_PROFILE_NAME]
  const existing = data.profiles.filter(p => p && p.id && names.includes(p.name))
  let changed = existing.length !== data.profiles.length
  for (const name of names) {
    let p = existing.find(x => x.name === name)
    if (!p) {
      p = createDefaultProfile(name)
      existing.push(p)
      changed = true
    }
    if (p.loader !== FIXED_LOADER)          { p.loader = FIXED_LOADER; changed = true }
    if (p.gameVersion !== FIXED_GAME_VERSION) { p.gameVersion = FIXED_GAME_VERSION; changed = true }
    if (!p.loaderVersion || p.loaderVersion !== FIXED_FORGE_VERSION) {
      p.loaderVersion = FIXED_FORGE_VERSION
      changed = true
    }
  }
  const dino = existing.find(x => x.name === FIXED_PROFILE_NAME)
  const night = existing.find(x => x.name === NIGHTFALL_PROFILE_NAME)
  data.profiles = [dino, night]
  if (!data.selectedProfileId || !data.profiles.find(p => p.id === data.selectedProfileId)) {
    data.selectedProfileId = dino.id
    changed = true
  }
  return { changed, data }
}

const _sizeCache = new Map() 
const SIZE_CACHE_TTL = 60_000 

function getDirSizeBytes(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0

    const cached = _sizeCache.get(dirPath)
    if (cached) {
      const age = Date.now() - cached.ts
      if (age < SIZE_CACHE_TTL) return cached.size
      try {
        const mtime = fs.statSync(dirPath).mtimeMs
        if (mtime === cached.mtime) {
          cached.ts = Date.now() 
          return cached.size
        }
      } catch {}
    }

    const size = calcDirSize(dirPath, 0)
    const mtime = fs.statSync(dirPath).mtimeMs
    _sizeCache.set(dirPath, { size, mtime, ts: Date.now() })
    return size
  } catch {
    return 0
  }
}

function calcDirSize(dirPath, depth) {
  if (depth > 6) return 0
  try {
    let total = 0
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && (entry.name === 'natives' || entry.name === 'logs' || entry.name === '.git')) continue
      const full = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        total += calcDirSize(full, depth + 1)
      } else {
        try { total += fs.statSync(full).size } catch {}
      }
    }
    return total
  } catch {
    return 0
  }
}

function getDirSizeLazy(dirPath) {
  const cached = _sizeCache.get(dirPath)
  if (cached) {
    const age = Date.now() - cached.ts
    if (age < SIZE_CACHE_TTL) return cached.size
    try {
      const mtime = fs.statSync(dirPath).mtimeMs
      if (mtime === cached.mtime) { cached.ts = Date.now(); return cached.size }
    } catch {}
  }
  setImmediate(() => {
    try {
      if (!fs.existsSync(dirPath)) return
      const size = calcDirSize(dirPath, 0)
      const mtime = fs.statSync(dirPath).mtimeMs
      _sizeCache.set(dirPath, { size, mtime, ts: Date.now() })
    } catch {}
  })
  return cached?.size ?? 0
}



function getGameDir(profile, accountId) {
  return profile?.instancePath || null
}

function registerProfileHandlers(getTrustedWindow) {
  ipcMain.handle('profiles:get', (e) => {
    if (!getTrustedWindow(e)) return { profiles: [], selectedProfileId: null }
    const norm = normalizeSingleForgeProfile(readProfiles())
    if (norm.changed) writeProfiles(norm.data)
    norm.data.profiles = norm.data.profiles.map(p => ({
      ...p,
      sizeBytes: getDirSizeLazy(p.instancePath),
    }))
    return norm.data
  })

  ipcMain.handle('profiles:create', (e, profileData) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const err = validateProfile(profileData)
    if (err) return { error: err }
    const id = generateUUID()
    const now = new Date().toISOString()
    const name = (profileData.name && profileData.name.trim())
      ? profileData.name.trim()
      : FIXED_PROFILE_NAME
    let instancePath = profileData.instancePath
    let isCustomPath = false
    if (instancePath && instancePath.trim()) {
      isCustomPath = true
      instancePath = instancePath.trim()
    } else {
      const existing = readProfiles().profiles.map(p => p.instancePath).filter(Boolean)
      instancePath = uniqueInstanceDir(name, existing)
      isCustomPath = false
    }
    try {
      ensureDir(instancePath)
    } catch (ex) {
      return { error: `Không thể tạo thư mục: ${ex.message}` }
    }
    const profile = {
      id,
      name,
      loader:        FIXED_LOADER,
      gameVersion:   FIXED_GAME_VERSION,
      loaderVersion: FIXED_FORGE_VERSION,
      jvmArgs:       '',
      instancePath,
      isCustomPath,
      createdAt:     now,
      lastPlayed:    null,
      sizeBytes:     0,
      importSource:  profileData.importSource  || null,
      importIconUrl: profileData.importIconUrl || null,
      importBgUrl:   profileData.importBgUrl   || null,
    }
    const data = readProfiles()
    data.profiles.push(profile)
    if (!data.selectedProfileId) data.selectedProfileId = id
    writeProfiles(data)
    return { ok: true, profile, data }
  })

  ipcMain.handle('profiles:delete', (e, id) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    if (!validateId(id)) return { error: 'ID không hợp lệ' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === id)
    if (!profile) return { error: 'Profile không tồn tại' }
    if (!profile.isCustomPath) {
      const normalizedPath = path.resolve(profile.instancePath)
      const normalizedInstances = path.resolve(INSTANCES_DIR)
      if (normalizedPath.startsWith(normalizedInstances)) {
        try {
          if (fs.existsSync(normalizedPath)) {
            fs.rmSync(normalizedPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
          }
        } catch (ex) {
          try { fs.rmSync(normalizedPath, { recursive: true, force: true }) } catch {}
        }
      }
    }
    data.profiles = data.profiles.filter(p => p.id !== id)
    if (data.selectedProfileId === id) {
      data.selectedProfileId = data.profiles[0]?.id ?? null
    }
    writeProfiles(data)
    return { ok: true, data }
  })

  ipcMain.handle('profiles:select', (e, id) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    if (!validateId(id)) return { error: 'ID không hợp lệ' }
    const data = readProfiles()
    if (!data.profiles.find(p => p.id === id)) return { error: 'Profile không tồn tại' }
    data.selectedProfileId = id
    writeProfiles(data)
    return { ok: true, data }
  })

  ipcMain.handle('profiles:browse', async (e) => {
    const win = getTrustedWindow(e)
    if (!win) return { error: 'Unauthorized' }
    const result = await dialog.showOpenDialog(win, {
      title:       'Chọn thư mục instance',
      buttonLabel: 'Chọn thư mục',
      properties:  ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || !result.filePaths.length) return { canceled: true }
    return { ok: true, path: result.filePaths[0] }
  })

  ipcMain.handle('profiles:updateRam', (e, id, ramGb) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    if (!validateId(id)) return { error: 'ID không hợp lệ' }
    const gb = Number(ramGb)
    if (!Number.isFinite(gb) || gb < 1 || gb > 64) return { error: 'RAM không hợp lệ' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === id)
    if (!profile) return { error: 'Profile không tồn tại' }
    profile.ramGb = gb
    writeProfiles(data)
    return { ok: true }
  })

  ipcMain.handle('profiles:openFolder', async (e, id) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    if (!validateId(id)) return { error: 'ID không hợp lệ' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === id)
    if (!profile) return { error: 'Profile không tồn tại' }
    const folderPath = profile.instancePath
    if (!fs.existsSync(folderPath)) {
      try { ensureDir(folderPath) } catch {}
    }
    const err = await shell.openPath(folderPath)
    if (err) return { error: err }
    return { ok: true }
  })
}

function registerProfileContentHandlers(getTrustedWindow) {


  function metaCacheFilePath(gameDir) {
    return path.join(gameDir, '.content-meta.json')
  }

  function readMetaCache(gameDir) {
    try { return JSON.parse(fs.readFileSync(metaCacheFilePath(gameDir), 'utf8')) } catch { return {} }
  }


  ipcMain.handle('profile:listMods', async (e, profileId, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { ok: false, error: 'Profile not found' }
    const gameDir = profile.instancePath
    if (!gameDir) return { ok: false, error: 'Profile instancePath not set' }
    const modDir = path.join(gameDir, 'mods')
    ensureDir(modDir)
    const files = fs.readdirSync(modDir).filter(f => /\.(jar|jar\.off|jar\.disabled)$/i.test(f))
    const mods = files.map(f => {
      const fullPath = path.join(modDir, f)
      const stat = fs.statSync(fullPath)
      const enabled = !f.endsWith('.off') && !f.endsWith('.disabled')
      return {
        fileName: f,
        displayName: f.replace(/\.jar(\.off|\.disabled)?$/i, ''),
        enabled,
        size: stat.size,
        mtime: stat.mtimeMs
      }
    })
    return { ok: true, mods }
  })


  ipcMain.handle('profile:getInstalledContent', async (e, profileId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { ok: false, error: 'Profile not found' }
    const gameDir = profile.instancePath
    if (!gameDir) return { ok: false, error: 'Profile instancePath not set' }
    const folders = [
      ['mod',          'mods'],
      ['shader',       'shaderpacks'],
      ['resourcepack', 'resourcepacks'],
      ['modpack',      'modpacks'],
      ['datapack',     'datapacks'],
    ]
    const installed = {}
    const files = {}
    for (const [type, folder] of folders) {
      const dir = path.join(gameDir, folder)
      const trackPath = path.join(dir, '.installed.json')
      let tracking = {}
      try { tracking = JSON.parse(fs.readFileSync(trackPath, 'utf8')) } catch {}
      for (const [pid, info] of Object.entries(tracking)) {
        const filename = (typeof info === 'string') ? info : info.filename
        installed[pid] = {
          type,
          filename,
          versionId: (typeof info === 'object' && info !== null) ? info.versionId : null,
          versionNumber: (typeof info === 'object' && info !== null) ? info.versionNumber : null,
          datePublished: (typeof info === 'object' && info !== null) ? info.datePublished : null,
          platform: (typeof info === 'object' && info !== null) ? (info.platform || null) : null,
        }
      }
      files[type] = []
      if (!fs.existsSync(dir)) continue
      files[type] = fs.readdirSync(dir).filter(f =>
        type === 'mod' ? /\.jar(\.off|\.disabled)?$/i.test(f) : /\.zip$/i.test(f)
      )
    }
    const metaCacheFile = readMetaCache(gameDir)
    const meta = {}
    for (const [key, m] of Object.entries(metaCacheFile)) {
      if (!m || typeof m !== 'object') continue
      const sep = key.indexOf(':')
      if (sep === -1) continue
      meta[key] = m
    }
    return { ok: true, installed, files, meta }
  })


  ipcMain.handle('profile:toggleMod', async (e, profileId, fileName, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    if (typeof profileId !== 'string') return { ok: false, error: `Invalid profileId: ${profileId}` }
    if (typeof fileName !== 'string') return { ok: false, error: `Invalid fileName: ${fileName}` }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { ok: false, error: 'Profile not found' }
    const gameDir = profile.instancePath
    if (!gameDir) return { ok: false, error: `Profile instancePath not set (instancePath=${profile.instancePath})` }
    const modDir = path.join(gameDir, 'mods')
    const oldPath = path.join(modDir, fileName)
    if (!fs.existsSync(oldPath)) return { ok: false, error: 'File not found' }
    const newName = (fileName.endsWith('.off') || fileName.endsWith('.disabled'))
      ? fileName.replace(/\.(off|disabled)$/, '')
      : fileName + '.off'
    fs.renameSync(oldPath, path.join(modDir, newName))
    return { ok: true, newFileName: newName, enabled: !newName.endsWith('.off') }
  })

  ipcMain.handle('profile:deleteMod', (e, profileId, fileName, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = profile.instancePath
    if (!gameDir) return { error: 'Profile instancePath not set' }
    const filePath = path.join(gameDir, 'mods', fileName)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return { ok: true }
  })


  ipcMain.handle('profile:listShaders', async (e, profileId, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = profile.instancePath
    if (!gameDir) return { error: 'Profile instancePath not set' }
    const shadersDir = path.join(gameDir, 'shaderpacks')
    ensureDir(shadersDir)
    const files = fs.readdirSync(shadersDir)
    const shaders = files.map(f => {
      const stat = fs.statSync(path.join(shadersDir, f))
      return { fileName: f, displayName: f, size: stat.size, mtime: stat.mtimeMs, isDir: stat.isDirectory() }
    })
    return { ok: true, shaders }
  })


  ipcMain.handle('profile:deleteShader', (e, profileId, fileName, subDir, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = profile.instancePath
    if (!gameDir) return { error: 'Profile instancePath not set' }
    const targetPath = path.join(gameDir, 'shaderpacks', fileName)
    if (fs.existsSync(targetPath)) {
      if (fs.statSync(targetPath).isDirectory()) fs.rmSync(targetPath, { recursive: true })
      else fs.unlinkSync(targetPath)
    }
    return { ok: true }
  })

  ipcMain.handle('profile:listResourcePacks', async (e, profileId, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = profile.instancePath
    if (!gameDir) return { error: 'Profile instancePath not set' }
    const rpDir = path.join(gameDir, 'resourcepacks')
    ensureDir(rpDir)
    const files = fs.readdirSync(rpDir)
    const packs = files.map(f => {
      const stat = fs.statSync(path.join(rpDir, f))
      return { fileName: f, displayName: f, size: stat.size, mtime: stat.mtimeMs, isDir: stat.isDirectory() }
    })
    return { ok: true, packs }
  })


  ipcMain.handle('profile:deleteResourcePack', (e, profileId, fileName, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = profile.instancePath
    if (!gameDir) return { error: 'Profile instancePath not set' }
    const targetPath = path.join(gameDir, 'resourcepacks', fileName)
    if (fs.existsSync(targetPath)) {
      if (fs.statSync(targetPath).isDirectory()) fs.rmSync(targetPath, { recursive: true })
      else fs.unlinkSync(targetPath)
    }
    return { ok: true }
  })

  ipcMain.handle('profile:installFile', async (e, profileId, type, srcPath, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }

    const dirMap = { mod: 'mods', shader: 'shaderpacks', resourcepack: 'resourcepacks' }
    const subDir = dirMap[type]
    if (!subDir) return { error: 'Invalid type' }

    const gameDir = profile.instancePath
    if (!gameDir) return { error: 'Profile instancePath not set' }
    const destDir = path.join(gameDir, subDir)
    ensureDir(destDir)

    const fileName = path.basename(srcPath)
    const destPath = path.join(destDir, fileName)

    if (fs.existsSync(destPath)) return { ok: true, fileName, skipped: true }

    fs.copyFileSync(srcPath, destPath)
    const stat = fs.statSync(destPath)
    return { ok: true, fileName, size: stat.size, mtime: stat.mtimeMs, skipped: false }
  })

  ipcMain.handle('profile:listWorlds', async (e, profileId, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = getGameDir(profile, accountId)
    const savesDir = path.join(gameDir, 'saves')
    ensureDir(savesDir)
    const files = fs.readdirSync(savesDir).filter(f => fs.statSync(path.join(savesDir, f)).isDirectory())
    const worlds = files.map(f => {
      const worldPath = path.join(savesDir, f)
      const stat = fs.statSync(worldPath)
      return { folderName: f, displayName: f, mtime: stat.mtimeMs, size: getDirSizeBytes(worldPath) }
    })
    return { ok: true, worlds }
  })

  ipcMain.handle('profile:deleteWorld', (e, profileId, folderName, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = getGameDir(profile, accountId)
    const worldPath = path.join(gameDir, 'saves', folderName)
    if (fs.existsSync(worldPath)) fs.rmSync(worldPath, { recursive: true })
    return { ok: true }
  })

  ipcMain.handle('profile:listDirFull', (e, profileId, subPath, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = getGameDir(profile, accountId)
    const target = subPath ? path.join(gameDir, subPath) : gameDir
    if (!fs.existsSync(target)) return { ok: true, entries: [] }
    const files = fs.readdirSync(target, { withFileTypes: true })
    const entries = files.map(entry => {
      const full = path.join(target, entry.name)
      const stat = fs.statSync(full)
      return {
        name: entry.name,
        path: subPath ? path.join(subPath, entry.name) : entry.name,
        isDir: entry.isDirectory(),
        size: entry.isFile() ? stat.size : null,
        mtime: stat.mtimeMs
      }
    })
    return { ok: true, entries }
  })

  ipcMain.handle('profile:deletePath', (e, profileId, subPath) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = getGameDir(profile, null)
    if (!subPath) return { error: 'Thiếu đường dẫn' }
    const target = path.join(gameDir, String(subPath).replace(/^[/\\]+/, ''))
    if (!fs.existsSync(target)) return { ok: true }
    try {
      fs.rmSync(target, { recursive: true, force: true })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('profile:uploadTo', async (e, profileId, subPath, srcPaths) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = getGameDir(profile, null)
    const targetDir = subPath ? path.join(gameDir, String(subPath).replace(/^[/\\]+/, '')) : gameDir
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
    const results = []
    for (const src of (srcPaths || [])) {
      const name = path.basename(src)
      const dest = path.join(targetDir, name)
      try {
        fs.copyFileSync(src, dest)
        results.push({ name, ok: true })
      } catch (err) {
        results.push({ name, ok: false, error: err.message })
      }
    }
    return { ok: true, results }
  })

  ipcMain.handle('profile:readOptions', (e, profileId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = getGameDir(profile, null)
    const optsPath = path.join(gameDir, 'options.txt')
    if (!fs.existsSync(optsPath)) return { ok: true, options: {}, lines: [] }
    try {
      const raw = fs.readFileSync(optsPath, 'utf8')
      const lines = raw.split(/\r?\n/)
      const options = {}
      for (const line of lines) {
        const idx = line.indexOf(':')
        if (idx > 0) {
          const key = line.slice(0, idx)
          const val = line.slice(idx + 1)
          options[key] = val
        }
      }
      return { ok: true, options, lines }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('profile:writeOptions', (e, profileId, newOptions) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    const gameDir = getGameDir(profile, null)
    const optsPath = path.join(gameDir, 'options.txt')
    try {
      let lines = []
      if (fs.existsSync(optsPath)) {
        lines = fs.readFileSync(optsPath, 'utf8').split(/\r?\n/)
      }
      const seen = new Map()
      for (const line of lines) {
        const idx = line.indexOf(':')
        if (idx > 0) seen.set(line.slice(0, idx), line)
      }
      for (const [key, val] of Object.entries(newOptions || {})) {
        seen.set(key, `${key}:${val}`)
      }
      const out = [...seen.values()].join('\n')
      fs.writeFileSync(optsPath, out, 'utf8')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('profile:update', (e, profileId, patch) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    Object.assign(profile, patch)
    writeProfiles(data)
    return { ok: true, profile }
  })

  ipcMain.handle('profile:listJavas', async (e) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    try {
      const { findJavaInstallations } = require('./launcher/java/javaManager.cjs')
      const javas = await findJavaInstallations()
      return { ok: true, javas }
    } catch { return { ok: true, javas: [] } }
  })
}

function registerJavaDistroHandlers(getTrustedWindow) {
  const { fetchAllDistros, installDistro, deleteDistro, getProfileJreInfo, getAllInstalledJavas, isDistroInstalled, getJavaExe } = require('./launcher/java/javaDistros.cjs')

  const GLOBAL_RUNTIMES_DIR = path.join(DATA_DIR, 'runtimes')

  ipcMain.handle('java:fetchDistros', async (e, profileId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const distros = await fetchAllDistros()
    return { ok: true, distros }
  })

  ipcMain.handle('java:getInstalled', (e, profileId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const list = getAllInstalledJavas(GLOBAL_RUNTIMES_DIR)
    return { ok: true, installed: list }
  })

  ipcMain.handle('java:install', async (e, pkg, profileId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const win = getTrustedWindow(e)
    const javaExe = await installDistro(pkg, GLOBAL_RUNTIMES_DIR, (progress) => {
      if (win && !win.isDestroyed()) win.webContents.send('java:installProgress', progress)
    })
    return { ok: true, javaExe }
  })

  ipcMain.handle('java:installToDir', async (e, pkg, dir) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const targetDir = (typeof dir === 'string' && dir) ? dir : GLOBAL_RUNTIMES_DIR
    const win = getTrustedWindow(e)
    const javaExe = await installDistro(pkg, targetDir, (progress) => {
      if (win && !win.isDestroyed()) win.webContents.send('java:installProgress', progress)
    })
    return { ok: true, javaExe }
  })

  ipcMain.handle('java:select', (e, profileId, javaExe) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    if (typeof javaExe !== 'string') return { error: 'Invalid javaExe' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { error: 'Profile not found' }
    profile.javaPath = javaExe
    writeProfiles(data)
    return { ok: true }
  })

  ipcMain.handle('java:delete', (e, profileId, distro, javaVersion) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const jreDir = distro && javaVersion
      ? path.join(GLOBAL_RUNTIMES_DIR, `${distro}-${javaVersion}`)
      : null
    if (!jreDir) return { error: 'Must specify distro and javaVersion' }
    const deleted = deleteDistro(jreDir)
    if (deleted) {
      const data = readProfiles()
      let changed = false
      for (const p of data.profiles) {
        if (p.javaPath?.startsWith(jreDir)) {
          p.javaPath = null
          changed = true
        }
      }
      if (changed) writeProfiles(data)
    }
    return { ok: true, deleted }
  })
}

module.exports = { 
  registerProfileHandlers, 
  registerProfileContentHandlers, 
  registerJavaDistroHandlers,
  normalizeSingleForgeProfile,
  FIXED_GAME_VERSION,
  FIXED_FORGE_VERSION,
  FIXED_LOADER,
  FIXED_PROFILE_NAME
}
