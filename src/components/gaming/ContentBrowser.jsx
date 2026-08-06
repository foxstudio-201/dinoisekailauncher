import { useState, useEffect, useRef } from 'react'
import { ContentDetailPanel, LOADER_COLORS, VERSION_TYPE_STYLE } from './ContentDetailPanel'

const isElectron = typeof window !== 'undefined' && window.electronAPI
const LIMIT = 30

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

export function ContentBrowser({ profile, contentType, platform, onBack }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState(null)
  const [versions, setVersions] = useState({})
  const offsetRef = useRef(0)
  const [hasMore, setHasMore] = useState(false)
  const searchTimer = useRef(null)
  const [detailTab, setDetailTab] = useState('description')
  const [installing, setInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState(null)
  const [installError, setInstallError] = useState(null)
  const [installDone, setInstallDone] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(-1)
  const [detailLoading, setDetailLoading] = useState(false)
  const [installed, setInstalled] = useState({})
  const [installedFiles, setInstalledFiles] = useState({})
  const versionsPendingRef = useRef({})
  const [downloading, setDownloading] = useState(null)
  const [downloadError, setDownloadError] = useState(null)

  const typeLabel = contentType === 'resourcepack' ? 'resourcepack' : contentType

  const selectedItem = selected ? (results.find(r => r.project_id === selected.project_id) || selected) : null
  const selectedVers = selectedItem ? (versions[selectedItem.cfId || selectedItem.project_id] || []) : []

  function versionKeyOf(item) {
    return item.cfId || item.project_id
  }

  const galleryItems = (selectedItem?.gallery || []).map(g =>
    typeof g === 'string' ? { url: g, title: '' } : g
  )

  const isMod = contentType === 'mod'

  const filteredVersions = isMod
    ? selectedVers.filter(v => {
        const matchLoader = (v.loaders || []).includes(profile.loader)
        const matchGameVer = (v.game_versions || []).includes(profile.gameVersion)
        return matchLoader && matchGameVer
      })
    : selectedVers

  function versionFilters() {
    if (!isMod) return {}
    return {
      gameVersions: [profile.gameVersion],
      loaders: profile.loader !== 'vanilla' ? [profile.loader] : [],
    }
  }

  function slugFromFileName(fileName) {
    return fileName
      .replace(/\.(jar|zip)$/i, '')
      .replace(/\.(off|disabled)$/i, '')
      .replace(/[-_+](v?\d[\d._\-+]*).*$/i, '')
      .replace(/[-_+][rv]\d.*$/i, '')
      .replace(/[-_]/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/ /g, '-')
  }

  function installedInfo(item) {
    const direct = installed[item.project_id]
    if (direct) return direct
    if (!item.slug) return null
    const list = installedFiles[contentType] || []
    const slug = item.slug.toLowerCase()
    for (const f of list) {
      if (slugFromFileName(f) === slug) {
        return { type: contentType, filename: f, versionId: null, slugMatched: true }
      }
    }
    return null
  }

  function latestOf(pid) {
    const vers = versions[pid] || []
    return vers.find(v => v.version_type === 'release') || vers[0] || null
  }

  function hasUpdate(item) {
    const inst = installedInfo(item)
    if (!inst) return false
    const latest = latestOf(versionKeyOf(item))
    if (!latest) return false
    let instVersionId = inst.versionId
    if (!instVersionId) {
      const matchedVer = (versions[versionKeyOf(item)] || []).find(v => (v.files || []).some(f => f.filename === inst.filename))
      instVersionId = matchedVer ? matchedVer.id : null
    }
    if (!instVersionId) return false
    return String(latest.id) !== String(instVersionId)
  }

  async function refreshInstalled() {
    if (!isElectron) return
    try {
      const res = await window.electronAPI.profileGetInstalledContent(profile.id)
      if (res?.ok) {
        setInstalled(res.installed || {})
        setInstalledFiles(res.files || {})
      }
    } catch {}
    try {
      const res = await window.electronAPI.profileMatchInstalledContent(profile.id)
      if (res?.ok) {
        const matched = res.matchedFiles || {}
        const merged = {}
        for (const [baseName, info] of Object.entries(matched)) {
          if (!merged[info.projectId]) {
            merged[info.projectId] = { ...info, filename: baseName }
          }
        }
        setInstalled(prev => ({ ...prev, ...merged }))
      }
    } catch {}
  }

  // Versions always come from the platform the user selected — no fallback
  // to the other platform. Returns the fetched list so callers never read
  // stale `versions` state right after an await.
  async function loadVersions(item) {
    if (!isElectron) return []
    const key = versionKeyOf(item)
    if (versionsPendingRef.current[key]) return versionsPendingRef.current[key]
    if (versions[key]) return versions[key]
    const p = (async () => {
      try {
        const filters = versionFilters()
        const data = platform === 'curseforge'
          ? await window.electronAPI.curseforgeGetVersions(item.project_id, filters).catch(() => null)
          : await window.electronAPI.modrinthGetVersions(item.project_id, filters).catch(() => null)
        const arr = Array.isArray(data) ? data.map(v => ({ ...v, source: platform })) : []
        setVersions(prev => ({ ...prev, [key]: arr }))
        return arr
      } catch {
        return []
      } finally {
        setTimeout(() => { delete versionsPendingRef.current[key] }, 0)
      }
    })()
    versionsPendingRef.current[key] = p
    return p
  }

  async function ensureVersions(item) {
    await loadVersions(item)
  }

  useEffect(() => {
    if (!downloadError) return
    const timer = setTimeout(() => setDownloadError(null), 5000)
    return () => clearTimeout(timer)
  }, [downloadError])

  useEffect(() => { refreshInstalled() }, [profile.id])

  async function search(pageOffset = 0, append = false) {
    if (!isElectron) return
    setLoading(true)
    try {
      const filters = {
        query: query,
        projectType: typeLabel,
        gameVersions: isMod ? [profile.gameVersion] : [],
        loaders: isMod && profile.loader !== 'vanilla' ? [profile.loader] : [],
        sortBy: 'downloads',
        limit: LIMIT,
        offset: pageOffset,
      }

      let data
      if (platform === 'curseforge') {
        data = await window.electronAPI.curseforgeSearch(filters)
      } else {
        data = await window.electronAPI.modrinthSearch(filters)
      }

      if (data?.error) return

      const hits = data.hits || []
      if (append) {
        const existing = new Set(results.map(r => r.project_id))
        const newHits = hits.filter(h => !existing.has(h.project_id))
        setResults(prev => [...prev, ...newHits])
      } else {
        setResults(hits)
      }
      setTotal(data.total_hits || 0)
      offsetRef.current = pageOffset + hits.length
      setHasMore(offsetRef.current < (data.total_hits || 0))
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      offsetRef.current = 0
      setResults([])
      setSelected(null)
      search(0, false)
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [query, profile.gameVersion, profile.loader, platform, contentType])

  async function loadMore() {
    await search(offsetRef.current, true)
  }

  async function handleSelect(item) {
    setDetailTab('description')
    setDetailLoading(true)
    const cfId = platform === 'curseforge' ? item.project_id : null
    try {
      let full = null
      if (platform === 'curseforge') {
        full = await window.electronAPI.curseforgeGetProject(item.project_id).catch(() => null)
      } else {
        full = await window.electronAPI.modrinthGetProject(item.project_id).catch(() => null)
      }
      if (full && !full?.error) {
        const merged = { ...item, ...full, project_id: item.project_id, cfId }
        setResults(prev => prev.map(r => r.project_id === merged.project_id ? merged : r))
        setSelected(merged)
      } else {
        setSelected({ ...item, cfId })
      }
    } catch {
      setSelected({ ...item, cfId })
    } finally {
      setDetailLoading(false)
    }
    await loadVersions(item)
  }

  async function handleDownloadLatest(item) {
    if (!isElectron) return
    setDownloading(item.project_id)
    setDownloadError(null)
    try {
      let vers = versions[versionKeyOf(item)]
      if (!vers) vers = await loadVersions(item)
      const latest = (vers || []).find(v => v.version_type === 'release') || (vers || [])[0]
      if (!latest) {
        setDownloadError(`No compatible version found for "${item.title || 'this item'}"`)
        return
      }
      const opts = {
        versionId: latest.id,
        projectId: latest.project_id,
        downloadUrl: latest.files?.[0]?.url,
        filename: latest.files?.[0]?.filename,
        fileLength: latest.files?.[0]?.size,
        projectType: contentType,
        instancePath: profile.instancePath,
        deleteOldVersions: true,
      }
      if (latest.source === 'curseforge') {
        await window.electronAPI.curseforgeInstall(opts)
      } else {
        await window.electronAPI.modrinthInstall(opts)
      }
      refreshInstalled()
    } catch (err) {
      setDownloadError(err?.message || 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  async function handleDownload(version) {
    if (!isElectron || !version) return
    setInstalling(true)
    setInstallProgress(null)
    setInstallError(null)
    setInstallDone(false)

    try {
      let result
      const opts = {
        versionId: version.id,
        projectId: version.project_id,
        downloadUrl: version.files?.[0]?.url,
        filename: version.files?.[0]?.filename,
        fileLength: version.files?.[0]?.size,
        projectType: contentType,
        instancePath: profile.instancePath,
        deleteOldVersions: true,
      }
      if (version.source === 'curseforge') {
        result = await window.electronAPI.curseforgeInstall(opts)
      } else {
        result = await window.electronAPI.modrinthInstall(opts)
      }
      if (result?.error) {
        setInstallError(result.error)
      } else {
        setInstallDone(true)
        refreshInstalled()
      }
    } catch (err) {
      setInstallError(err.message)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
      <div className="flex-[1_1_0%] flex flex-col min-h-0 overflow-hidden" style={{ minWidth: 0 }}>
        <div className="flex-shrink-0 mb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${contentType}s...`}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
        </div>

        {downloadError && (
          <div className="mb-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
            {downloadError}
          </div>
        )}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1" style={{ scrollbarColor: 'rgba(255,255,255,0.10) transparent' }}>
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/15"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              </div>
              <p className="text-xs text-white/30">No results found</p>
            </div>
          ) : (
            <>
              {results.map(item => {
                const inst = installedInfo(item)
                const update = hasUpdate(item)
                if (inst && !versions[item.cfId || item.project_id]) ensureVersions(item)
                return (
                <div key={item.project_id}
                  onClick={() => handleSelect(item)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all hover:bg-white/5 border border-transparent">
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                    {item.icon_url
                      ? <img src={item.icon_url} alt="" className="w-full h-full object-cover" />
                      : <svg className="w-4 h-4 text-white/20" fill="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 font-medium truncate">{item.title}</p>
                    <p className="text-[9px] text-white/35 truncate">{item.description}</p>
                    <p className="text-[9px] text-white/25 mt-0.5">{formatNum(item.downloads)} downloads</p>
                  </div>
                  {!inst ? (
                    <button onClick={e => { e.stopPropagation(); handleDownloadLatest(item) }}
                      disabled={downloading === item.project_id}
                      className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
                      style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}
                      title="Download latest version">
                      {downloading === item.project_id ? (
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                      )}
                    </button>
                  ) : update ? (
                    <button onClick={e => { e.stopPropagation(); handleDownloadLatest(item) }}
                      disabled={downloading === item.project_id}
                      className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 flex items-center gap-1"
                      style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
                      title="Update to latest version">
                      {downloading === item.project_id ? (
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M11 5v11.17l-4.88-4.88-1.42 1.41L12 19.71l7.3-7.01-1.42-1.41L13 16.17V5h-2zM5 21h14v-2H5v2z"/></svg>
                      )}
                      Update
                    </button>
                  ) : (
                    <span className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-green-300 bg-green-500/15 border border-green-500/25 flex items-center gap-1"
                      title="Installed - ready to use">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      Ready to use
                    </span>
                  )}
                </div>
                )
              })}
              {hasMore && (
                <button onClick={loadMore} disabled={loading}
                  className="w-full py-2 text-[10px] text-white/30 hover:text-white/60 transition-colors font-semibold">
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-[1_1_0%] flex flex-col min-h-0 border-l pl-4" style={{ minWidth: 0, borderColor: 'rgba(255,255,255,0.08)' }}>
        <ContentDetailPanel
          item={selectedItem}
          profile={profile}
          contentType={contentType}
          versions={selectedVers}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          lightboxIdx={lightboxIdx}
          setLightboxIdx={setLightboxIdx}
          installing={installing}
          handleDownload={handleDownload}
          installProgress={installProgress}
          installError={installError}
          installDone={installDone}
          installedInfo={installedInfo}
          latestOf={(item) => latestOf(item.cfId || item.project_id)}
          hasUpdate={hasUpdate}
          onBack={() => setSelected(null)}
          loading={detailLoading}
        />
      </div>
    </div>
  )
}
