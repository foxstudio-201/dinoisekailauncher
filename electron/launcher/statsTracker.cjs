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

const fs   = require('fs')
const path = require('path')

function startPlaytimeTracker(profileId, profilesData, writeProfiles) {
  const startTime = Date.now()

  return function stop(crashed) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    const profile = profilesData.profiles.find(p => p.id === profileId)
    if (!profile) return

    profile.playtimeSeconds = (profile.playtimeSeconds || 0) + elapsed
    profile.lastPlayed = new Date().toISOString()
    profile.sessionCount = (profile.sessionCount || 0) + 1
    if (crashed) profile.crashCount = (profile.crashCount || 0) + 1

    const today = new Date().toISOString().slice(0, 10)
    profile.dailyPlay = profile.dailyPlay || {}
    profile.dailyPlay[today] = (profile.dailyPlay[today] || 0) + elapsed

    writeProfiles(profilesData)
    return elapsed
  }
}

function getProfileAnalytics(profile) {
  const stats = getProfileStats(profile)
  const sessionCount = profile.sessionCount || 0
  const playtimeSeconds = profile.playtimeSeconds || 0
  const effectiveSessions = sessionCount > 0 ? sessionCount : (playtimeSeconds > 0 ? 1 : 0)
  const avgSessionSeconds = effectiveSessions > 0 ? Math.floor(playtimeSeconds / effectiveSessions) : 0
  const crashCount = profile.crashCount || 0

  const dailyPlay = profile.dailyPlay || {}
  const now = new Date()
  const daily = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    daily.push({ date: key, seconds: dailyPlay[key] || 0 })
  }

  return {
    playtimeSeconds: stats.playtimeSeconds,
    playtimeFormatted: stats.playtimeFormatted,
    playtimeShort: stats.playtimeShort,
    lastPlayed: stats.lastPlayed,
    sessionCount,
    avgSessionSeconds,
    crashCount,
    daily,
  }
}

function formatPlaytime(seconds) {
  if (!seconds || seconds < 60) return '< 1 phút'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m} phút`
  if (m === 0) return `${h} giờ`
  return `${h} giờ ${m} phút`
}

function formatPlaytimeShort(seconds) {
  if (!seconds) return '0'
  const h = seconds / 3600
  if (h < 1) return `${Math.floor(seconds / 60)}m`
  return `${h.toFixed(1)}h`
}

function getWorlds(instancePath) {
  const savesDir = path.join(instancePath, 'saves')
  if (!fs.existsSync(savesDir)) return []

  try {
    const entries = fs.readdirSync(savesDir, { withFileTypes: true })
    return entries
      .filter(e => e.isDirectory())
      .map(e => {
        const worldDir = path.join(savesDir, e.name)
        const levelDat = path.join(worldDir, 'level.dat')
        let lastPlayed = null
        let size = 0

        try {
          const stat = fs.statSync(levelDat)
          lastPlayed = stat.mtime.toISOString()
        } catch {}

        try {
          size = getDirSize(worldDir)
        } catch {}

        return {
          name:       e.name,
          path:       worldDir,
          lastPlayed,
          sizeBytes:  size,
        }
      })
      .sort((a, b) => {
        if (!a.lastPlayed) return 1
        if (!b.lastPlayed) return -1
        return new Date(b.lastPlayed) - new Date(a.lastPlayed)
      })
  } catch {
    return []
  }
}

function getMods(instancePath) {
  const modsDir = path.join(instancePath, 'mods')
  if (!fs.existsSync(modsDir)) return []

  try {
    const entries = fs.readdirSync(modsDir, { withFileTypes: true })
    return entries
      .filter(e => e.isFile() && (e.name.endsWith('.jar') || e.name.endsWith('.jar.disabled')))
      .map(e => {
        const modPath = path.join(modsDir, e.name)
        const enabled = e.name.endsWith('.jar')
        let size = 0
        try { size = fs.statSync(modPath).size } catch {}

        return {
          filename: e.name,
          name:     e.name.replace(/\.jar(\.disabled)?$/, ''),
          path:     modPath,
          enabled,
          sizeBytes: size,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

function getDirSize(dirPath) {
  let total = 0
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dirPath, e.name)
      if (e.isDirectory()) total += getDirSize(full)
      else try { total += fs.statSync(full).size } catch {}
    }
  } catch {}
  return total
}

function getProfileStats(profile) {
  const instancePath = profile.instancePath

  const gameDirs = [instancePath]

  const worldMap = new Map()
  for (const dir of gameDirs) {
    for (const w of getWorlds(dir)) {

      const existing = worldMap.get(w.name)
      if (!existing || (w.lastPlayed && (!existing.lastPlayed || w.lastPlayed > existing.lastPlayed))) {
        worldMap.set(w.name, w)
      }
    }
  }
  const worlds = Array.from(worldMap.values()).sort((a, b) => {
    if (!a.lastPlayed) return 1
    if (!b.lastPlayed) return -1
    return new Date(b.lastPlayed) - new Date(a.lastPlayed)
  })

  const modMap = new Map()
  for (const dir of gameDirs) {
    for (const m of getMods(dir)) {
      if (!modMap.has(m.filename)) modMap.set(m.filename, m)
    }
  }
  const mods = Array.from(modMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  return {
    playtimeSeconds:   profile.playtimeSeconds || 0,
    playtimeFormatted: formatPlaytime(profile.playtimeSeconds || 0),
    playtimeShort:     formatPlaytimeShort(profile.playtimeSeconds || 0),
    lastPlayed:        profile.lastPlayed || null,
    worldCount:        worlds.length,
    worlds,
    modCount:          mods.filter(m => m.enabled).length,
    mods,
  }
}

module.exports = {
  startPlaytimeTracker,
  formatPlaytime,
  formatPlaytimeShort,
  getWorlds,
  getMods,
  getProfileStats,
  getProfileAnalytics,
}

