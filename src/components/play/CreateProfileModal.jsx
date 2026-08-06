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

import { useState, useCallback, useEffect, useRef } from 'react'
import { useLang } from '../../i18n/LangProvider'

import vanillaIcon   from '../../assets/loader/vanilla.png'
import fabricIcon    from '../../assets/loader/fabric.png'
import forgeIcon     from '../../assets/loader/forge.png'
import neoforgeIcon  from '../../assets/loader/neoforge.png'
import defaultBg   from '../../assets/minecraft-versions/default.png'

import v112 from '../../assets/minecraft-versions/1.12.png'
import v115 from '../../assets/minecraft-versions/1.15.png'
import v116 from '../../assets/minecraft-versions/1.16.png'
import v117 from '../../assets/minecraft-versions/1.17.png'
import v118 from '../../assets/minecraft-versions/1.18.png'
import v119 from '../../assets/minecraft-versions/1.19.png'
import v120 from '../../assets/minecraft-versions/1.20.png'
import v121 from '../../assets/minecraft-versions/1.21.png'
import v26  from '../../assets/minecraft-versions/26.png'

const VERSION_IMAGES = {
  '1.12': v112,
  '1.15': v115,
  '1.16': v116,
  '1.17': v117,
  '1.18': v118,
  '1.19': v119,
  '1.20': v120,
  '1.21': v121,
  '26':   v26,
}

const RELEASE_GROUPS_FALLBACK = [
  { major: '26',   versions: ['26', '26.0.1'] },
  { major: '1.21', versions: ['1.21', '1.21.1', '1.21.2', '1.21.3', '1.21.4'] },
  { major: '1.20', versions: ['1.20', '1.20.1', '1.20.2', '1.20.3', '1.20.4', '1.20.6'] },
  { major: '1.19', versions: ['1.19', '1.19.1', '1.19.2', '1.19.4'] },
  { major: '1.18', versions: ['1.18', '1.18.2'] },
  { major: '1.17', versions: ['1.17', '1.17.1'] },
  { major: '1.16', versions: ['1.16', '1.16.1', '1.16.2', '1.16.3', '1.16.4', '1.16.5'] },
  { major: '1.15', versions: ['1.15', '1.15.1', '1.15.2'] },
  { major: '1.12', versions: ['1.12', '1.12.2'] },
]

async function fetchVersionGroups() {

  let versions
  if (typeof window !== 'undefined' && window.electronAPI?.minecraftListVersions) {
    const result = await window.electronAPI.minecraftListVersions()
    if (result?.error) throw new Error(result.error)
    versions = result.data
  } else {

    const res = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const manifest = await res.json()
    versions = manifest.versions
  }

  const majorMap = new Map()

  function ensureMajor(m) {
    if (!majorMap.has(m)) majorMap.set(m, { release: [], pre: [], snapshot: [] })
    return majorMap.get(m)
  }

  let currentMajor = null

  for (const v of versions) {
    const id   = v.id
    const type = v.type

    if (type === 'release') {
      // Support cả format cũ "1.x.x" và format mới "26.x.x"
      if (!/^(\d+\.\d+(\.\d+)?|[2-9]\d(\.\d+)?)$/.test(id)) continue
      // Tách major: "1.21.1" → "1.21", "26.0.1" → "26"
      let major
      if (id.startsWith('1.')) {
        const m = id.match(/^(1\.\d+)/)
        major = m ? m[1] : null
      } else {
        const m = id.match(/^(\d+)/)
        major = m ? m[1] : null
      }
      if (major) {
        currentMajor = major
        ensureMajor(currentMajor).release.push(id)
      }
    } else if (type === 'snapshot') {
      if (/-(pre|rc)\d*$/i.test(id)) {
        // Pre-release / RC — cả format cũ "1.21-pre1" và mới "26-pre1"
        let major
        const m1 = id.match(/^(1\.\d+)/)
        const m2 = id.match(/^(\d+)/)
        major = m1 ? m1[1] : (m2 ? m2[1] : currentMajor)
        if (major) ensureMajor(major).pre.push(id)
      } else {
        if (currentMajor) ensureMajor(currentMajor).snapshot.push(id)
      }
    } else if (type === 'old_beta') {
      ensureMajor('Beta').release.push(id)
    } else if (type === 'old_alpha') {
      ensureMajor('Alpha').release.push(id)
    }
  }

  const numericMajors = Array.from(majorMap.keys())
    .filter(m => m !== 'Beta' && m !== 'Alpha')
    .sort((a, b) => {

      const aParts = a.split('.').map(Number)
      const bParts = b.split('.').map(Number)
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const diff = (bParts[i] ?? 0) - (aParts[i] ?? 0)
        if (diff !== 0) return diff
      }
      return 0
    })
  const sortedMajors = [...numericMajors, 'Beta', 'Alpha'].filter(m => majorMap.has(m))

  const releaseGroups = numericMajors
    .filter(m => majorMap.get(m).release.length > 0)
    .map(m => ({ major: m, versions: majorMap.get(m).release }))

  const vanillaGroups = sortedMajors
    .filter(m => {
      const g = majorMap.get(m)
      return g.release.length + g.pre.length + g.snapshot.length > 0
    })
    .map(m => {
      const g = majorMap.get(m)
      const sections = []
      if (g.release.length)  sections.push({ label: 'Release',          versions: g.release })
      if (g.pre.length)      sections.push({ label: 'Pre-release / RC', versions: g.pre })
      if (g.snapshot.length) sections.push({ label: 'Snapshot',         versions: g.snapshot })
      return { major: m, sections }
    })

  return { releaseGroups, vanillaGroups }
}

let _versionCache2 = null
async function getVersionGroups() {
  if (_versionCache2) return _versionCache2
  try {
    _versionCache2 = await fetchVersionGroups()
    return _versionCache2
  } catch (e) {
    console.warn('[VersionGroups] fetch failed, using fallback:', e.message)
    return { releaseGroups: RELEASE_GROUPS_FALLBACK, vanillaGroups: null }
  }
}

const LOADERS = [
  { id: 'vanilla',  label: 'Vanilla',   icon: vanillaIcon,  color: '#a78bfa', bg: 'bg-violet-500',  ring: 'ring-violet-500/40',  text: 'text-violet-400',  btnClass: 'bg-violet-500 hover:bg-violet-400 shadow-violet-500/20' },
  { id: 'fabric',   label: 'Fabric',    icon: fabricIcon,   color: '#a855f7', bg: 'bg-purple-500', ring: 'ring-purple-500/40', text: 'text-purple-400', btnClass: 'bg-purple-500 hover:bg-purple-400 shadow-purple-500/20' },
  { id: 'forge',    label: 'Forge',     icon: forgeIcon,    color: '#8b5cf6', bg: 'bg-violet-500', ring: 'ring-violet-500/40', text: 'text-violet-400', btnClass: 'bg-violet-500 hover:bg-violet-400 shadow-violet-500/20' },
  { id: 'neoforge', label: 'NeoForge',  icon: neoforgeIcon, color: '#f43f5e', bg: 'bg-rose-500',   ring: 'ring-rose-500/40',   text: 'text-rose-400',   btnClass: 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20' },
]

function getMajorVersion(v) {
  const parts = v.split('.')
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : v
}

function getVersionImage(gameVersion) {
  if (!gameVersion) return defaultBg
  const major = getMajorVersion(gameVersion)
  return VERSION_IMAGES[major] || defaultBg
}

const isElectron = typeof window !== 'undefined' && window.electronAPI

function GroupContent({ group, selectedVersion, onSelect }) {
  const sections = group.sections || []
  const [activeTab, setActiveTab] = useState(() => sections[0]?.label ?? 'Release')

  const currentTab = sections.find(s => s.label === activeTab) ? activeTab : sections[0]?.label

  const TAB_COLORS = {
    'Release':          'bg-violet-500/15 border-violet-500/30 text-violet-400',
    'Pre-release / RC': 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
    'Snapshot':         'bg-blue-500/15 border-blue-500/30 text-blue-400',
  }

  const currentVersions = sections.find(s => s.label === currentTab)?.versions ?? []

  return (
    <div className="border-t border-white/5 bg-black/15">
      {}
      {sections.length > 1 && (
        <div className="flex gap-1.5 px-3 pt-3 pb-2">
          {sections.map(sec => {
            const isActive = sec.label === currentTab
            const colorClass = TAB_COLORS[sec.label] ?? 'bg-white/8 border-white/15 text-white/60'
            return (
              <button
                key={sec.label}
                onClick={() => setActiveTab(sec.label)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-150
                  ${isActive ? colorClass : 'border-transparent text-white/30 hover:text-white/55 hover:bg-white/5'}`}
              >
                {sec.label}
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded min-w-[18px] text-center
                  ${isActive ? 'bg-white/15' : 'bg-white/8 text-white/25'}`}>
                  {sec.versions.length > 99 ? '99+' : sec.versions.length}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {}
      <div className="overflow-y-auto px-3 pb-3 pt-1" style={{ maxHeight: '160px' }}>
        <div className="grid grid-cols-3 gap-2">
          {currentVersions.map(v => {
            const active = selectedVersion === v
            return (
              <button
                key={v}
                onClick={() => onSelect(v)}
                className={`
                  py-2 px-2 rounded-lg text-xs font-mono font-semibold
                  transition-all duration-150 active:scale-95 truncate
                  ${active
                    ? 'bg-violet-500/25 text-violet-400 border border-violet-500/40'
                    : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10 hover:text-white/90'
                  }
                `}
                title={v}
              >
                {v}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function VanillaVersionAccordion({ selectedVersion, onSelect, groups }) {
  const [openGroup, setOpenGroup] = useState(() => {
    if (!selectedVersion) return '1.21'
    return getMajorVersion(selectedVersion)
  })

  return (
    <div className="flex flex-col gap-3">
      {(groups || []).map(group => {
        const isOpen = openGroup === group.major
        const bgImg  = VERSION_IMAGES[group.major] || defaultBg
        const totalVersions = group.sections ? group.sections.reduce((s, sec) => s + sec.versions.length, 0) : 0

        return (
          <div key={group.major} className="rounded-xl overflow-hidden border border-white/8">
            {}
            <button
              onClick={() => setOpenGroup(isOpen ? null : group.major)}
              className="w-full relative h-44 flex items-end justify-between px-5 pb-4 overflow-hidden group"
            >
              <img
                src={bgImg}
                alt={group.major}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col items-start">
                <span className="text-3xl font-black text-white drop-shadow-lg tracking-tight">{group.major}</span>
                <span className="text-sm text-white/60 mt-0.5">{totalVersions} phiên bản</span>
              </div>
              <div className="relative z-10 self-end">
                <svg viewBox="0 0 24 24" fill="currentColor"
                  className={`w-7 h-7 text-white/80 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </div>
            </button>

            {}
            {(() => {

              const tabsH   = (group.sections?.length ?? 0) > 1 ? 52 : 0
              const gridH   = 160
              const totalH  = tabsH + gridH + 16
              return (
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isOpen ? `${totalH}px` : '0px',
                    opacity:   isOpen ? 1 : 0,
                  }}
                >
                  <GroupContent group={group} selectedVersion={selectedVersion} onSelect={onSelect} />
                </div>
              )
            })()}
          </div>
        )
      })}
    </div>
  )
}

function VersionAccordion({ selectedVersion, onSelect, groups }) {
  const [openGroup, setOpenGroup] = useState(() => {
    if (!selectedVersion) return '1.21'
    return getMajorVersion(selectedVersion)
  })

  return (
    <div className="flex flex-col gap-3">
      {(groups || []).map(group => {
        const isOpen = openGroup === group.major
        const bgImg  = VERSION_IMAGES[group.major] || defaultBg

        return (
          <div key={group.major} className="rounded-xl overflow-hidden border border-white/8">
            {}
            <button
              onClick={() => setOpenGroup(isOpen ? null : group.major)}
              className="w-full relative h-44 flex items-end justify-between px-5 pb-4 overflow-hidden group"
            >
              {}
              <img
                src={bgImg}
                alt={group.major}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                style={{ opacity: 1 }}
                draggable={false}
              />
              {}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
              {}
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />

              {}
              <div className="relative z-10 flex flex-col items-start">
                <span className="text-3xl font-black text-white drop-shadow-lg tracking-tight">
                  {group.major}
                </span>
                <span className="text-sm text-white/60 mt-0.5">{group.versions.length} phiên bản</span>
              </div>

              {}
              <div className="relative z-10 self-end">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`w-7 h-7 text-white/80 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </div>
            </button>

            {}
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: isOpen ? `${Math.ceil(group.versions.length / 3) * 48 + 24}px` : '0px',
                opacity: isOpen ? 1 : 0,
              }}
            >
              <div className="grid grid-cols-3 gap-2 p-3 bg-black/20">
                {group.versions.map(v => {
                  const active = selectedVersion === v
                  return (
                    <button
                      key={v}
                      onClick={() => onSelect(v)}
                      className={`
                        py-2 px-3 rounded-lg text-sm font-mono font-semibold
                        transition-all duration-150 active:scale-95
                        ${active
                          ? 'bg-violet-500/25 text-violet-400 border border-violet-500/40 shadow-sm shadow-violet-500/20'
                          : 'bg-white/5 text-white/55 border border-white/5 hover:bg-white/10 hover:text-white/90 hover:border-white/15'
                        }
                      `}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LoaderVersionList({ loader, gameVersion, selectedVersion, onSelect }) {
  const loaderCfg = LOADERS.find(l => l.id === loader)
  const [versions, setVersions]         = useState([])
  const [forgePromos, setForgePromos]   = useState({ recommended: null, latest: null })
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [activeTab, setActiveTab]       = useState('stable')
  const [forgeTab, setForgeTab]         = useState('recommended')

  const doFetch = useCallback(async () => {
    setVersions([])
    setLoading(true)
    setError(null)

    try {
      if (loader === 'fabric') {
        let data
        if (window.electronAPI?.fabricGetLoaderVersions) {
          const result = await window.electronAPI.fabricGetLoaderVersions(gameVersion)
          if (result?.error) throw new Error(result.error)
          data = result.data
        } else {
          const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(gameVersion)}`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const json = await res.json()
          data = json.map(item => ({ version: item.loader.version, stable: item.loader.stable }))
        }
        setVersions(data)
        setActiveTab('stable')

      } else if (loader === 'forge') {
        let result
        if (window.electronAPI?.forgeGetVersions) {
          result = await window.electronAPI.forgeGetVersions(gameVersion)
          if (result?.error) throw new Error(result.error)
        } else {
          throw new Error('Forge API chỉ khả dụng trong Electron')
        }
        setVersions(result.data.versions)
        setForgePromos({ recommended: result.data.recommended, latest: result.data.latest })
        setForgeTab('recommended')
      } else if (loader === 'neoforge') {
        let result
        if (window.electronAPI?.neoforgeGetVersions) {
          result = await window.electronAPI.neoforgeGetVersions(gameVersion)
          if (result?.error) throw new Error(result.error)
        } else {
          throw new Error('NeoForge API chỉ khả dụng trong Electron')
        }
        setVersions(result.data.versions)
        setForgePromos({ recommended: null, latest: result.data.latest })
        setForgeTab('latest')
      }
    } catch (err) {
      setError(`Không thể tải ${loaderCfg?.label} loader cho ${gameVersion}.`)
    } finally {
      setLoading(false)
    }
  }, [loader, gameVersion, loaderCfg])

  useEffect(() => {
    if (!gameVersion) return
    if (loader !== 'fabric' && loader !== 'forge' && loader !== 'neoforge') return
    doFetch()
  }, [loader, gameVersion, doFetch])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <svg className={`animate-spin w-5 h-5 ${loader === 'fabric' ? 'text-purple-400' : 'text-violet-400'}`}
        viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <p className="text-xs text-white/30">Đang tải {loaderCfg?.label} loader cho {gameVersion}...</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-red-400/50">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <p className="text-xs text-red-400/70 text-center">{error}</p>
      <button onClick={doFetch}
        className="px-4 py-1.5 rounded-lg bg-white/8 border border-white/10 text-xs text-white/60 hover:text-white/90 hover:bg-white/12 transition-all">
        Thử lại
      </button>
    </div>
  )

  if (loader === 'fabric') {
    const allStable  = versions.filter(v => v.stable)
    const allBeta    = versions.filter(v => !v.stable)
    const stableLatest = allStable.slice(0, 1)
    const oldVersions  = allStable.slice(1)
    const recommended  = allStable[0]?.version ?? null

    const TABS = [
      { id: 'stable', label: 'Stable', count: stableLatest.length, activeBg: 'bg-violet-500/15 border-violet-500/30 text-violet-400' },
      { id: 'beta',   label: 'Beta',   count: allBeta.length,      activeBg: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' },
      { id: 'old',    label: 'Old',    count: oldVersions.length,  activeBg: 'bg-white/8 border-white/15 text-white/70' },
    ]
    const tabData = { stable: stableLatest, beta: allBeta, old: oldVersions }
    const currentVersions = tabData[activeTab] ?? []

    return (
      <div className="flex flex-col gap-3">
        {}
        <div className="flex gap-1.5 p-1 bg-white/4 rounded-xl border border-white/5">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all duration-150
                ${activeTab === tab.id ? tab.activeBg : 'border-transparent text-white/30 hover:text-white/55 hover:bg-white/5'}`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded-md min-w-[18px] text-center
                  ${activeTab === tab.id ? 'bg-white/15' : 'bg-white/8 text-white/25'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {}
        {currentVersions.length === 0
          ? <div className="flex items-center justify-center py-8"><p className="text-xs text-white/20">Không có phiên bản nào</p></div>
          : <div className="flex flex-col gap-0.5">
              {currentVersions.map(item => {
                const v = item.version; const active = selectedVersion === v; const isRec = v === recommended
                return (
                  <button key={v} onClick={() => onSelect(v)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-mono transition-all duration-150 active:scale-[0.98]
                      ${active ? `bg-white/8 border ring-1 ${loaderCfg?.ring} border-white/10 ${loaderCfg?.text}` : 'border border-transparent text-white/55 hover:bg-white/5 hover:text-white/85'}`}>
                    <span>{v}</span>
                    <div className="flex items-center gap-2">
                      {isRec && <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${active ? 'bg-violet-500/25 text-violet-300' : 'bg-violet-500/12 text-violet-400/80'}`}>Recommended</span>}
                      {active && <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                    </div>
                  </button>
                )
              })}
            </div>
        }
      </div>
    )
  }

  if (loader === 'forge' || loader === 'neoforge') {
    const { recommended, latest } = forgePromos
    const isNeo = loader === 'neoforge'

    const recVersions    = recommended ? versions.filter(v => v === recommended) : []
    const latestVersions = latest && latest !== recommended ? versions.filter(v => v === latest) : []
    const allVersions    = versions

    const FORGE_TABS = isNeo
      ? [
          { id: 'latest', label: 'Latest', count: latestVersions.length, activeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400' },
          { id: 'all',    label: 'All',    count: allVersions.length,    activeBg: 'bg-white/8 border-white/15 text-white/70' },
        ]
      : [
          { id: 'recommended', label: 'Recommended', count: recVersions.length,    activeBg: 'bg-violet-500/15 border-violet-500/30 text-violet-400' },
          { id: 'latest',      label: 'Latest',      count: latestVersions.length, activeBg: 'bg-violet-500/15 border-violet-500/30 text-violet-400' },
          { id: 'all',         label: 'All',          count: allVersions.length,    activeBg: 'bg-white/8 border-white/15 text-white/70' },
        ]

    const forgeTabData = { recommended: recVersions, latest: isNeo ? allVersions.slice(0, 1) : latestVersions, all: allVersions }
    const currentForgeVersions = forgeTabData[forgeTab] ?? []

    return (
      <div className="flex flex-col gap-3">
        {}
        <div className="flex gap-1.5 p-1 bg-white/4 rounded-xl border border-white/5">
          {FORGE_TABS.map(tab => (
            <button key={tab.id} onClick={() => setForgeTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all duration-150
                ${forgeTab === tab.id ? tab.activeBg : 'border-transparent text-white/30 hover:text-white/55 hover:bg-white/5'}`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded-md min-w-[18px] text-center
                  ${forgeTab === tab.id ? 'bg-white/15' : 'bg-white/8 text-white/25'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {}
        {currentForgeVersions.length === 0
          ? <div className="flex items-center justify-center py-8"><p className="text-xs text-white/20">Không có phiên bản nào</p></div>
          : <div className="flex flex-col gap-0.5">
              {currentForgeVersions.map(v => {
                const active = selectedVersion === v
                const isRec  = v === recommended
                const isLat  = v === latest
                return (
                  <button key={v} onClick={() => onSelect(v)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-mono transition-all duration-150 active:scale-[0.98]
                      ${active ? `bg-white/8 border ring-1 ${loaderCfg?.ring} border-white/10 ${loaderCfg?.text}` : 'border border-transparent text-white/55 hover:bg-white/5 hover:text-white/85'}`}>
                    <span>{v}</span>
                    <div className="flex items-center gap-2">
                      {isRec && <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${active ? 'bg-violet-500/25 text-violet-300' : 'bg-violet-500/12 text-violet-400/80'}`}>Recommended</span>}
                      {isLat && !isRec && <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${active ? 'bg-violet-500/25 text-violet-300' : 'bg-violet-500/12 text-violet-400/80'}`}>Latest</span>}
                      {isNeo && v === allVersions[0] && <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${active ? 'bg-rose-500/25 text-rose-300' : 'bg-rose-500/12 text-rose-400/80'}`}>Latest</span>}
                      {active && <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                    </div>
                  </button>
                )
              })}
            </div>
        }
      </div>
    )
  }

  return null
}

export default function CreateProfileModal({ onClose, onCreate }) {
  const { t } = useLang()
  const [loader, setLoader]               = useState('vanilla')
  const [gameVersion, setGameVersion]     = useState('')
  const [loaderVersion, setLoaderVersion] = useState('')
  const [name, setName]                   = useState('')
  const [instancePath, setInstancePath]   = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [versionGroups, setVersionGroups] = useState({ releaseGroups: RELEASE_GROUPS_FALLBACK, vanillaGroups: null })

  useEffect(() => {
    getVersionGroups().then(groups => setVersionGroups(groups)).catch(() => {})
  }, [])

  const loaderCfg = LOADERS.find(l => l.id === loader)

  function handleLoaderChange(newLoader) {
    setLoader(newLoader)
    setLoaderVersion('')
    setGameVersion('')
  }

  function handleGameVersionSelect(v) {
    setGameVersion(v)
    setLoaderVersion('')
  }

  async function handleBrowse() {
    if (!isElectron) return
    const result = await window.electronAPI.browseFolder()
    if (result?.ok && result.path) setInstancePath(result.path)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!gameVersion) return
    if (loader !== 'vanilla' && !loaderVersion) return

    setSubmitting(true)
    try {
      await onCreate({
        name,
        loader,
        gameVersion,
        loaderVersion: loader === 'vanilla' ? '' : loaderVersion,
        instancePath,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = gameVersion && (loader === 'vanilla' || loaderVersion)

  return (

    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {}
      <div
        className="rounded-2xl border border-white/5 shadow-2xl flex overflow-hidden"
        style={{ width: 1100, maxHeight: '92vh', background: 'rgba(14,14,14,0.98)' }}
        onClick={e => e.stopPropagation()}
      >
        {}
        <div
          className="flex flex-col gap-5 p-7 border-r border-white/5 flex-shrink-0 overflow-y-auto"
          style={{ width: 380 }}
        >
          {}
          <div>
            <h2 className="text-base font-bold text-white">{t('playpage.createProfile.title')}</h2>
            <p className={`text-xs mt-0.5 ${loaderCfg?.text}`}>
              {loaderCfg?.label}
              {gameVersion ? ` · ${gameVersion}` : ''}
            </p>
          </div>

          {}
          <div className="rounded-xl overflow-hidden border border-white/5" style={{ height: 140 }}>
            <img
              src={getVersionImage(gameVersion)}
              alt={gameVersion || 'preview'}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>

          {}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              {t('playpage.createProfile.profileName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('playpage.createProfile.profileNamePlaceholder')}
              maxLength={64}
              className="
                w-full px-3 py-2 rounded-xl bg-white/5 border border-white/8
                text-sm text-white placeholder-white/20
                focus:outline-none focus:border-white/20 focus:bg-white/8
                transition-all
              "
            />
          </div>

          {}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              {t('playpage.createProfile.gameFolder')}
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={instancePath}
                onChange={e => setInstancePath(e.target.value)}
                placeholder={t('playpage.createProfile.gameFolderPlaceholder')}
                className="
                  flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/8
                  text-xs text-white placeholder-white/20
                  focus:outline-none focus:border-white/20 focus:bg-white/8
                  transition-all
                "
              />
              {isElectron && (
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="
                    flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl
                    bg-white/5 border border-white/8 text-white/40
                    hover:bg-white/10 hover:text-white/70 hover:border-white/15
                    transition-all
                  "
                  title={t('playpage.createProfile.browse')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              {t('playpage.createProfile.loader')}
            </label>
            <div className="flex gap-2">
              {LOADERS.map(l => (
                <button
                  key={l.id}
                  onClick={() => handleLoaderChange(l.id)}
                  className={`
                    flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all duration-150
                    ${loader === l.id
                      ? `bg-white/8 border-white/15 ring-1 ${l.ring}`
                      : 'border-white/5 hover:bg-white/5 hover:border-white/10'
                    }
                  `}
                >
                  <img src={l.icon} alt={l.label} className="w-6 h-6 object-contain" draggable={false} />
                  <span className={`text-xs font-semibold ${loader === l.id ? l.text : 'text-white/40'}`}>
                    {l.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {}
          <div className="flex-1" />

          {}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`
              w-full py-2.5 rounded-xl text-sm font-bold text-white
              transition-all duration-150 active:scale-95
              shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
              ${loaderCfg?.btnClass}
            `}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {t('playpage.createProfile.creating')}
              </span>
            ) : (
              t('playpage.createProfile.createBtn', { loader: loaderCfg?.label })
            )}
          </button>
        </div>

        {}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {}
          <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
            <p className="text-xs text-white/30 font-semibold uppercase tracking-wider">
              {loader === 'vanilla'
                ? t('playpage.createProfile.selectMinecraftVersion')
                : gameVersion
                  ? t('playpage.createProfile.selectLoaderVersion', { loader: loaderCfg?.label })
                  : t('playpage.createProfile.selectMinecraftVersion')
              }
            </p>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div className="border-t border-white/5 flex-shrink-0" />

          {}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loader === 'vanilla' ? (
              <VanillaVersionAccordion
                selectedVersion={gameVersion}
                onSelect={setGameVersion}
                groups={versionGroups.vanillaGroups ?? versionGroups.releaseGroups.map(g => ({ major: g.major, sections: [{ label: 'Release', versions: g.versions }] }))}
              />
            ) : !gameVersion ? (

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-[10px] font-bold text-white">1</div>
                  <p className="text-xs font-semibold text-white/60">{t('playpage.createProfile.selectMinecraftVersion')}</p>
                </div>
                {loader === 'neoforge' && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-rose-500/8 border border-rose-500/20 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-rose-400 flex-shrink-0">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <p className="text-[10px] text-rose-400/80">{t('playpage.createProfile.neoforgeHint')}</p>
                  </div>
                )}
                <VersionAccordion
                  selectedVersion={gameVersion}
                  onSelect={handleGameVersionSelect}
                  groups={loader === 'neoforge'
                    ? versionGroups.releaseGroups.filter(g => {
                        const parts = g.major.split('.')
                        const minor = parseInt(parts[1] ?? '0', 10)
                        return minor > 20 || (minor === 20 && (g.versions.some(v => {
                          const p = v.split('.'); return parseInt(p[2] ?? '0', 10) >= 2
                        })))
                      })
                    : versionGroups.releaseGroups
                  }
                />
              </div>
            ) : (

              <div>
                {}
                <button
                  onClick={() => { setGameVersion(''); setLoaderVersion('') }}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 mb-4 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                  </svg>
                  {t('playpage.createProfile.backToMinecraft', { version: gameVersion })}
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${loaderCfg?.bg || 'bg-white/15'}`}>2</div>
                  <p className="text-xs font-semibold text-white/60">{t('playpage.createProfile.selectLoaderVersion', { loader: loaderCfg?.label })}</p>
                </div>
                <LoaderVersionList
                  loader={loader}
                  gameVersion={gameVersion}
                  selectedVersion={loaderVersion}
                  onSelect={setLoaderVersion}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

