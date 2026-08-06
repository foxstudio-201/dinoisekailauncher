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

import { useState, useMemo } from 'react'
import { DownloadSimple, Heart, CalendarBlank, ArrowLeft, ArrowSquareOut } from '@phosphor-icons/react'
import { useTechnicProject, useTechnicVersions } from './useTechnic'
import InstallModal from '../shared/InstallModal'
import { useModpackInstall } from '../shared/ModpackInstallContext'

function SplashLogoInline({ size = 64, label }) {
  const s = size / 4.5
  const d1 = size * 0.14
  const d2 = size * 0.30
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-violet-500/15 rounded-full blur-2xl" style={{ width: size * 0.8, height: size * 0.8, animation: 'md-logo-glow 3s ease-in-out infinite' }} />
        </div>
        {}
        <div className="absolute rounded-lg" style={{ width: s, height: s, background: '#a78bfa', boxShadow: '0 0 10px #a78bfa99', animation: 'md-logo-tl 3s ease-in-out 0s infinite' }} />
        <div className="absolute rounded-lg" style={{ width: s, height: s, background: '#8b5cf6', boxShadow: '0 0 10px #8b5cf699', animation: 'md-logo-tr 3s ease-in-out 0.06s infinite' }} />
        <div className="absolute rounded-lg" style={{ width: s, height: s, background: '#7c3aed', boxShadow: '0 0 10px #7c3aed99', animation: 'md-logo-bl 3s ease-in-out 0.12s infinite' }} />
        <div className="absolute rounded-lg" style={{ width: s, height: s, background: '#a78bfa', boxShadow: '0 0 10px #a78bfa99', animation: 'md-logo-br 3s ease-in-out 0.18s infinite' }} />
      </div>
      {label && <p className="text-[11px] text-white/30 font-medium">{label}</p>}
      <style>{`
        @keyframes md-logo-tl {
          0%,100% { transform: translate(-${d1}px,-${d1}px) rotate(0deg)   scale(1);   opacity:.9; }
          15%     { transform: translate(-${d2}px,-${d2}px) rotate(0deg)   scale(1.1); opacity:1;  }
          50%     { transform: translate(-${d2}px,-${d2}px) rotate(360deg) scale(1.1); opacity:1;  }
          65%     { transform: translate(-${d1}px,-${d1}px) rotate(360deg) scale(1);   opacity:.9; }
        }
        @keyframes md-logo-tr {
          0%,100% { transform: translate( ${d1}px,-${d1}px) rotate(0deg)   scale(1);   opacity:.9; }
          15%     { transform: translate( ${d2}px,-${d2}px) rotate(0deg)   scale(1.1); opacity:1;  }
          50%     { transform: translate( ${d2}px,-${d2}px) rotate(360deg) scale(1.1); opacity:1;  }
          65%     { transform: translate( ${d1}px,-${d1}px) rotate(360deg) scale(1);   opacity:.9; }
        }
        @keyframes md-logo-bl {
          0%,100% { transform: translate(-${d1}px, ${d1}px) rotate(0deg)   scale(1);   opacity:.9; }
          15%     { transform: translate(-${d2}px, ${d2}px) rotate(0deg)   scale(1.1); opacity:1;  }
          50%     { transform: translate(-${d2}px, ${d2}px) rotate(360deg) scale(1.1); opacity:1;  }
          65%     { transform: translate(-${d1}px, ${d1}px) rotate(360deg) scale(1);   opacity:.9; }
        }
        @keyframes md-logo-br {
          0%,100% { transform: translate( ${d1}px, ${d1}px) rotate(0deg)   scale(1);   opacity:.9; }
          15%     { transform: translate( ${d2}px, ${d2}px) rotate(0deg)   scale(1.1); opacity:1;  }
          50%     { transform: translate( ${d2}px, ${d2}px) rotate(360deg) scale(1.1); opacity:1;  }
          65%     { transform: translate( ${d1}px, ${d1}px) rotate(360deg) scale(1);   opacity:.9; }
        }
        @keyframes md-logo-glow {
          0%,100% { opacity:0.2; transform:scale(1);   }
          15%     { opacity:0.6; transform:scale(1.5); }
          50%     { opacity:0.6; transform:scale(1.5); }
          65%     { opacity:0.2; transform:scale(1);   }
        }
      `}</style>
    </div>
  )
}

const isElectron = typeof window !== 'undefined' && window.electronAPI

const DETAIL_TABS = [
  { id: 'description', label: 'Description' },
  { id: 'versions', label: 'Versions' },
  { id: 'gallery', label: 'Gallery' },
]

const LOADER_COLORS = {
  fabric: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  forge: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  neoforge: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  quilt: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  vanilla: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
}

const VERSION_TYPE_STYLE = {
  release: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  beta: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  alpha: 'bg-red-500/15 text-red-400 border-red-500/25',
}

function formatNum(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function FilterPill({ label, active, onClick, colorClass }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all capitalize ${active
          ? (colorClass || 'bg-violet-500/15 text-violet-400 border-violet-500/30')
          : 'bg-white/5 text-white/40 border-white/10 hover:text-white/65 hover:bg-white/8'
        }`}
    >
      {label}
    </button>
  )
}

export default function TechnicDetail({ projectId, projectType, activeLoaders = [], activeGameVersions = [], onBack }) {
  const { project, loading, error } = useTechnicProject(projectId)
  const { versions, loading: vLoading } = useTechnicVersions(projectId)

  const [activeTab, setActiveTab] = useState('versions')
  const [selectedVersion, setVersion] = useState(null)
  const [showInstall, setShowInstall] = useState(false)
  const { openModpackInstall } = useModpackInstall()

  const [filterLoader, setFilterLoader] = useState(() => activeLoaders[0] || 'all')

  const [filterGameVer, setFilterGameVer] = useState(() => activeGameVersions[0] || 'all')
  const [filterType, setFilterType] = useState('all')

  const availableLoaders = useMemo(() => {
    const set = new Set()
    versions.forEach(v => (v.loaders || []).forEach(l => set.add(l)))
    return Array.from(set).filter(l => ['fabric', 'forge', 'neoforge', 'quilt', 'vanilla'].includes(l))
  }, [versions])

  const availableTypes = useMemo(() => {
    const set = new Set()
    versions.forEach(v => { if (v.version_type) set.add(v.version_type) })
    return Array.from(set)
  }, [versions])

  const availableGameVersions = useMemo(() => {
    const set = new Set()
    versions.forEach(v => (v.game_versions || []).forEach(gv => set.add(gv)))

    return Array.from(set).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  }, [versions])

  const filteredVersions = useMemo(() => {
    return versions.filter(v => {
      const matchLoader = filterLoader === 'all' || (v.loaders || []).includes(filterLoader)
      const matchType = filterType === 'all' || v.version_type === filterType
      const matchGameVer = filterGameVer === 'all' || (v.game_versions || []).includes(filterGameVer)
      return matchLoader && matchType && matchGameVer
    })
  }, [versions, filterLoader, filterType, filterGameVer])

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <SplashLogoInline size={72} label="Đang tải..." />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <p className="text-red-400/70 text-sm">{error || 'Project not found'}</p>
        <button onClick={onBack} className="text-xs text-white/40 hover:text-white transition-colors">← Back</button>
      </div>
    )
  }

  const loaders = project.loaders || []
  const gameVersions = project.game_versions || []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {}
      <div className="flex-shrink-0 px-4 pt-3 pb-0">

        {}
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors mb-3">
          <ArrowLeft size={14} weight="duotone" />
          Back to results
        </button>

        {}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
            {project.icon_url
              ? <img src={project.icon_url} alt="" className="w-full h-full object-cover" />
              : <svg className="w-8 h-8 text-white/20" fill="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-white font-bold text-base leading-tight">{project.title}</h2>
                <p className="text-white/40 text-xs mt-0.5">by <span className="text-white/60">{project.team}</span></p>
              </div>
              {isElectron && project.source_url && (
                <button onClick={() => window.electronAPI.openExternal(project.source_url)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-white/25 hover:text-white transition-all hover:bg-white/5"
                  title="Open on Technic">
                  <ArrowSquareOut size={14} weight="duotone" />
                </button>
              )}
            </div>
            <p className="text-white/45 text-xs leading-relaxed line-clamp-2 mt-1.5">{project.description}</p>
          </div>
        </div>

        {}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <span className="flex items-center gap-1.5 text-violet-400/80">
            <DownloadSimple size={15} weight="duotone" />
            <span className="font-semibold">{formatNum(project.downloads)}</span>
            <span className="text-white/30 text-xs font-normal">downloads</span>
          </span>
          <span className="flex items-center gap-1.5 text-pink-400/70">
            <Heart size={15} weight="duotone" />
            <span className="font-semibold">{formatNum(project.followers)}</span>
            <span className="text-white/30 text-xs font-normal">follows</span>
          </span>
          <span className="flex items-center gap-1.5 text-white/35 text-xs ml-auto">
            <CalendarBlank size={13} weight="duotone" />
            {formatDate(project.updated)}
          </span>
        </div>

        {}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {}
          <div className="flex flex-wrap items-center gap-1">
            {loaders.map(l => (
              <span key={l} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border ${LOADER_COLORS[l] || 'bg-white/8 text-white/50 border-white/10'}`}>
                {l}
              </span>
            ))}
            {gameVersions.slice(0, 3).map(v => (
              <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/8 text-violet-400/60 border border-violet-500/15">{v}</span>
            ))}
            {gameVersions.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/25 border border-white/8">+{gameVersions.length - 3} more</span>
            )}
          </div>

          {}
          {(availableLoaders.length > 1 || availableTypes.length > 1 || availableGameVersions.length > 1) && (
            <div className="flex flex-wrap items-center gap-1.5">

              {}
              {availableLoaders.length > 1 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-[9px] text-white/30 uppercase tracking-widest mr-1">Loader</span>
                  <FilterPill label="All" active={filterLoader === 'all'} onClick={() => setFilterLoader('all')} />
                  {availableLoaders.map(l => (
                    <FilterPill key={l} label={l} active={filterLoader === l}
                      onClick={() => setFilterLoader(l)} colorClass={LOADER_COLORS[l]} />
                  ))}
                </div>
              )}

              {}
              {availableTypes.length > 1 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-[9px] text-white/30 uppercase tracking-widest mr-1">Type</span>
                  <FilterPill label="All" active={filterType === 'all'} onClick={() => setFilterType('all')} />
                  {availableTypes.map(t => (
                    <FilterPill key={t} label={t} active={filterType === t}
                      onClick={() => setFilterType(filterType === t ? 'all' : t)}
                      colorClass={VERSION_TYPE_STYLE[t]} />
                  ))}
                </div>
              )}

              {}
              {availableGameVersions.length > 1 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-[9px] text-white/30 uppercase tracking-widest mr-1">MC</span>
                  <select
                    value={filterGameVer}
                    onChange={e => setFilterGameVer(e.target.value)}
                    className="bg-transparent text-[10px] text-white/65 focus:outline-none cursor-pointer"
                    style={{ appearance: 'none' }}
                  >
                    <option value="all" style={{ background: '#1a1a1a' }}>All</option>
                    {availableGameVersions.slice(0, 40).map(v => (
                      <option key={v} value={v} style={{ background: '#1a1a1a' }}>{v}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {}
        <div className="flex gap-0 border-b border-white/5 mt-2">
          {DETAIL_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all -mb-px ${activeTab === tab.id
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-white/30 hover:text-white/60'
                }`}>
              {tab.label}
              {tab.id === 'versions' && versions.length > 0 && (
                <span className="ml-1.5 text-[10px] text-white/25">({filteredVersions.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto px-4 py-3"
        style={{ scrollbarColor: 'rgba(255,255,255,0.10) transparent' }}>

        {}
        {activeTab === 'description' && (() => {
          const feed = project.feed || []
          return (
            <div className="flex flex-col gap-4">
              {}
              {project.background_url && (
                <div className="rounded-xl overflow-hidden w-full" style={{ aspectRatio: '16/5' }}>
                  <img
                    src={project.background_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
                  />
                </div>
              )}

              {}
              {project.description && (
                <div className="px-4 py-3 rounded-xl text-sm text-white/70 leading-relaxed italic"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  "{project.description}"
                </div>
              )}

              {}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {project.author && (
                  <div className="px-3 py-2.5 rounded-xl flex flex-col gap-0.5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="text-white/30 uppercase tracking-widest text-[9px]">Author</span>
                    <span className="text-white/80 font-semibold">{project.author}</span>
                  </div>
                )}
                {project.game_versions?.[0] && (
                  <div className="px-3 py-2.5 rounded-xl flex flex-col gap-0.5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="text-white/30 uppercase tracking-widest text-[9px]">Minecraft</span>
                    <span className="text-white/80 font-semibold">{project.game_versions[0]}</span>
                  </div>
                )}
                <div className="px-3 py-2.5 rounded-xl flex flex-col gap-0.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-white/30 uppercase tracking-widest text-[9px]">Installs</span>
                  <span className="text-violet-400 font-semibold">{formatNum(project.downloads)}</span>
                </div>
                <div className="px-3 py-2.5 rounded-xl flex flex-col gap-0.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-white/30 uppercase tracking-widest text-[9px]">Runs</span>
                  <span className="text-pink-400 font-semibold">{formatNum(project.followers)}</span>
                </div>
              </div>

              {}
              {feed.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Changelog</p>
                  <div className="flex flex-col gap-2">
                    {feed.map((entry, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {entry.avatar && (
                          <img src={entry.avatar} alt="" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 bg-white/5"
                            onError={e => { e.currentTarget.style.display = 'none' }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white/60 text-xs font-semibold">{entry.user}</span>
                            <span className="text-white/25 text-[10px]">{formatDate(entry.date)}</span>
                          </div>
                          <p className="text-white/50 text-xs leading-relaxed">{entry.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {}
              {!project.description && feed.length === 0 && (
                <p className="text-white/25 text-xs text-center py-8">No description available</p>
              )}
            </div>
          )
        })()}

        {}
        {activeTab === 'versions' && (
          <div className="flex flex-col gap-3">
            {}
            {vLoading && (
              <div className="flex items-center justify-center py-10">
                <SplashLogoInline size={56} label="Đang tải phiên bản..." />
              </div>
            )}
            {!vLoading && filteredVersions.length === 0 && (
              <p className="text-white/25 text-xs py-4 text-center">No versions match the current filters</p>
            )}
            {filteredVersions.map(v => (
              <div key={v.id}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.2)'; e.currentTarget.style.background = 'rgba(167,139,250,0.03)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white text-sm font-semibold">{v.version_number}</span>
                    {}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${VERSION_TYPE_STYLE[v.version_type] || 'bg-white/8 text-white/40 border-white/10'}`}>
                      {v.version_type}
                    </span>
                    {}
                    {(v.loaders || []).map(l => (
                      <span key={l} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border ${LOADER_COLORS[l] || 'bg-white/8 text-white/40 border-white/10'}`}>
                        {l}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/30 flex-wrap">
                    <span>{v.game_versions?.slice(0, 3).join(', ')}</span>
                    <span>·</span>
                    <span>{formatDate(v.date_published)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <DownloadSimple size={10} weight="duotone" className="text-violet-400/50" />
                      {formatNum(v.downloads)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setVersion(v)
                    if (projectType === 'modpack') openModpackInstall({ project, version: v, source: 'technic' })
                    else setShowInstall(true)
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', boxShadow: '0 2px 12px rgba(167,139,250,0.2)' }}
                >
                  <DownloadSimple size={13} weight="duotone" />
                  Install
                </button>
              </div>
            ))}
          </div>
        )}

        {}
        {activeTab === 'gallery' && (
          <div>
            {(!project.gallery || project.gallery.length === 0) ? (
              <p className="text-white/25 text-xs text-center py-8">No gallery images</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {project.gallery.map((img, i) => (
                  <div key={i} className="rounded-xl overflow-hidden aspect-video bg-white/5">
                    <img src={img.url} alt={img.title || ''} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {}
      {showInstall && selectedVersion && projectType !== 'modpack' && (
        <InstallModal
          project={project}
          versions={[selectedVersion, ...versions.filter(v => v.id !== selectedVersion.id)]}
          projectType={projectType}
          source="technic"
          onClose={() => { setShowInstall(false); setVersion(null) }}
        />
      )}
    </div>
  )
}
