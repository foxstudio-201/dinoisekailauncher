import { useState, useEffect } from 'react'
import { renderMarkdown } from '../../utils/renderMarkdown'

export const LOADER_COLORS = {
  fabric: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  forge: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  neoforge: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  quilt: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  vanilla: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
}

export const VERSION_TYPE_STYLE = {
  release: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  beta: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  alpha: 'bg-red-500/15 text-red-400 border-red-500/25',
}

export const DETAIL_SUB_TABS = [
  { id: 'description', label: 'Description' },
  { id: 'versions', label: 'Versions' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'comments', label: 'Comments' },
]

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

export function ContentDetailPanel({
  item,
  profile,
  contentType,
  versions,
  detailTab,
  setDetailTab,
  lightboxIdx,
  setLightboxIdx,
  installing,
  handleDownload,
  installProgress,
  installError,
  installDone,
  installedInfo,
  latestOf,
  hasUpdate,
  onBack,
  loading,
}) {
  const isMod = contentType === 'mod'
  const [iconFailed, setIconFailed] = useState(false)
  useEffect(() => { setIconFailed(false) }, [item?.icon_url])
  const galleryItems = (item?.gallery || []).map(g =>
    typeof g === 'string' ? { url: g, title: '' } : g
  )

  const filteredVersions = isMod
    ? versions.filter(v => {
        const matchLoader = (v.loaders || []).includes(profile.loader)
        const matchGameVer = (v.game_versions || []).includes(profile.gameVersion)
        return matchLoader && matchGameVer
      })
    : versions

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/15"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <p className="text-xs text-white/25">Select an item to view details</p>
      </div>
    )
  }

  const inst = installedInfo(item)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col h-full overflow-hidden min-h-0">
        <div className="flex-shrink-0">
          {onBack && (
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors mb-3">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
              Back to results
            </button>
          )}

          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
              {item.icon_url && !iconFailed
                ? <img src={item.icon_url} alt="" className="w-full h-full object-cover" onError={() => setIconFailed(true)} />
                : <svg className="w-6 h-6 text-white/20" fill="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              }
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm leading-tight truncate">{item.title || item.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-white/40 text-[10px]">by <span className="text-white/60">{item.author || item.team || ''}</span></p>
                {inst && (
                  <>
                    {hasUpdate(item)
                      ? <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold border bg-yellow-500/15 text-yellow-300 border-yellow-500/25">Update available</span>
                      : <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold border bg-green-500/15 text-green-300 border-green-500/25">Ready to use</span>
                    }
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2 text-[10px]">
            <span className="flex items-center gap-1 text-violet-400/80">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              <span className="font-semibold">{formatNum(item.downloads)}</span>
              <span className="text-white/30">downloads</span>
            </span>
            <span className="flex items-center gap-1 text-pink-400/70">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              <span className="font-semibold">{formatNum(item.follows || item.followers)}</span>
              <span className="text-white/30">follows</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {(item.loaders || []).map(l => (
              <span key={l} className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize border ${LOADER_COLORS[l] || 'bg-white/8 text-white/50 border-white/10'}`}>{l}</span>
            ))}
            {(item.game_versions || []).slice(0, 3).map(v => (
              <span key={v} className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/8 text-violet-400/60 border border-violet-500/15">{v}</span>
            ))}
          </div>

          <div className="flex gap-0 border-b border-white/5">
            {DETAIL_SUB_TABS.map(tab => (
              <button key={tab.id} onClick={() => setDetailTab(tab.id)}
                className={`px-2.5 py-1.5 text-[9px] font-semibold border-b-2 transition-all -mb-px ${
                  detailTab === tab.id
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-white/30 hover:text-white/60'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-2 text-xs min-h-0" style={{ scrollbarColor: 'rgba(255,255,255,0.10) transparent' }}>
          {detailTab === 'description' && (
            item.body ? (
              <div className="md-content text-white/70" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.body) }} />
            ) : (
              <p className="text-white/25 text-xs text-center py-8">Full description unavailable</p>
            )
          )}

          {detailTab === 'versions' && (
            <div className="flex flex-col gap-2">
              {filteredVersions.length === 0 && (
                <p className="text-white/25 text-xs py-4 text-center">
                  {isMod ? `No versions match profile's loader (${profile.loader}) and game version (${profile.gameVersion})` : 'No versions found'}
                </p>
              )}
              {filteredVersions.map(v => {
                const inst = installedInfo(item)
                const isInstalledVer = inst && (
                  inst.versionId
                    ? String(v.id) === String(inst.versionId)
                    : (v.files || []).some(f => f.filename === inst.filename)
                )
                const latest = latestOf(item)
                const isLatestVer = latest && String(v.id) === String(latest.id)
                const showUpdate = !isInstalledVer && isLatestVer && hasUpdate(item)
                return (
                <div key={v.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white text-xs font-semibold">{v.version_number}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${VERSION_TYPE_STYLE[v.version_type] || ''}`}>{v.version_type}</span>
                      {isInstalledVer && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold border bg-green-500/15 text-green-300 border-green-500/25">Installed</span>
                      )}
                      {showUpdate && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold border bg-yellow-500/15 text-yellow-300 border-yellow-500/25">Update</span>
                      )}
                      {(v.loaders || []).map(l => (
                        <span key={l} className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize border ${LOADER_COLORS[l] || 'bg-white/8 text-white/40 border-white/10'}`}>{l}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-white/30 mt-0.5">
                      <span>{v.game_versions?.slice(0, 3).join(', ')}</span>
                      <span>·</span>
                      <span>{formatDate(v.date_published)}</span>
                    </div>
                  </div>
                  {isInstalledVer ? (
                    <span className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold text-green-300 bg-green-500/15 border border-green-500/25 flex items-center gap-1" title="Ready to use">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      Ready to use
                    </span>
                  ) : (
                    <button onClick={() => handleDownload(v)} disabled={installing}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-50 flex items-center gap-1"
                      style={{ background: showUpdate ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>
                      {installing ? '...' : showUpdate ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M11 5v11.17l-4.88-4.88-1.42 1.41L12 19.71l7.3-7.01-1.42-1.41L13 16.17V5h-2zM5 21h14v-2H5v2z"/></svg>
                          Update
                        </>
                      ) : 'Download'}
                    </button>
                  )}
                </div>
                )
              })}
            </div>
          )}

          {detailTab === 'gallery' && (
            <div>
              {galleryItems.length === 0 ? (
                <p className="text-white/25 text-xs text-center py-8">No gallery images</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {galleryItems.map((img, i) => (
                      <div key={i} onClick={() => setLightboxIdx(i)}
                        className="rounded-xl overflow-hidden aspect-video bg-white/5 cursor-pointer hover:ring-2 hover:ring-violet-500/40 transition-all">
                        <img src={img.url} alt={img.title || ''} className="w-full h-full object-cover" loading="lazy"
                          onError={e => { e.currentTarget.src = ''; e.currentTarget.className = 'w-full h-full flex items-center justify-center text-white/20 text-[10px]' }} />
                      </div>
                    ))}
                  </div>

                  {lightboxIdx >= 0 && (
                    <div className="fixed inset-0 z-[400] bg-black/85 backdrop-blur-sm flex items-center justify-center"
                      onClick={() => setLightboxIdx(-1)}>
                      <div className="relative max-w-4xl max-h-[85vh] w-full mx-4 flex flex-col items-center gap-3"
                        onClick={e => e.stopPropagation()}>
                        <div className="relative w-full aspect-video max-h-[70vh] flex items-center justify-center">
                          <button onClick={() => setLightboxIdx(i => i > 0 ? i - 1 : galleryItems.length - 1)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                          </button>
                          <img src={galleryItems[lightboxIdx]?.url}
                            alt={galleryItems[lightboxIdx]?.title || ''}
                            className="max-w-full max-h-full rounded-xl object-contain"
                            onError={e => { e.currentTarget.src = ''; e.currentTarget.alt = 'Failed to load' }} />
                          <button onClick={() => setLightboxIdx(i => i < galleryItems.length - 1 ? i + 1 : 0)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
                          </button>
                          <button onClick={() => setLightboxIdx(-1)}
                            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full" style={{ scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
                          {galleryItems.map((img, i) => (
                            <div key={i} onClick={() => setLightboxIdx(i)}
                              className={`flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden cursor-pointer transition-all ${i === lightboxIdx ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-black/85' : 'opacity-50 hover:opacity-80'}`}>
                              <img src={img.url} alt={img.title || ''} className="w-full h-full object-cover"
                                onError={e => { e.currentTarget.style.display = 'none' }} />
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-white/40">{lightboxIdx + 1} / {galleryItems.length}{galleryItems[lightboxIdx]?.title ? ` · ${galleryItems[lightboxIdx].title}` : ''}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {detailTab === 'comments' && (
            <p className="text-white/25 text-xs text-center py-8">Comments are not available in the browser</p>
          )}

          {installProgress && (
            <div className="rounded-xl p-3 bg-white/3 border border-white/8">
              <p className="text-[10px] text-white/50">{installProgress.log}</p>
            </div>
          )}
          {installError && (
            <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20">
              <p className="text-[10px] text-red-400">{installError}</p>
            </div>
          )}
          {installDone && (
            <div className="rounded-xl p-3 bg-violet-500/10 border border-violet-500/20 flex items-center gap-2">
              <svg className="w-3 h-3 text-violet-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              <p className="text-[10px] text-violet-400 font-semibold">Installed successfully!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
