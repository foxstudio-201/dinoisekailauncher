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

// ── Dino Isekai chỉ chạy đúng 1 profile: Forge 1.20.1 ────────────────────────
const FIXED_GAME_VERSION = '1.20.1'
const FIXED_FORGE_VERSION = '47.2.0'
const FIXED_LOADER = 'forge'
const FIXED_PROFILE_NAME = 'Dino Isekai'

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

// Tạo tên folder duy nhất dựa trên tên profile (tránh trùng với profile cũ/cùng tên)
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

// Tạo profile mặc định duy nhất của Dino Isekai
function createDefaultProfile() {
  const existing = readProfiles().profiles.map(p => p.instancePath).filter(Boolean)
  const instancePath = uniqueInstanceDir(FIXED_PROFILE_NAME, existing)
  ensureDir(instancePath)
  return {
    id:           generateUUID(),
    name:         FIXED_PROFILE_NAME,
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

// Ép dữ liệu profiles về đúng 1 profile Forge 1.20.1 duy nhất
function normalizeSingleForgeProfile(data) {
  if (!data || typeof data !== 'object') data = { profiles: [], selectedProfileId: null }
  if (!Array.isArray(data.profiles)) data.profiles = []
  const pick = data.profiles.find(p => p && p.id === data.selectedProfileId) || data.profiles[0]
  let changed = false
  if (!pick) {
    const p = createDefaultProfile()
    data.profiles = [p]
    data.selectedProfileId = p.id
    return { changed: true, data }
  }
  data.profiles = [pick]
  data.selectedProfileId = pick.id
  if (pick.loader !== FIXED_LOADER)      { pick.loader = FIXED_LOADER; changed = true }
  if (pick.gameVersion !== FIXED_GAME_VERSION) { pick.gameVersion = FIXED_GAME_VERSION; changed = true }
  if (!pick.loaderVersion || pick.loaderVersion !== FIXED_FORGE_VERSION) {
    pick.loaderVersion = FIXED_FORGE_VERSION
    changed = true
  }
  return { changed, data }
}

// ── Dir size cache ────────────────────────────────────────────────────────────
// Cache size theo mtime của thư mục top-level để tránh tính lại mỗi lần load
const _sizeCache = new Map() // instancePath → { size, mtime, ts }
const SIZE_CACHE_TTL = 60_000 // 1 phút

function getDirSizeBytes(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0

    // Kiểm tra cache còn hợp lệ không
    const cached = _sizeCache.get(dirPath)
    if (cached) {
      const age = Date.now() - cached.ts
      if (age < SIZE_CACHE_TTL) return cached.size
      // Kiểm tra mtime thư mục — nếu chưa đổi thì dùng cache cũ (không expire)
      try {
        const mtime = fs.statSync(dirPath).mtimeMs
        if (mtime === cached.mtime) {
          cached.ts = Date.now() // reset TTL
          return cached.size
        }
      } catch {}
    }

    // Tính size — giới hạn độ sâu để tránh quá chậm với thư mục lớn
    const size = calcDirSize(dirPath, 0)
    const mtime = fs.statSync(dirPath).mtimeMs
    _sizeCache.set(dirPath, { size, mtime, ts: Date.now() })
    return size
  } catch {
    return 0
  }
}

function calcDirSize(dirPath, depth) {
  // Giới hạn depth = 6 — đủ để bao gồm mods/config/saves nhưng không quét quá sâu
  if (depth > 6) return 0
  try {
    let total = 0
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      // Bỏ qua các thư mục nặng không cần thiết cho size display
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

/**
 * Trả về size từ cache ngay (0 nếu chưa có), đồng thời kick off background calc
 * → UI render ngay, size cập nhật sau khi tính xong qua event
 */
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
  // Background: tính không block main thread
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
  if (!profile?.instancePath) return null
  if (accountId) {
    const accDir = path.join(profile.instancePath, 'accounts', accountId)
    ensureDir(accDir)
    return accDir
  }
  return profile.instancePath
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
  const https = require('https')

  function httpsGet(url) {
    return new Promise((resolve, reject) => {
      https.get(url, {
        headers: { 'User-Agent': 'DinoIsekai/1.0' },
        timeout: 8000,
      }, (res) => {
        let body = ''
        res.on('data', c => { body += c })
        res.on('end', () => {
          if (res.statusCode === 200) {
            try { resolve(JSON.parse(body)) } catch { resolve(null) }
          } else { resolve(null) }
        })
      }).on('error', () => resolve(null))
        .on('timeout', () => resolve(null))
    })
  }

  // Extract a clean search query from a file name by stripping extension,
  // version suffixes (e.g. _r5.8, -1.20.1, _v1.10.5, +mc1.21) and keeping
  // only the meaningful name part so Modrinth search returns the right project.
  function extractSearchSlug(fileName) {
    return fileName
      .replace(/\.(jar|zip)$/i, '')                        // remove extension
      .replace(/\.(off|disabled)$/i, '')                   // remove toggle suffix
      .replace(/§\w?/g, '')                                // strip MC section-sign color codes
      .replace(/\[[^\]]*\]/g, ' ')                         // strip bracketed tags like [v1.2]
      .replace(/[-_+](v?\d[\d._\-+]*).*$/i, '')           // strip version like _r5.8 -1.20.1 _v1.10 +mc1.21
      .replace(/[-_+][rv]\d.*$/i, '')                      // strip _r5 _v8 +r3 style versions
      .replace(/[-_]/g, ' ')                               // turn separators into spaces for better search
      .replace(/[()[\]{}]+/g, ' ')                         // strip remaining brackets
      .trim()
      .toLowerCase()
  }

  function metaCacheFilePath(gameDir) {
    return path.join(gameDir, '.content-meta.json')
  }

  function readMetaCache(gameDir) {
    try { return JSON.parse(fs.readFileSync(metaCacheFilePath(gameDir), 'utf8')) } catch { return {} }
  }

  // Fetch project metadata from the APIs without touching the cache.
  // When the file was already matched to a project (projectId+platform),
  // fetch the project directly for an exact, single-request result.
  // Returns { retry, meta } — retry=true means network error (don't cache),
  // meta=null with retry=false means definitively not found.
  async function fetchMetaFromApi(type, fileName, projectId, platform) {
    const projectType = type === 'mod' ? 'mod' : type === 'shader' ? 'shader' : 'resourcepack'
    const pathMap = { mod: 'mc-mods', shader: 'shaders', resourcepack: 'texture-packs' }
    if (projectId) {
      if (platform === 'curseforge') {
        try {
          const cf = require('./launcher/curseforge/curseForgeSearch.cjs')
          const p = await cf.getProject(projectId)
          if (p) {
            return { retry: false, meta: {
              source: 'curseforge',
              name: p.title,
              description: p.description,
              iconUrl: p.icon_url,
              author: p.author,
              downloads: p.downloads,
              projectUrl: `https://www.curseforge.com/minecraft/${pathMap[projectType] || 'mc-mods'}/${p.slug}`,
            } }
          }
          return { retry: false, meta: null }
        } catch { return { retry: true, meta: null } }
      }
      const data = await httpsGet(`https://api.modrinth.com/v2/project/${projectId}`)
      if (data === null) return { retry: true, meta: null }
      if (data?.title) {
        return { retry: false, meta: {
          source: 'modrinth',
          name: data.title,
          description: data.description,
          iconUrl: data.icon_url,
          author: data.author,
          downloads: data.downloads,
          projectUrl: `https://modrinth.com/${projectType}/${data.slug}`,
        } }
      }
      return { retry: false, meta: null }
    }
    const queries = searchQueryCandidates(extractSearchSlug(fileName)).slice(0, 20)
    if (queries.length === 0) return { retry: false, meta: null }
    // CurseForge is the preferred source — try it first, fall back to Modrinth.
    try {
      const cf = require('./launcher/curseforge/curseForgeSearch.cjs')
      for (const query of queries) {
        const res = await cf.searchProjects({ query, projectType, limit: 1 })
        const hit = res?.hits?.[0]
        if (!hit || !titlesOverlap(query, hit.title)) continue
        return { retry: false, meta: {
          source: 'curseforge',
          name: hit.title,
          description: hit.description,
          iconUrl: hit.icon_url,
          author: hit.author,
          downloads: hit.downloads,
          projectUrl: `https://www.curseforge.com/minecraft/${pathMap[projectType] || 'mc-mods'}/${hit.slug}`,
        } }
      }
    } catch { return { retry: true, meta: null } }
    for (const query of queries) {
      const data = await httpsGet(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=1&facets=[["project_type:${projectType}"]]`)
      if (data === null) return { retry: true, meta: null }
      const h = data?.hits?.[0]
      if (h && titlesOverlap(query, h.title)) {
        return { retry: false, meta: {
          source: 'modrinth',
          name: h.title,
          description: h.description,
          iconUrl: h.icon_url,
          author: h.author,
          downloads: h.downloads,
          projectUrl: `https://modrinth.com/${projectType}/${h.slug}`,
        } }
      }
    }
    return { retry: false, meta: null }
  }

  // Fetch project metadata (name, icon, description, ...) for a content file,
  // trying Modrinth first then CurseForge. Results are cached in
  // .content-meta.json so subsequent loads (tab reopen / reload) never hit the
  // network again and can't be rate-limited or lose the icon.
  async function fetchContentMeta(type, fileName, gameDir) {
    const cache = readMetaCache(gameDir)
    const key = `${type}:${fileName}`
    if (cache[key] !== undefined) return cache[key]
    const { retry, meta } = await fetchMetaFromApi(type, fileName)
    if (retry) return null
    cache[key] = meta || null
    try { fs.writeFileSync(metaCacheFilePath(gameDir), JSON.stringify(cache, null, 2)) } catch {}
    return meta
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

  const matchCache = new Map()

  function sha1File(filePath) {
    return new Promise((resolve) => {
      const crypto = require('crypto')
      const hash = crypto.createHash('sha1')
      const stream = fs.createReadStream(filePath)
      stream.on('data', d => hash.update(d))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', () => resolve(null))
    })
  }

  // { status: <http code or 0>, data: parsed JSON (when 200) }
  function httpsGetStatus(url) {
    return new Promise((resolve) => {
      https.get(url, {
        headers: { 'User-Agent': 'DinoIsekai/1.0' },
        timeout: 8000,
      }, (res) => {
        let body = ''
        res.on('data', c => { body += c })
        res.on('end', () => {
          if (res.statusCode === 200) {
            try { resolve({ status: 200, data: JSON.parse(body) }) } catch { resolve({ status: 200, data: null }) }
          } else { resolve({ status: res.statusCode, data: null }) }
        })
      }).on('error', () => resolve({ status: 0, data: null }))
        .on('timeout', () => resolve({ status: 0, data: null }))
    })
  }

  // Progressive search queries: strip loader/platform words (forge, fabric,
  // mc1.20.1, ...), progressively shorten, then split concatenated words
  // (e.g. "capebanner" -> "cape banner"), since Modrinth/CurseForge search
  // only matches spaced words.
  function wordSplitCandidates(word) {
    if (word.length < 8) return []
    const splits = []
    const ok = parts => parts.every(p => p.length >= 2)
    const addSplits = (w, boost) => {
      for (let i = 2; i <= w.length - 2; i++) {
        const a = w.slice(0, i), b = w.slice(i)
        if (ok([a, b])) splits.push({ s: [a, b], boost })
      }
      for (let i = 2; i <= w.length - 4; i++) {
        for (let j = i + 2; j <= w.length - 2; j++) {
          const a = w.slice(0, i), b = w.slice(i, j), c = w.slice(j)
          if (ok([a, b, c])) splits.push({ s: [a, b, c], boost })
        }
      }
      if (w.length >= 13) {
        for (let i = 3; i <= w.length - 6; i++) {
          for (let j = i + 3; j <= w.length - 3; j++) {
            for (let k = j + 3; k <= w.length - 3; k++) {
              const parts = [w.slice(0, i), w.slice(i, j), w.slice(j, k), w.slice(k)]
              if (parts.every(p => p.length >= 3)) splits.push({ s: parts, boost })
            }
          }
        }
      }
    }
    addSplits(word, 0)
    const baseWord = word.replace(/^z(?=[a-z]{6,})/i, '')
    if (baseWord !== word) addSplits(baseWord, -4)
    const goodSuffix = /^(lib|mod|mods|pack|fix|core|api|crafter|craft|engine|overhaul|tweaks|tweak|reborn|reforged|delight|expansion|revival|music|enhanced|redux|additions)$/i
    const stopWord = /^(of|to|in|on|the|for|and|with|at|plus)$/i
    const scored = splits.map(({ s, boost }) => {
      const lens = s.map(p => p.length)
      const max = Math.max(...lens), min = Math.min(...lens)
      let spread = max - min + lens.reduce((t, l) => t + Math.abs(l - (max + min) / 2), 0) / 10
      if (goodSuffix.test(s[s.length - 1])) spread -= 2
      if (s.length === 3 && stopWord.test(s[1])) spread -= 2
      return { s, spread: spread + boost }
    })
    scored.sort((x, y) => (x.s.length - y.s.length) || (x.spread - y.spread))
    const out = []
    for (const { s } of scored) {
      const q = s.join(' ')
      if (!out.includes(q)) out.push(q)
      if (out.length >= 40) break
    }
    return out
  }

  function searchQueryCandidates(query) {
    const words = query.split(/\s+/).filter(Boolean)
    if (words.length === 0) return []
    const strip = /^(forge|fabric|quilt|neoforge|neoforged|fabricloader|api|edition|core|library|lib|mod|mc\d[\d._]*|minecraft|minecraftforge)$/i
    const stripped = words.filter(w => !strip.test(w))
    const candidates = []
    const add = (q) => { if (q && !candidates.includes(q)) candidates.push(q) }
    add(query)
    if (stripped.length > 0 && stripped.join(' ') !== query) add(stripped.join(' '))
    // Prefer known compound suffixes first (e.g. "itemproductionlib" -> "item production lib")
    const suffixList = ['lib', 'mod', 'mods', 'pack', 'fix', 'core', 'api', 'craft', 'engine', 'overhaul', 'tweaks', 'reborn', 'reforged', 'delight', 'expansion', 'revival', 'music', 'enhanced', 'redux', 'additions', 'tweak']
    const suffixSplit = (w, depth) => {
      if (depth > 2) return
      for (const suf of suffixList) {
        if (w.length - suf.length >= 3 && w.endsWith(suf)) {
          const rest = w.slice(0, -suf.length)
          add(rest + ' ' + suf)
          suffixSplit(rest, depth + 1)
        }
      }
    }
    for (const w of words) {
      if (w.length >= 8) suffixSplit(w, 0)
    }
    const base = (stripped.length > 0 && stripped.join(' ') !== query) ? stripped : words
    let q = base.slice(0, -1).join(' ')
    while (q && candidates.length < 6) {
      add(q)
      q = q.split(' ').slice(0, -1).join(' ')
    }
    for (const w of words) {
      if (w.length >= 8) {
        for (const s of wordSplitCandidates(w)) add(s)
      }
    }
    return candidates.slice(0, 60)
  }

  // Accept a fallback search hit only when its title actually relates to the
  // query (>= 60% of query tokens appear in the title). This blocks wrong
  // projects that share no words with the file name (e.g. query "spell
  // reaction" -> project "Build A Spell").
  function titlesOverlap(query, title) {
    const qTokens = (query || '').toLowerCase().split(/\s+/).filter(Boolean)
    const tTokens = new Set((title || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))
    if (qTokens.length === 0 || tTokens.size === 0) return false
    const hits = qTokens.filter(t => tTokens.has(t)).length
    return hits >= Math.max(1, Math.ceil(qTokens.length * 0.6))
  }

  async function matchInstalledFile(type, fileName, filePath) {
    if (matchCache.has(fileName)) return matchCache.get(fileName)
    const p = (async () => {
      // 1) Definitive match: Modrinth file-hash lookup (no name guessing needed)
      if (filePath) {
        const sha1 = await sha1File(filePath)
        if (sha1) {
          const hr = await httpsGetStatus(`https://api.modrinth.com/v2/version_file/${sha1}?algorithm=sha1`)
          if (hr.status === 200 && hr.data && hr.data.id) {
            return { retry: false, matched: true, projectId: String(hr.data.project_id), versionId: hr.data.id, platform: 'modrinth' }
          }
          if (hr.status !== 404) return { retry: true, matched: false }
        }
      }
      // 2) Name search with progressive query narrowing (CurseForge first, Modrinth fallback)
      const projectType = type === 'mod' ? 'mod' : type === 'shader' ? 'shader' : 'resourcepack'
      const queries = searchQueryCandidates(extractSearchSlug(fileName))
      if (queries.length === 0) return { retry: false, matched: false }
      let cfHit = null
      try {
        const cf = require('./launcher/curseforge/curseForgeSearch.cjs')
        for (const query of queries) {
          const res = await cf.searchProjects({ query, projectType, limit: 5 })
          const hit = res?.hits?.[0]
          if (!hit) continue
          const vers = await cf.getProjectVersions(hit.project_id)
          let versionId = null
          if (Array.isArray(vers)) {
            const matched = vers.find(v => (v.files || []).some(f => f.filename === fileName))
            versionId = matched ? matched.id : null
          }
          if (versionId) {
            const meta = {
              source: 'curseforge', name: hit.title, description: hit.description, iconUrl: hit.icon_url,
              author: hit.author, downloads: hit.downloads,
              projectUrl: `https://www.curseforge.com/minecraft/${projectType === 'mod' ? 'mc-mods' : projectType === 'shader' ? 'shaders' : 'texture-packs'}/${hit.slug}`,
            }
            return { retry: false, matched: true, projectId: String(hit.project_id), versionId, platform: 'curseforge', meta }
          }
          if (!cfHit && titlesOverlap(query, hit.title)) {
            cfHit = {
              projectId: String(hit.project_id), platform: 'curseforge',
              meta: {
                source: 'curseforge', name: hit.title, description: hit.description, iconUrl: hit.icon_url,
                author: hit.author, downloads: hit.downloads,
                projectUrl: `https://www.curseforge.com/minecraft/${projectType === 'mod' ? 'mc-mods' : projectType === 'shader' ? 'shaders' : 'texture-packs'}/${hit.slug}`,
              },
            }
          }
        }
      } catch { return { retry: true, matched: false } }
      // 3) Modrinth fallback with the same candidate queries (prefer exact filename match)
      let modrinthHit = null
      for (const query of queries) {
        const data = await httpsGet(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=1&facets=[["project_type:${projectType}"]]`)
        if (data === null) return { retry: true, matched: false }
        const h = data?.hits?.[0]
        if (h) {
          const vers = await httpsGet(`https://api.modrinth.com/v2/project/${h.project_id}/version`)
          if (vers === null) return { retry: true, matched: false }
          let versionId = null
          if (Array.isArray(vers)) {
            const matched = vers.find(v => (v.files || []).some(f => f.filename === fileName))
            versionId = matched ? matched.id : null
          }
          if (versionId) {
            return { retry: false, matched: true, projectId: String(h.project_id), versionId, platform: 'modrinth', meta: {
              source: 'modrinth', name: h.title, description: h.description, iconUrl: h.icon_url,
              author: h.author, downloads: h.downloads, projectUrl: `https://modrinth.com/${projectType}/${h.slug}`,
            } }
          }
          if (!modrinthHit && titlesOverlap(query, h.title)) {
            modrinthHit = { projectId: String(h.project_id), platform: 'modrinth', meta: {
              source: 'modrinth', name: h.title, description: h.description, iconUrl: h.icon_url,
              author: h.author, downloads: h.downloads, projectUrl: `https://modrinth.com/${projectType}/${h.slug}`,
            } }
          }
        }
      }
      if (cfHit) return { retry: false, matched: true, ...cfHit, versionId: null }
      if (modrinthHit) return { retry: false, matched: true, ...modrinthHit, versionId: null }
      return { retry: false, matched: false }
    })()
    matchCache.set(fileName, p)
    return p
  }

  async function mapWithConcurrency(items, fn, limit, deadline, delay) {
    const results = []
    let i = 0
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    async function worker() {
      while (i < items.length) {
        if (deadline && Date.now() > deadline) break
        const idx = i++
        try { results[idx] = await fn(items[idx]) } catch { results[idx] = null }
        if (delay) await sleep(delay)
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
    return results
  }

  function slugFromFileName(fileName) {
    return extractSearchSlug(fileName).replace(/ /g, '-')
  }

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

  ipcMain.handle('profile:matchInstalledContent', async (e, profileId) => {
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
    const cachePath = path.join(gameDir, '.content-match.json')
    let matchCacheFile = {}
    try { matchCacheFile = JSON.parse(fs.readFileSync(cachePath, 'utf8')) } catch {}
    const matchedFiles = {}
    for (const [cacheKey, cached] of Object.entries(matchCacheFile)) {
      if (typeof cached !== 'object' || cached === null) continue
      const sep = cacheKey.indexOf(':')
      if (sep === -1) continue
      const type = cacheKey.slice(0, sep)
      const f = cacheKey.slice(sep + 1)
      const base = f.replace(/\.(off|disabled)$/i, '')
      matchedFiles[base] = { type, projectId: cached.projectId, versionId: cached.versionId, platform: cached.platform || 'modrinth' }
    }
    const toMatch = []
    for (const [type, folder] of folders) {
      if (type !== 'mod' && type !== 'shader' && type !== 'resourcepack') continue
      const dir = path.join(gameDir, folder)
      if (!fs.existsSync(dir)) continue
      const trackPath = path.join(dir, '.installed.json')
      let tracking = {}
      try { tracking = JSON.parse(fs.readFileSync(trackPath, 'utf8')) } catch {}
      const trackedFiles = new Set(Object.values(tracking).map(v => (typeof v === 'string') ? v : v.filename))
      const entries = fs.readdirSync(dir).filter(f =>
        type === 'mod' ? /\.jar(\.off|\.disabled)?$/i.test(f) : /\.zip$/i.test(f)
      )
      for (const f of entries) {
        const base = f.replace(/\.(off|disabled)$/i, '')
        if (trackedFiles.has(base)) continue
        const cacheKey = `${type}:${f}`
        const cached = matchCacheFile[cacheKey]
        if (cached !== undefined && cached !== null) continue
        toMatch.push({ cacheKey, type, base, fullPath: path.join(dir, f) })
      }
    }
    const matchedEntries = await mapWithConcurrency(toMatch, ({ type, base, fullPath }) =>
      matchInstalledFile(type, base, fullPath)
    , 4, Date.now() + 300000, 150)
    let dirty = false
    let metaDirty = false
    const metaCacheFile = readMetaCache(gameDir)
    for (let i = 0; i < toMatch.length; i++) {
      const { cacheKey, type, base } = toMatch[i]
      const res = matchedEntries[i]
      if (!res) continue
      if (res.retry) continue
      matchCacheFile[cacheKey] = res.matched ? { projectId: res.projectId, versionId: res.versionId, platform: res.platform } : false
      dirty = true
      if (res.matched && res.meta && metaCacheFile[cacheKey] === undefined) {
        metaCacheFile[cacheKey] = res.meta
        metaDirty = true
      }
      if (res.matched) matchedFiles[base] = { ...res, type }
    }
    if (dirty) {
      try { fs.writeFileSync(cachePath, JSON.stringify(matchCacheFile, null, 2)) } catch {}
    }
    if (metaDirty) {
      try { fs.writeFileSync(metaCacheFilePath(gameDir), JSON.stringify(metaCacheFile, null, 2)) } catch {}
    }
    // Backfill metadata for all installed files missing from the meta cache
    // (one fetch per file ever, stored forever — no repeated network hits).
    const metaMissing = []
    for (const [type, folder] of folders) {
      if (type !== 'mod' && type !== 'shader' && type !== 'resourcepack') continue
      const dir = path.join(gameDir, folder)
      if (!fs.existsSync(dir)) continue
      for (const f of fs.readdirSync(dir).filter(f =>
        type === 'mod' ? /\.jar(\.off|\.disabled)?$/i.test(f) : /\.zip$/i.test(f)
      )) {
        const cacheKey = `${type}:${f}`
        const matchInfo = matchCacheFile[cacheKey]
        const hasMatch = matchInfo && typeof matchInfo === 'object'
        if (metaCacheFile[cacheKey] !== undefined && !(metaCacheFile[cacheKey] === null && hasMatch)) continue
        metaMissing.push({
          cacheKey,
          type,
          fileName: f.replace(/\.(off|disabled)$/i, ''),
          projectId: hasMatch ? matchInfo.projectId : null,
          platform: hasMatch ? (matchInfo.platform || 'modrinth') : null,
        })
      }
    }
    if (metaMissing.length > 0) {
      const metaResults = await mapWithConcurrency(metaMissing, ({ type, fileName, projectId, platform }) =>
        fetchMetaFromApi(type, fileName, projectId, platform)
      , 4, Date.now() + 300000, 200)
      let backfilled = 0
      for (let i = 0; i < metaMissing.length; i++) {
        const r = metaResults[i]
        if (!r || r.retry) continue
        metaCacheFile[metaMissing[i].cacheKey] = r.meta || null
        backfilled++
      }
      if (backfilled > 0) {
        try { fs.writeFileSync(metaCacheFilePath(gameDir), JSON.stringify(metaCacheFile, null, 2)) } catch {}
      }
    }
    const metaResult = {}
    for (const [key, m] of Object.entries(metaCacheFile)) {
      if (m && typeof m === 'object') metaResult[key] = m
    }
    // Tell the renderer the scan finished so it can refresh names/icons
    // (matched too late to be included in this response). Only fire when
    // something actually changed, so a network-error retry loop never
    // triggers endless reloads.
    if (dirty || backfilled > 0) {
      try {
        for (const w of require('electron').BrowserWindow.getAllWindows()) {
          if (!w.isDestroyed()) w.webContents.send('content:scanDone', profileId)
        }
      } catch {}
    }
    return { ok: true, matchedFiles, meta: metaResult }
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

  ipcMain.handle('profile:getModMeta', async (e, profileId, fileName, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { ok: true, meta: null }
    const apiMeta = await fetchContentMeta('mod', fileName, profile.instancePath)
    return { ok: true, meta: apiMeta }
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

  ipcMain.handle('profile:getShaderMeta', async (e, profileId, fileName, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { ok: true, meta: null }
    const apiMeta = await fetchContentMeta('shader', fileName, profile.instancePath)
    return { ok: true, meta: apiMeta }
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

  ipcMain.handle('profile:getResourcePackMeta', async (e, profileId, fileName, accountId) => {
    if (!getTrustedWindow(e)) return { error: 'Unauthorized' }
    const data = readProfiles()
    const profile = data.profiles.find(p => p.id === profileId)
    if (!profile) return { ok: true, meta: null }
    const apiMeta = await fetchContentMeta('resourcepack', fileName, profile.instancePath)
    return { ok: true, meta: apiMeta }
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

  // Install a file (mod/shader/resourcepack) by copying from a local path into the correct subfolder.
  // type: 'mod' | 'shader' | 'resourcepack'
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

    // If file already exists, skip (don't overwrite silently)
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

  // Global shared runtimes dir — tất cả profiles dùng chung
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
    // Nếu không chỉ định dir cụ thể, dùng global runtimes dir
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
    // Xóa từ global runtimes dir
    const jreDir = distro && javaVersion
      ? path.join(GLOBAL_RUNTIMES_DIR, `${distro}-${javaVersion}`)
      : null
    if (!jreDir) return { error: 'Must specify distro and javaVersion' }
    const deleted = deleteDistro(jreDir)
    // Nếu profile nào đang dùng java này thì clear javaPath
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
