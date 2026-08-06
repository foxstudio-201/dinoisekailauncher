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

const BASE = 'https://api.modpacks.ch/public'
const UA   = 'DinoIsekai/1.0'

const packCache = new Map()

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        try { resolve(JSON.parse(data)) } catch { reject(new Error(`Invalid JSON from ${url}`)) }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function formatPack(p) {
  if (!p || !p.id) return null

  const squareArt = p.art?.find(a => a.type === 'square') || p.art?.[0]
  const splashArt = p.art?.find(a => a.type === 'splash') || p.art?.find(a => a.type === 'background')

  const latestVersion = p.versions?.[p.versions.length - 1]
  const mcVersion = latestVersion?.targets?.find(t => t.type === 'game')?.version || ''

  const categories = (p.tags || []).map(t => t.name)

  return {
    project_id:        String(p.id),
    slug:              String(p.id),
    title:             p.name || `FTB Pack ${p.id}`,
    description:       p.synopsis || '',
    body:              p.description || p.synopsis || '',
    author:            p.authors?.[0]?.name || 'FTB Team',
    downloads:         p.installs || 0,
    follows:           p.plays || 0,
    icon_url:          squareArt?.url || null,
    background_url:    splashArt?.url || null,
    gallery:           splashArt ? [{ url: splashArt.url }] : [],
    categories,
    display_categories: categories,
    game_versions:     mcVersion ? [mcVersion] : [],
    loaders:           ['forge'],
    source:            'ftb',
    updated:           p.updated ? new Date(p.updated * 1000).toISOString() : null,
    _versions:         p.versions || [],
  }
}

async function fetchPack(id) {
  if (packCache.has(id)) return packCache.get(id)
  try {
    const data = await fetchJson(`${BASE}/modpack/${id}`)
    if (!data || data.status === 'error') return null
    const formatted = formatPack(data)
    if (formatted) packCache.set(id, formatted)
    return formatted
  } catch {
    return null
  }
}

async function searchProjects(opts = {}) {
  const query  = (opts.query || '').trim()
  const offset = opts.offset || 0
  const limit  = 20

  let allIds = opts.allIds || null

  if (!allIds) {
    try {
      let ids = []
      if (!query || query === 'ftb') {

        const data = await fetchJson(`${BASE}/modpack/popular/installs/100`)
        if (data?.status === 'success' && Array.isArray(data.packs)) {
          ids = data.packs.map(id => Number(id))
        }
      } else {
        const data = await fetchJson(`${BASE}/modpack/search/100?term=${encodeURIComponent(query)}`)
        if (data && Array.isArray(data.packs)) {
          ids = data.packs.map(id => Number(id))
        }
      }
      allIds = ids
    } catch {
      return { hits: [], total_hits: 0, allIds: [] }
    }
  }

  const pageIds = allIds.slice(offset, offset + limit)

  const hits = []
  for (let i = 0; i < pageIds.length; i += 5) {
    const batch = pageIds.slice(i, i + 5)
    const results = await Promise.all(batch.map(id => fetchPack(id)))
    for (const r of results) {
      if (r) hits.push(r)
    }
  }

  return {
    hits,
    total_hits: allIds.length,
    allIds,
  }
}

async function getProject(idOrSlug) {
  const id = Number(idOrSlug)
  if (isNaN(id)) return null
  return fetchPack(id)
}

async function getProjectVersions(idOrSlug) {
  const id = Number(idOrSlug)
  if (isNaN(id)) return []

  const pack = await fetchPack(id)
  if (!pack) return []

  return (pack._versions || []).map(v => {
    const mcTarget     = v.targets?.find(t => t.type === 'game')
    const loaderTarget = v.targets?.find(t => t.type === 'modloader')
    const loader       = loaderTarget?.name || 'forge'
    const mcVersion    = mcTarget?.version || ''

    return {
      id:             String(v.id),
      project_id:     String(id),
      name:           v.name,
      version_number: v.name,
      version_type:   v.type?.toLowerCase() === 'release' ? 'release' : 'beta',
      date_published: v.updated ? new Date(v.updated * 1000).toISOString() : null,
      downloads:      pack.downloads || 0,
      game_versions:  mcVersion ? [mcVersion] : [],
      loaders:        [loader],
      files: [{
        url:      `ftb://${id}/${v.id}`,
        filename: `${pack.title}-${v.name}.zip`,
        size:     0,
        primary:  true,
      }],
      _ftb_pack_id:    id,
      _ftb_version_id: v.id,
      _specs:          v.specs,
    }
  }).reverse()
}

async function installVersion(opts, onProgress) {
  throw new Error('FTB modpack installation is not yet implemented.')
}

module.exports = { searchProjects, getProject, getProjectVersions, installVersion }

