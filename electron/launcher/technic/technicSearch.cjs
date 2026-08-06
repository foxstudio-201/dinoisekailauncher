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

const BASE = 'https://api.technicpack.net'

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'TechnicLauncher/167' } })
    if (!res.ok) throw new Error(`Technic API Error: ${res.status}`)
    return await res.json()
  } catch (error) {
    console.error(`[Technic API] Error fetching ${url}:`, error)
    return null
  }
}

const PAGE_SIZE = 20
const MAX_FETCH = 500

async function searchProjects(opts) {
  const query  = opts.query || 'tekkit'
  const offset = opts.offset || 0

  let allHits = opts.allHits || null

  if (!allHits) {
    const url = `${BASE}/search?q=${encodeURIComponent(query)}&build=999&limit=${MAX_FETCH}`
    const data = await fetchJson(url)
    if (!data || !data.modpacks) return { hits: [], total_hits: 0, allHits: [] }

    allHits = data.modpacks.map(p => ({
      project_id: p.id,
      slug: p.slug,
      title: p.name,
      description: '',
      author: 'Unknown',
      downloads: 0,
      follows: 0,
      icon_url: p.iconUrl,
      categories: ['Modpack'],
      display_categories: ['Modpack'],
      source: 'technic'
    }))
  }

  const hits = allHits.slice(offset, offset + PAGE_SIZE)
  return {
    hits,
    total_hits: allHits.length,
    allHits,
  }
}

async function getProject(slug) {
  const data = await fetchJson(`${BASE}/modpack/${slug}?build=999`)
  if (!data || data.error) return null

  return {
    project_id: data.id,
    slug: data.name,
    title: data.displayName,
    description: data.description,
    body: data.description,
    author: data.user,
    team: data.user,
    downloads: data.installs,
    follows: data.runs,
    followers: data.runs,
    icon_url: data.icon?.url,
    logo_url: data.logo?.url,
    background_url: data.background?.url,
    gallery: data.background?.url ? [{ url: data.background.url }] : [],
    updated: data.feed?.[0]?.date ? new Date(data.feed[0].date * 1000).toISOString() : null,
    categories: ['Modpack'],
    display_categories: ['Modpack'],
    source: 'technic',
    source_url: data.url,
    loaders: ['forge'],
    game_versions: data.minecraft ? [data.minecraft] : [],
    feed: (data.feed || []).map(f => ({
      user: f.user,
      date: f.date ? new Date(f.date * 1000).toISOString() : null,
      content: f.content,
      avatar: f.avatar,
      url: f.url,
    })),
    _solder: data.solder,
    _url: data.url
  }
}

async function getProjectVersions(slug) {
  const data = await fetchJson(`${BASE}/modpack/${slug}?build=999`)
  if (!data) return []

  const versions = []

  if (data.solder) {

    const solderUrl = data.solder.endsWith('/') ? data.solder : data.solder + '/'
    const solderData = await fetchJson(`${solderUrl}modpack/${slug}`)
    if (solderData && solderData.builds) {
      for (const build of solderData.builds) {
        versions.push({
          id: build,
          project_id: data.id,
          name: build,
          version_number: build,
          version_type: build === solderData.recommended ? 'release' : 'beta',
          date_published: Date.now(),
          downloads: data.installs,
          game_versions: [data.minecraft],
          loaders: ['forge'],
          files: [{ url: 'solder', filename: build, size: 0, primary: true }]
        })
      }
    }
  } else {

    versions.push({
      id: data.version,
      project_id: data.id,
      name: data.version,
      version_number: data.version,
      version_type: 'release',
      date_published: Date.now(),
      downloads: data.installs,
      game_versions: [data.minecraft],
      loaders: ['forge'],
      files: [{ url: data.url, filename: `${slug}-${data.version}.zip`, size: 0, primary: true }]
    })
  }
  return versions.reverse()
}

async function installVersion(opts, onProgress) {
  throw new Error("Technic modpack installation requires Solder API parsing which is not fully implemented yet.")
}

module.exports = {
  searchProjects,
  getProject,
  getProjectVersions,
  installVersion
}

