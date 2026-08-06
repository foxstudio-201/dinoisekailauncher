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

import { useState, useEffect, useRef, useMemo } from 'react'

const isElectron = typeof window !== 'undefined' && window.electronAPI

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'downloads', label: 'Downloads' },
  { value: 'follows',   label: 'Follows' },
  { value: 'newest',    label: 'Newest' },
  { value: 'updated',   label: 'Updated' },
]

const LOADER_OPTIONS = [
  { value: 'fabric',   label: 'Fabric',   color: 'text-purple-400' },
  { value: 'forge',    label: 'Forge',    color: 'text-violet-400' },
  { value: 'neoforge', label: 'NeoForge', color: 'text-rose-400' },
  { value: 'quilt',    label: 'Quilt',    color: 'text-blue-400' },
  { value: 'vanilla',  label: 'Vanilla',  color: 'text-violet-400' },
]

function CheckItem({ label, checked, onChange, color }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group py-1 px-1 rounded-lg transition-colors hover:bg-white/4" onClick={onChange}>
      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${
        checked ? 'bg-violet-500' : 'bg-white/8 border border-white/15 group-hover:border-white/30'
      }`}>
        {checked && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
      </div>
      <span className={`text-sm transition-colors leading-none ${checked ? (color || 'text-white/90') : 'text-white/50 group-hover:text-white/75'}`}>
        {label}
      </span>
    </label>
  )
}

function VersionGroupDropdown({ value, onChange, groups }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState({ top: 0, left: 0, maxHeight: 320 })
  const btnRef          = useRef(null)
  const menuRef         = useRef(null)

  const label = value === 'all' ? 'All' : value

  useEffect(() => {
    function handler(e) {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target))
        setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleToggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const menuWidth   = 180
      const PADDING     = 8
      const MAX_HEIGHT  = 320

      const left = r.left + menuWidth > window.innerWidth
        ? Math.max(4, r.right - menuWidth)
        : r.left

      const spaceBelow  = window.innerHeight - r.bottom - PADDING
      const maxHeight   = Math.min(MAX_HEIGHT, Math.max(80, spaceBelow))

      setPos({ top: r.bottom + 4, left, maxHeight })
    }
    setOpen(v => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
          value !== 'all'
            ? 'bg-violet-500/15 border border-violet-500/30 text-violet-400'
            : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/70 hover:bg-white/8'
        }`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
        </svg>
        <span>{label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          className="rounded-xl overflow-hidden"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            minWidth: 180,
            maxHeight: pos.maxHeight || 320,
            overflowY: 'auto',
            background: 'rgba(16,16,16,0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
            scrollbarColor: 'rgba(255,255,255,0.10) transparent',
          }}
        >
          <div className="py-1">
            {}
            <button
              type="button"
              onClick={() => { onChange('all'); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-all"
              style={{
                background: value === 'all' ? 'rgba(167,139,250,0.1)' : 'transparent',
                color: value === 'all' ? '#a78bfa' : 'rgba(255,255,255,0.65)',
              }}
              onMouseEnter={e => { if (value !== 'all') e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (value !== 'all') e.currentTarget.style.background = 'transparent' }}
            >
              <span className="w-2 h-2 rounded-full bg-white/30 flex-shrink-0" />
              <span className="text-white/60">All versions</span>
              {value === 'all' && <svg className="w-3 h-3 ml-auto text-violet-400" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
            </button>

            {}
            <div className="h-px bg-white/5 mx-2 my-1" />

            {}
            {groups.map(group => (
              <button
                key={group.key}
                type="button"
                onClick={() => { onChange(group.key); setOpen(false) }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-all"
                style={{
                  background: value === group.key ? 'rgba(167,139,250,0.1)' : 'transparent',
                  color: value === group.key ? '#a78bfa' : 'rgba(255,255,255,0.65)',
                }}
                onMouseEnter={e => { if (value !== group.key) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (value !== group.key) e.currentTarget.style.background = 'transparent' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400/60 flex-shrink-0" />
                  <span className="font-semibold">{group.key}.x</span>
                </div>
                <span className="text-[10px] text-white/30 flex-shrink-0">{group.count}</span>
                {value === group.key && <svg className="w-3 h-3 text-violet-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default function TechnicFilters({ filters, onChange }) {
  const [allVersions, setAllVersions]     = useState([])
  const [versionGroup, setVersionGroup]   = useState('all')
  const [versionSearch, setVersionSearch] = useState('')
  const [showVersions, setShowVersions]   = useState(true)

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.modrinthGetGameVersions()
      .then(v => setAllVersions(v || []))
      .catch(() => {})
  }, [])

  const versionGroups = useMemo(() => {
    const groupMap = new Map()
    allVersions.forEach(item => {
      const v = item.version || item
      const t = item.version_type || item.type || 'release'

      if (t !== 'release' || v.includes('-rc') || v.includes('-pre') || v.match(/w\d+[a-z]?/i)) return

      const match = v.match(/^(\d+\.\d+)/)
      if (!match) return
      const key = match[1]
      groupMap.set(key, (groupMap.get(key) || 0) + 1)
    })
    return Array.from(groupMap.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => {
        const [aMaj, aMin] = a.key.split('.').map(Number)
        const [bMaj, bMin] = b.key.split('.').map(Number)
        return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin
      })
  }, [allVersions])

  function toggleLoader(loader) {
    const cur = filters.loaders || []
    onChange({ loaders: cur.includes(loader) ? cur.filter(l => l !== loader) : [...cur, loader] })
  }

  function toggleVersion(v) {
    const cur = filters.gameVersions || []
    onChange({ gameVersions: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] })
  }

  const filteredVersions = allVersions.filter(item => {
    const vStr = item.version || item
    const type = item.version_type || item.type || 'release'

    if (type !== 'release' || vStr.includes('-rc') || vStr.includes('-pre') || vStr.match(/w\d+[a-z]?/i)) {
      return false
    }

    const matchSearch = !versionSearch || vStr.toLowerCase().includes(versionSearch.toLowerCase())
    if (!matchSearch) return false
    if (versionGroup === 'all') return true

    return vStr === versionGroup || vStr.startsWith(versionGroup + '.')
  })

  const selectedVersions = filters.gameVersions || []
  const selectedLoaders  = filters.loaders || []

  return (
    <div className="flex flex-col h-full overflow-y-auto"
      style={{ scrollbarColor: 'rgba(255,255,255,0.10) transparent' }}>

      {}
      <div className="flex border-b border-white/5">
        {}
        <div className="flex-1 border-r border-white/5 px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Loaders</p>
            {selectedLoaders.length > 0 && (
              <button onClick={() => onChange({ loaders: [] })} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">✕</button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {LOADER_OPTIONS.map(opt => (
              <CheckItem key={opt.value} label={opt.label} color={opt.color}
                checked={selectedLoaders.includes(opt.value)} onChange={() => toggleLoader(opt.value)} />
            ))}
          </div>
        </div>

        {}
        <div className="flex-1 px-3 py-3">
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">Sort</p>
          <div className="flex flex-col gap-0.5">
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => onChange({ sortBy: opt.value })}
                className={`text-left text-sm px-2 py-1 rounded-lg transition-all ${
                  filters.sortBy === opt.value
                    ? 'bg-violet-500/15 text-violet-400 font-semibold'
                    : 'text-white/45 hover:text-white/75 hover:bg-white/5'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {}
      <div className="flex flex-col flex-1 min-h-0 px-3 py-3">
        {}
        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
          <button onClick={() => setShowVersions(v => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-white/60 uppercase tracking-widest hover:text-white/80 transition-colors">
            Game Version
            <svg className={`w-3 h-3 transition-transform ${showVersions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <VersionGroupDropdown
              value={versionGroup}
              onChange={setVersionGroup}
              groups={versionGroups}
            />
            {selectedVersions.length > 0 && (
              <button onClick={() => onChange({ gameVersions: [] })}
                className="flex items-center gap-1 text-[11px] text-red-400/70 hover:text-red-400 transition-colors px-1.5 py-1 rounded-lg hover:bg-red-500/8">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
                {selectedVersions.length}
              </button>
            )}
          </div>
        </div>

        {showVersions && (
          <>
            {}
            <div className="relative mb-2 flex-shrink-0">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
              </svg>
              <input type="text" value={versionSearch} onChange={e => setVersionSearch(e.target.value)}
                placeholder="Search versions..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40" />
            </div>

            {}
            <div className="flex flex-col gap-0.5 overflow-y-auto flex-1"
              style={{ scrollbarColor: 'rgba(255,255,255,0.10) transparent' }}>
              {filteredVersions.length === 0 && (
                <p className="text-white/20 text-sm py-3 text-center">
                  {allVersions.length === 0 ? 'Loading...' : 'No match'}
                </p>
              )}
              {filteredVersions.map(item => {
                const vStr = item.version || item
                return (
                  <CheckItem key={vStr} label={vStr}
                    checked={selectedVersions.includes(vStr)}
                    onChange={() => toggleVersion(vStr)} />
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

