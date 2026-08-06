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

const https = require('https')
const http  = require('http')
const fs    = require('fs')
const path  = require('path')

const BASE = 'https://api.curse.tools/v1/cf'

// Dùng Node https thay vì fetch() — ổn định hơn trong Electron main process
function fetchCf(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${BASE}${endpoint}`
    function doGet(u) {
      const client = u.startsWith('https') ? https : http
      const req = client.get(u, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'DinoIsekai/1.0' },
        timeout: 15000,
      }, (res) => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return doGet(res.headers.location)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`CF API Error: ${res.statusCode} ${u}`))
        }
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => {
          try { resolve(JSON.parse(data)) }
          catch { reject(new Error(`Invalid JSON from ${u}`)) }
        })
        res.on('error', reject)
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${u}`)) })
    }
    doGet(url)
  })
}

// Wrapper với retry và error logging
async function fetchCfSafe(endpoint) {
  try {
    return await fetchCf(endpoint)
  } catch (error) {
    console.error(`[CurseForge API] Error fetching ${endpoint}:`, error.message)
    return null
  }
}

async function searchProjects(opts) {
  const { query, gameVersions = [], loaders = [], categoryId, sortBy = 'relevance', offset = 0, limit = 20, projectType = 'mod' } = opts
  const params = new URLSearchParams()
  params.append('gameId', '432')

  const classMap = {
    'mod': 6,
    'modpack': 4471,
    'shader': 6552,
    'resourcepack': 12,
    'datapack': 12
  }
  params.append('classId', classMap[projectType] || 6)

  if (query) params.append('searchFilter', query)
  if (categoryId) params.append('categoryId', categoryId)
  if (gameVersions.length > 0) params.append('gameVersion', gameVersions[0])
  if (loaders.length > 0) params.append('modLoaderType', getModLoaderType(loaders[0]))

  const sortMap = {
    relevance: 1,
    downloads: 2,
    updated: 3,
    newest: 4,
  }
  params.append('sortField', sortMap[sortBy] || 1)
  params.append('sortOrder', 'desc')

  params.append('index', offset)
  params.append('pageSize', limit)

  const data = await fetchCfSafe(`/mods/search?${params.toString()}`)
  if (!data || !data.data) return { hits: [], total_hits: 0 }

  return {
    hits: data.data.map(p => formatProject(p)),
    total_hits: data.pagination ? data.pagination.totalCount : data.data.length
  }
}

function getModLoaderType(loader) {
  const map = { forge: 1, fabric: 4, quilt: 5, neoforge: 6 }
  return map[loader.toLowerCase()] || 0
}

function formatProject(p) {
  return {
    project_id: p.id,
    slug: p.slug,
    title: p.name,
    description: p.summary,
    author: p.authors ? p.authors.map(a => a.name).join(', ') : 'Unknown',
    downloads: p.downloadCount,
    follows: 0,
    icon_url: p.logo ? p.logo.thumbnailUrl : '',
    date_modified: p.dateModified,
    date_created: p.dateCreated,
    categories: p.categories ? p.categories.map(c => c.name) : [],
    display_categories: p.categories ? p.categories.map(c => c.name) : [],
    versions: [],
    client_side: 'optional',
    server_side: 'optional',
    gallery: (p.screenshots || []).map(s => ({ url: s.url || s.thumbnailUrl, title: s.title || '' })),
    source: 'curseforge'
  }
}

async function getProject(id) {
  const data = await fetchCfSafe(`/mods/${id}`)
  if (!data || !data.data) return null
  const p = data.data
  const proj = formatProject(p)
  // Full description only — never fall back to the short summary.
  proj.body = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const descData = await fetchCfSafe(`/mods/${id}/description`)
    if (descData && descData.data) {
      proj.body = descData.data
      break
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 300))
  }
  return proj
}

async function getProjectVersions(id, filters = {}) {
  const data = await fetchCfSafe(`/mods/${id}/files`)
  if (!data || !data.data) return []

  let files = data.data
  if (filters.loaders && filters.loaders.length > 0) {
    files = files.filter(f => f.gameVersions.some(gv => filters.loaders.some(l => gv.toLowerCase().includes(l.toLowerCase()))))
  }
  if (filters.gameVersions && filters.gameVersions.length > 0) {
    files = files.filter(f => f.gameVersions.some(gv => filters.gameVersions.includes(gv)))
  }

  return files.map(f => ({
    id: f.id,
    project_id: f.modId,
    name: f.displayName,
    version_number: f.displayName,
    version_type: f.releaseType === 1 ? 'release' : f.releaseType === 2 ? 'beta' : 'alpha',
    date_published: f.fileDate,
    downloads: f.downloadCount,
    game_versions: f.gameVersions.filter(v => /^1\.\d+/.test(v)),
    loaders: f.gameVersions.filter(v => ['forge', 'fabric', 'quilt', 'neoforge'].includes(v.toLowerCase())).map(v => v.toLowerCase()),
    files: [{
      url: f.downloadUrl,
      filename: f.fileName,
      size: f.fileLength,
      primary: true
    }]
  }))
}

async function getCategories(projectType = 'mod') {
  const classMap = {
    'mod': 6,
    'modpack': 4471,
    'shader': 6552,
    'resourcepack': 12,
    'datapack': 12
  }
  const classId = classMap[projectType] || 6
  const data = await fetchCfSafe(`/categories?gameId=432&classId=${classId}&classesOnly=false`)
  if (!data || !data.data) return []
  return data.data.filter(c => c.classId === classId).map(c => ({
    id: c.id,
    icon: c.iconUrl,
    name: c.name,
    project_type: projectType
  }))
}

function deleteOldModFiles(destDir, projectId, newFilename, versionMeta) {
  if (!fs.existsSync(destDir)) return
  const trackPath = path.join(destDir, '.installed.json')
  let tracking = {}
  try { tracking = JSON.parse(fs.readFileSync(trackPath, 'utf8')) } catch {}
  const old = tracking[projectId]
  if (old && typeof old === 'string' && old !== newFilename) {
    const oldPath = path.join(destDir, old)
    if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath) } catch {} }
  } else if (old && typeof old === 'object' && old.filename && old.filename !== newFilename) {
    const oldPath = path.join(destDir, old.filename)
    if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath) } catch {} }
  }
  tracking[projectId] = {
    filename:    newFilename,
    versionId:   versionMeta?.versionId   ?? null,
    versionNumber: versionMeta?.versionNumber ?? null,
    datePublished: versionMeta?.datePublished ?? null,
    platform:    'curseforge',
  }
  try { fs.writeFileSync(trackPath, JSON.stringify(tracking, null, 2)) } catch {}
}

async function resolveCfDependencies(file, gameVersion, loaders, depth = 0, visited = new Set(), deps = []) {
  if (depth > 3 || !file.dependencies || file.dependencies.length === 0) return deps

  for (const dep of file.dependencies) {
    if (dep.relationType !== 3) continue
    if (!dep.modId || visited.has(dep.modId)) continue
    visited.add(dep.modId)

    try {
      const depFiles = await fetchCfSafe(`/mods/${dep.modId}/files`)
      if (!depFiles || !depFiles.data) continue

      let candidates = depFiles.data
      if (gameVersion) {
        candidates = candidates.filter(f => f.gameVersions.some(gv => gv === gameVersion))
      }
      if (loaders && loaders.length > 0) {
        candidates = candidates.filter(f => f.gameVersions.some(gv => loaders.some(l => gv.toLowerCase().includes(l.toLowerCase()))))
      }

      const best = candidates.sort((a, b) => new Date(b.fileDate) - new Date(a.fileDate))[0]
      if (!best) continue
      deps.push(best)
      await resolveCfDependencies(best, gameVersion, loaders, depth + 1, visited, deps)
    } catch {}
  }
  return deps
}

async function installVersion(opts, onProgress) {
  const { versionId, projectId, projectType, instancePath, deleteOldVersions } = opts

  let file = null
  if (projectId) {
    const fileData = await fetchCfSafe(`/mods/${projectId}/files/${versionId}`)
    if (fileData && fileData.data) file = fileData.data
  }
  if (!file && opts.downloadUrl && opts.filename) {
    file = { downloadUrl: opts.downloadUrl, fileName: opts.filename, fileLength: opts.fileLength || 0, modId: projectId }
  }
  if (!file) throw new Error('File not found')

  const downloadUrl = file.downloadUrl
  const filename = file.fileName

  if (!downloadUrl) throw new Error('No download URL available (possibly disabled by author)')

  const folderMap = {
    mod:          'mods',
    shader:       'shaderpacks',
    resourcepack: 'resourcepacks',
  }
  const folder = folderMap[projectType] || 'mods'
  const destDir = path.join(instancePath, folder)
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

  const destPath = path.join(destDir, filename)
  const tmpPath  = destPath + '.tmp'

  if (deleteOldVersions) {
    deleteOldModFiles(destDir, String(projectId), filename, {
      versionId:    file.id ?? null,
      versionNumber: file.displayName ?? null,
      datePublished: file.fileDate ?? null,
    })
  }

  if (onProgress) onProgress({ log: `Downloading ${filename}...`, percent: 0, total: file.fileLength })

  await new Promise((resolve, reject) => {
    function doGet(url) {
      const client = url.startsWith('https') ? https : http
      const req = client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' }, timeout: 60000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return doGet(res.headers.location)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode}`))
        }
        const total = parseInt(res.headers['content-length'] || String(file.fileLength || 0), 10)
        let received = 0
        const startTime = Date.now()
        const out = fs.createWriteStream(tmpPath)

        res.on('data', chunk => {
          received += chunk.length
          if (total > 0 && onProgress) {
            const pct = Math.round(received / total * 100)
            const elapsed = (Date.now() - startTime) / 1000
            const speed = elapsed > 0 ? Math.round(received / elapsed / 1024) : 0
            onProgress({ log: `Downloading ${filename}: ${pct}%`, percent: pct, total, received, speed })
          }
        })
        res.pipe(out)
        out.on('finish', () => {
          try { fs.renameSync(tmpPath, destPath) } catch {
            try { fs.copyFileSync(tmpPath, destPath); fs.unlinkSync(tmpPath) } catch {}
          }
          resolve()
        })
        out.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
        res.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {}; reject(err) })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Download timeout')) })
    }
    doGet(downloadUrl)
  })

  if (onProgress) onProgress({ log: `Installed ${filename}`, percent: 100, total: file.fileLength })

  if (projectType === 'mod' && projectId) {
    const gameVersion = opts.gameVersion || ''
    const loaders = opts.loaders || []
    if (gameVersion || loaders.length > 0) {
      onProgress?.({ log: 'Checking dependencies...', percent: 0 })
      const dependencies = await resolveCfDependencies(file, gameVersion, loaders)
      if (dependencies.length > 0) {
        onProgress?.({ log: `Found ${dependencies.length} required dependenc(ies)`, percent: 10 })
        for (let i = 0; i < dependencies.length; i++) {
          const dep = dependencies[i]
          const depUrl = dep.downloadUrl
          const depFilename = dep.fileName
          if (!depUrl || !depFilename) continue
          const depPath = path.join(destDir, depFilename)
          if (fs.existsSync(depPath)) {
            onProgress?.({ log: `[${i + 1}/${dependencies.length}] Already installed: ${depFilename}`, percent: 10 + Math.round((i / dependencies.length) * 80) })
            continue
          }
          const depTmp = depPath + '.tmp'
          onProgress?.({ log: `[${i + 1}/${dependencies.length}] Downloading dependency: ${depFilename}...`, percent: 10 + Math.round((i / dependencies.length) * 80) })
          try {
            await new Promise((resolve, reject) => {
              function doGetDep(url) {
                const client = url.startsWith('https') ? https : http
                client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' }, timeout: 60000 }, (res) => {
                  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    res.resume()
                    return doGetDep(res.headers.location)
                  }
                  if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)) }
                  const out = fs.createWriteStream(depTmp)
                  res.pipe(out)
                  out.on('finish', () => {
                    try { fs.renameSync(depTmp, depPath) } catch { try { fs.copyFileSync(depTmp, depPath); fs.unlinkSync(depTmp) } catch {} }
                    resolve()
                  })
                  out.on('error', err => { try { fs.unlinkSync(depTmp) } catch {}; reject(err) })
                  res.on('error', err => { try { fs.unlinkSync(depTmp) } catch {}; reject(err) })
                }).on('error', reject)
              }
              doGetDep(depUrl)
            })
          } catch (err) {
            onProgress?.({ log: `[${i + 1}/${dependencies.length}] Failed: ${depFilename} - ${err.message}`, percent: 10 + Math.round((i / dependencies.length) * 80) })
          }
        }
      }
    }
    onProgress?.({ log: 'Install complete', percent: 100 })
  }

  return { success: true, file: filename }
}

module.exports = {
  searchProjects,
  getProject,
  getProjectVersions,
  getCategories,
  installVersion
}

