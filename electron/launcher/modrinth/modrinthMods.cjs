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

const https  = require('https')
const http   = require('http')
const fs     = require('fs')
const path   = require('path')

const MODRINTH_API = 'https://api.modrinth.com/v2'

const FABRIC_AUTO_MODS = [
  // ── Core / API ──────────────────────────────────────────────────────────
  { id: 'P7dR8mSH', name: 'Fabric API' },
  { id: 'mOgUt4GM', name: 'Mod Menu' },
  { id: '9s6osm5g', name: 'Cloth Config API' },
  { id: 'Ha28R6CL', name: 'Fabric Language Kotlin' },

  // ── Render / GPU ────────────────────────────────────────────────────────
  { id: 'AANobbMI', name: 'Sodium' }, // modern OpenGL renderer
  { id: 'PtjYWJkn', name: 'Sodium Extra' }, // extra Sodium settings
  { id: 'YL57xq9U', name: 'Iris Shaders' }, // shader support for Sodium
  { id: 'Bh37bMuy', name: 'Reese\'s Sodium Options' }, // better Sodium settings UI
  { id: 'EsAfCjCV', name: 'Continuity' }, // connected textures support
  { id: '1eAoo2KR', name: 'Indium' }, // Sodium + Fabric Rendering API bridge
  { id: '5ZwThgaR', name: 'ImmediatelyFast' }, // immediate mode render opt
  { id: 'NNAgCjsB', name: 'Entity Culling' }, // skip hidden entity render
  { id: '51shyZVL', name: 'More Culling' }, // skip hidden block render
  { id: 'OVuFYfre', name: 'Enhanced Block Entities' }, // faster block entity render

  // ── Memory / CPU ────────────────────────────────────────────────────────
  { id: 'uXXizFIs', name: 'FerriteCore' }, // -30~40% RAM usage
  { id: 'gvQqBUqZ', name: 'Lithium' }, // game logic / AI / physics
  { id: 'nmDcB62a', name: 'ModernFix' }, // misc vanilla perf fixes
  { id: 'hEOCdOgW', name: 'BadOptimizations' }, // misc optimizations
  { id: 'hvFnDODi', name: 'LazyDFU' }, // faster startup
  { id: 'NRjRiSSD', name: 'Memory Leak Fix' }, // reduce memory leak cases

  // ── Chunk / World ────────────────────────────────────────────────────────
  { id: 'VSNURh3q', name: 'C2ME' }, // multithreaded chunk loading
  { id: 'KuNKN7d2', name: 'Noisium' }, // faster world gen noise
  { id: 'H8CaAYZC', name: 'Starlight' }, // rewritten lighting engine

  // ── Network ─────────────────────────────────────────────────────────────
  { id: 'fQEb0iXm', name: 'Krypton' }, // networking stack opt

  // ── Misc FPS ────────────────────────────────────────────────────────────
  { id: 'LQ3K71Q1', name: 'Dynamic FPS' }, // reduce FPS when unfocused
  { id: 'Wnxd13zP', name: 'Clumps' }, // merge XP orbs → less entities
  { id: 'QwxR6Gcd', name: 'Debugify' }, // vanilla bugfixes + small perf wins
]

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url)
    https.get({
      hostname: opts.hostname,
      path:     opts.pathname + opts.search,
      headers:  {
        'User-Agent': 'DinoIsekai/1.0 (github.com/foxstudio-201/VoxelXClient)',
        'Accept':     'application/json',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGetJson(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error(`Invalid JSON from ${url}`)) }
      })
    }).on('error', reject)
  })
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const dir = path.dirname(destPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const tmpPath = destPath + '.tmp'

    client.get(url, { headers: { 'User-Agent': 'DinoIsekai/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
      }
      const out = fs.createWriteStream(tmpPath)
      res.pipe(out)
      out.on('finish', () => { fs.renameSync(tmpPath, destPath); resolve() })
      out.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {} reject(err) })
      res.on('error', err => { try { fs.unlinkSync(tmpPath) } catch {} reject(err) })
    }).on('error', reject)
  })
}

async function findModVersion(projectId, mcVersion) {
  const url = `${MODRINTH_API}/project/${projectId}/version?game_versions=["${mcVersion}"]&loaders=["fabric"]`
  const versions = await httpsGetJson(url)
  if (!Array.isArray(versions) || versions.length === 0) return null

  versions.sort((a, b) => new Date(b.date_published) - new Date(a.date_published))
  return versions[0]
}

async function ensureFabricMods(mcVersion, modsDir, onProgress, includePerformanceMods = false) {
  if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true })

  // Xác định danh sách mod cần cài: luôn cài Fabric API + Mod Menu, còn lại tùy toggle
  const ALWAYS_INSTALL_IDS = new Set(['P7dR8mSH', 'mOgUt4GM']) // fabric-api, mod-menu
  const modsToInstall = includePerformanceMods
    ? FABRIC_AUTO_MODS
    : FABRIC_AUTO_MODS.filter(m => ALWAYS_INSTALL_IDS.has(m.id))

  // Chỉ cài auto-mod đúng 1 lần cho mỗi phiên bản Minecraft trong profile.
  // Những lần sau sẽ bỏ qua hoàn toàn, kể cả khi user xoá bớt mod thủ công.
  const onceMarkerPath = path.join(modsDir, `.voxelx-auto-mods.fabric.${mcVersion}.done`)
  if (fs.existsSync(onceMarkerPath)) {
    onProgress?.({ log: `Auto-optimization mods already processed once for ${mcVersion}; skipping re-download.`, done: 1, total: 1 })
    return
  }

  // Ghi marker ngay từ đầu để đảm bảo "run once only".
  try {
    fs.writeFileSync(onceMarkerPath, `${new Date().toISOString()} | ${mcVersion}\n`, 'utf8')
  } catch (err) {
    onProgress?.({ log: `Warning: cannot create run-once marker: ${err.message}`, done: 0, total: 1 })
  }

  let done = 0
  const total = modsToInstall.length

  for (const mod of modsToInstall) {
    done++
    onProgress?.({ log: `Checking ${mod.name} for ${mcVersion}...`, done, total })

    let version
    try {
      version = await findModVersion(mod.id, mcVersion)
    } catch (err) {
      onProgress?.({ log: `Warning: Could not fetch ${mod.name}: ${err.message}`, done, total })
      continue
    }

    if (!version) {
      onProgress?.({ log: `${mod.name}: no compatible version for ${mcVersion}, skipping.`, done, total })
      continue
    }

    const primaryFile = version.files?.find(f => f.primary) || version.files?.[0]
    if (!primaryFile) {
      onProgress?.({ log: `${mod.name}: no file found, skipping.`, done, total })
      continue
    }

    const fileName = primaryFile.filename
    const destPath = path.join(modsDir, fileName)

    if (fs.existsSync(destPath)) {
      onProgress?.({ log: `${mod.name} already installed (${fileName}).`, done, total })
      continue
    }

    // Xóa file jar cũ của cùng mod (khác version) dựa trên tên file gốc từ Modrinth
    try {
      const allFiles = version.files?.map(f => f.filename) || []
      const existing = fs.readdirSync(modsDir)
      for (const f of existing) {
        if (!f.endsWith('.jar') && !f.endsWith('.jar.off') && !f.endsWith('.jar.disabled')) continue
        if (f === fileName) continue
        // So sánh slug: lấy phần trước số version đầu tiên
        const fSlug    = f.replace(/[-_](v?\d[\d._\-+]*).*\.jar.*$/i, '').toLowerCase()
        const newSlug  = fileName.replace(/[-_](v?\d[\d._\-+]*).*\.jar.*$/i, '').toLowerCase()
        if (fSlug === newSlug && fSlug.length > 3) {
          fs.unlinkSync(path.join(modsDir, f))
          onProgress?.({ log: `Removed old ${mod.name}: ${f}`, done, total })
        }
      }
    } catch {}

    onProgress?.({ log: `Downloading ${mod.name} ${version.version_number}...`, done, total })
    try {
      await downloadFile(primaryFile.url, destPath)
      onProgress?.({ log: `${mod.name} ${version.version_number} installed.`, done, total })
    } catch (err) {
      onProgress?.({ log: `Failed to download ${mod.name}: ${err.message}`, done, total })
    }
  }
}

module.exports = { ensureFabricMods }

