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

const https = require('https')
const http  = require('http')
const fs    = require('fs')
const path  = require('path')

const BASE = 'https://api.modrinth.com/v2'
const UA   = 'DinoIsekai/1.0 (github.com/foxstudio-201/VoxelXClient)'

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url)
    https.get({
      hostname: opts.hostname,
      path:     opts.pathname + opts.search,
      headers:  { 'User-Agent': UA, 'Accept': 'application/json' },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return httpsGetJson(res.headers.location).then(resolve).catch(reject)
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        try { resolve(JSON.parse(data)) } catch { reject(new Error(`Invalid JSON from ${url}`)) }
      })
    }).on('error', reject)
  })
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const dir = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const tmpPath = destPath + '.tmp'

    client.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject)
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)) }

      const total = parseInt(res.headers['content-length'] || '0', 10)
      let received = 0
      const out = fs.createWriteStream(tmpPath)
      res.on('data', chunk => {
        received += chunk.length
        if (total > 0) onProgress?.({ received, total, percent: Math.round(received / total * 100) })
      })
      res.pipe(out)
      out.on('finish', () => { fs.renameSync(tmpPath, destPath); resolve() })
      out.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {} reject(err) })
      res.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {} reject(err) })
    }).on('error', reject)
  })
}

async function searchProjects(opts = {}) {
  const {
    query = '',
    projectType = 'mod',
    gameVersions = [],
    loaders = [],
    categories = [],
    sortBy = 'relevance',
    limit = 20,
    offset = 0,
  } = opts

  const facets = []
  facets.push([`project_type:${projectType}`])
  if (gameVersions.length > 0)
    facets.push(gameVersions.map(v => `versions:${v}`))
  if (loaders.length > 0)
    facets.push(loaders.map(l => `categories:${l}`))
  if (categories.length > 0)
    facets.push(categories.map(c => `categories:${c}`))

  const params = new URLSearchParams({
    query,
    index: sortBy,
    limit: String(limit),
    offset: String(offset),
    facets: JSON.stringify(facets),
  })

  const url = `${BASE}/search?${params}`
  return httpsGetJson(url)
}

async function getProject(idOrSlug) {
  const data = await httpsGetJson(`${BASE}/project/${idOrSlug}`)
  if (!data || data.error) return null
  return {
    ...data,
    project_id: data.id,
    // Full project description (markdown) — never the short summary.
    body: data.body || data.description || '',
  }
}

async function getProjectVersions(idOrSlug, { gameVersions = [], loaders = [] } = {}) {
  const params = new URLSearchParams()
  if (gameVersions.length > 0) params.set('game_versions', JSON.stringify(gameVersions))
  if (loaders.length > 0)      params.set('loaders', JSON.stringify(loaders))
  const qs = params.toString() ? `?${params}` : ''
  return httpsGetJson(`${BASE}/project/${idOrSlug}/version${qs}`)
}

async function getVersion(versionId) {
  return httpsGetJson(`${BASE}/version/${versionId}`)
}

async function getProjects(ids) {
  const params = new URLSearchParams({ ids: JSON.stringify(ids) })
  return httpsGetJson(`${BASE}/projects?${params}`)
}

async function resolveDependencies(version, gameVersion, loaders, depth = 0, visited = new Set(), deps = []) {
  if (depth > 3) return deps
  if (!version.dependencies || version.dependencies.length === 0) return deps

  for (const dep of version.dependencies) {
    if (dep.dependency_type !== 'required') continue
    if (!dep.project_id || visited.has(dep.project_id)) continue
    visited.add(dep.project_id)

    try {
      const depVersions = await getProjectVersions(dep.project_id, { gameVersions: [gameVersion], loaders })
      if (!Array.isArray(depVersions) || depVersions.length === 0) continue
      const bestVersion = depVersions.find(v => v.version_type === 'release') || depVersions[0]
      if (!bestVersion) continue
      deps.push(bestVersion)
      await resolveDependencies(bestVersion, gameVersion, loaders, depth + 1, visited, deps)
    } catch {}
  }
  return deps
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
    platform:    'modrinth',
  }
  try { fs.writeFileSync(trackPath, JSON.stringify(tracking, null, 2)) } catch {}
}

async function installVersion(opts) {
  const { versionId, projectType, instancePath, onProgress, deleteOldVersions } = opts

  const version = await getVersion(versionId)
  const primaryFile = version.files?.find(f => f.primary) || version.files?.[0]
  if (!primaryFile) throw new Error('No file found for this version')

  const baseDir = instancePath

  const folderMap = {
    mod:          'mods',
    modpack:      'modpacks',
    shader:       'shaderpacks',
    resourcepack: 'resourcepacks',
    datapack:     'datapacks',
  }
  const folder = folderMap[projectType] || 'mods'
  const destDir = path.join(baseDir, folder)
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

  const destPath = path.join(destDir, primaryFile.filename)

  if (fs.existsSync(destPath) && !deleteOldVersions) {
    onProgress?.({ log: `Already installed: ${primaryFile.filename}`, percent: 100 })
    return { ok: true, path: destPath, alreadyInstalled: true }
  }

  if (deleteOldVersions) {
    deleteOldModFiles(destDir, String(version.project_id), primaryFile.filename, {
      versionId:    version.id,
      versionNumber: version.version_number,
      datePublished: version.date_published,
    })
  }

  onProgress?.({ log: `Downloading ${primaryFile.filename}...`, percent: 0 })
  await downloadFile(primaryFile.url, destPath, (p) => {
    onProgress?.({ ...p, log: `${primaryFile.filename}: ${p.percent}%` })
  })
  onProgress?.({ log: `Installed: ${primaryFile.filename}`, percent: 100 })

  const gameVersions = version.game_versions || []
  const loaders = version.loaders || []
  const gameVersion = gameVersions[0] || ''
  if (projectType === 'mod' && gameVersion && loaders.length > 0) {
    onProgress?.({ log: 'Checking dependencies...', percent: 0 })
    const dependencies = await resolveDependencies(version, gameVersion, loaders)
    if (dependencies.length > 0) {
      onProgress?.({ log: `Found ${dependencies.length} required dependenc(ies)`, percent: 10 })
      for (let i = 0; i < dependencies.length; i++) {
        const dep = dependencies[i]
        const depFile = dep.files?.find(f => f.primary) || dep.files?.[0]
        if (!depFile) continue
        const depPath = path.join(destDir, depFile.filename)
        if (fs.existsSync(depPath)) {
          onProgress?.({ log: `[${i + 1}/${dependencies.length}] Already installed: ${depFile.filename}`, percent: 10 + Math.round((i / dependencies.length) * 80) })
          continue
        }
        onProgress?.({ log: `[${i + 1}/${dependencies.length}] Downloading dependency: ${depFile.filename}...`, percent: 10 + Math.round((i / dependencies.length) * 80) })
        try {
          await downloadFile(depFile.url, depPath, (p) => {
            onProgress?.({ ...p, log: `[${i + 1}/${dependencies.length}] Dependency ${depFile.filename}: ${p.percent}%` })
          })
        } catch (err) {
          onProgress?.({ log: `[${i + 1}/${dependencies.length}] Failed: ${depFile.filename} - ${err.message}`, percent: 10 + Math.round((i / dependencies.length) * 80) })
        }
      }
    }
    onProgress?.({ log: 'Install complete', percent: 100 })
  }

  return { ok: true, path: destPath, filename: primaryFile.filename }
}

async function getGameVersions() {
  try {
    const versions = await httpsGetJson(`${BASE}/tag/game_version`)

    return versions.map(v => ({ version: v.version, type: v.version_type || 'release' }))
  } catch {

    const data = await httpsGetJson('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json')
    return data.versions.map(v => ({ version: v.id, type: v.type || 'release' }))
  }
}

async function getCategories() {
  return httpsGetJson(`${BASE}/tag/category`)
}

module.exports = {
  searchProjects,
  getProject,
  getProjectVersions,
  getVersion,
  getProjects,
  installVersion,
  getGameVersions,
  getCategories,
}

