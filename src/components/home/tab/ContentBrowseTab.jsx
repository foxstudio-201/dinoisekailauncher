import { useState, useCallback, useEffect, useRef } from 'react'
import { isElectron, Icons, formatBytes, LoadingState, EmptyState, DropZoneWrapper, SearchBar } from './shared'
import { useLang } from '../../../i18n/LangProvider'
import { ContentDetailPanel } from '../../gaming/ContentDetailPanel'

const TYPE_CFG = {
  mod: {
    metaPrefix: 'mod:',
    icon: Icons.mod,
    accept: ['.jar'],
    ext: /\.jar(\.off|\.disabled)?$/i,
    color: 'green',
    toggleable: true,
  },
  shader: {
    metaPrefix: 'shader:',
    icon: Icons.shader,
    accept: ['.zip', '.rar'],
    ext: /\.(zip|rar)$/i,
    color: 'purple',
    toggleable: false,
  },
  resourcepack: {
    metaPrefix: 'resourcepack:',
    icon: Icons.resourcepack,
    accept: ['.zip'],
    ext: /\.zip$/i,
    color: 'yellow',
    toggleable: false,
  },
}

function formatNum(n) {
  if (!n) return '0'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return String(n)
}

function typeLabel(type) {
  return type === 'resourcepack' ? 'resourcepack' : type
}

function versionFiltersFor(profile, type) {
  if (type !== 'mod') return {}
  return {
    gameVersions: [profile.gameVersion],
    loaders: profile.loader !== 'vanilla' ? [profile.loader] : [],
  }
}

export default function ContentBrowseTab({ profile, accountId, type }) {
  const { t } = useLang()
  const cfg = TYPE_CFG[type]
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [installing, setInstalling] = useState([])
  const [query, setQuery] = useState('')

  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [versions, setVersions] = useState({})
  const [detailTab, setDetailTab] = useState('description')
  const [lightboxIdx, setLightboxIdx] = useState(-1)
  const [verInstalling, setVerInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState(null)
  const [installError, setInstallError] = useState(null)
  const [installDone, setInstallDone] = useState(false)
  const [updating, setUpdating] = useState(null)

  const trackedRef = useRef({})
  const matchedRef = useRef({})
  const metaRef = useRef({})
  const detailCacheRef = useRef({})
  const loadIdRef = useRef(0)
  const versionsLoadingRef = useRef({})

  const q = query.trim().toLowerCase()
  const filtered = q
    ? items.filter(it => (it.name || '').toLowerCase().includes(q))
    : items

  const load = useCallback(async () => {
    if (!isElectron || !profile?.id) { setLoading(false); return }
    const loadId = ++loadIdRef.current
    setLoading(true)
    try {
      const listR = type === 'mod'
        ? await window.electronAPI.profileListMods(profile.id, accountId)
        : type === 'shader'
          ? await window.electronAPI.profileListShaders(profile.id, accountId)
          : await window.electronAPI.profileListResourcePacks(profile.id, accountId)
      const list = (listR?.ok ? (listR.mods || listR.shaders || listR.packs || []) : [])
        .filter(f => cfg.ext.test(f.fileName))

      const [trackedR] = await Promise.all([
        window.electronAPI.profileGetInstalledContent(profile.id).catch(() => null),
      ])
      // Scan hand-installed files in the background: if it finishes within a
      // short window we get names/icons immediately, otherwise the UI renders
      // with what the cache already has and refreshes when the scan reports done.
      const matchedR = await Promise.race([
        window.electronAPI.profileMatchInstalledContent(profile.id).catch(() => null),
        new Promise(r => setTimeout(() => r(null), 700)),
      ])

      const meta = {}
      for (const r of [trackedR, matchedR]) {
        if (!r?.ok || !r.meta) continue
        for (const [key, m] of Object.entries(r.meta)) {
          if (!key.startsWith(cfg.metaPrefix) || !m || typeof m !== 'object') continue
          meta[key.slice(cfg.metaPrefix.length)] = m
        }
      }

      trackedRef.current = trackedR?.ok ? (trackedR.installed || {}) : {}
      matchedRef.current = matchedR?.ok ? (matchedR.matchedFiles || {}) : {}
      metaRef.current = meta

      const byBase = {}
      if (trackedR?.ok) {
        for (const [pid, info] of Object.entries(trackedR.installed || {})) {
          if (!info || info.type !== type || typeof info.filename !== 'string') continue
          byBase[info.filename.replace(/\.(off|disabled)$/i, '')] = pid
        }
      }
      const matchedFiles = matchedR?.ok ? (matchedR.matchedFiles || {}) : {}

      const groups = new Map()
      for (const file of list) {
        const base = file.fileName.replace(/\.(off|disabled)$/i, '')
        const projectId = byBase[base] || matchedFiles[base]?.projectId || null
        const metaInfo = meta[file.fileName] || meta[base] || null
        const key = projectId ? `p:${projectId}` : `f:${base}`
        if (!groups.has(key)) groups.set(key, { key, projectId, meta: metaInfo, files: [] })
        groups.get(key).files.push(file)
      }

      // Merge groups that are the same mod but matched on different
      // platforms (same display name, different projectId).
      const byName = new Map()
      for (const g of groups.values()) {
        const nm = (g.meta?.name || g.files[0]?.displayName || g.files[0]?.fileName || '')
          .replace(/\.(off|disabled)$/i, '')
          .toLowerCase()
        if (!byName.has(nm)) byName.set(nm, [])
        byName.get(nm).push(g)
      }
      const finalGroups = []
      for (const gs of byName.values()) {
        if (gs.length === 1) { finalGroups.push(gs[0]); continue }
        const cf = gs.find(g => g.meta?.source === 'curseforge') || gs[0]
        for (const g of gs) {
          if (g === cf) continue
          cf.files.push(...g.files)
        }
        finalGroups.push(cf)
      }

      const sorted = finalGroups
        .map(g => ({
          ...g,
          name: g.meta?.name || g.files[0]?.displayName || g.files[0]?.fileName,
          description: g.meta?.description || '',
          iconUrl: g.meta?.iconUrl || null,
          downloads: g.meta?.downloads || 0,
          totalSize: g.files.reduce((s, f) => s + (f.size || 0), 0),
          enabled: g.files.some(f => f.enabled !== false),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

      setLoading(false)
      // Render progressively so a big list never freezes the UI.
      const chunkSize = 40
      for (let i = chunkSize; i < sorted.length; i += chunkSize) {
        await new Promise(r => setTimeout(r, 40))
        if (loadIdRef.current !== loadId) return
        setItems(sorted.slice(0, i))
      }
      if (loadIdRef.current !== loadId) return
      setItems(sorted)
    } catch {}
    if (loadIdRef.current === loadId) setLoading(false)
  }, [profile?.id, accountId, type])

  useEffect(() => { load() }, [load])

  // When the background scan for hand-installed files finishes, refresh so
  // newly matched names/icons appear without blocking the first render.
  useEffect(() => {
    if (!isElectron || !window.electronAPI.onContentScanDone) return
    return window.electronAPI.onContentScanDone(pid => {
      if (pid === profile?.id) load()
    })
  }, [profile?.id, load])

  // Preload versions for installed items so the list can show update badges.
  useEffect(() => {
    if (!isElectron || !profile?.id) return
    for (const item of items) {
      if (installedInfo(item) && !versions[projKey(item)]) {
        ensureListVersions(item)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, versions])

  function installedInfo(item) {
    const pid = projKey(item)
    if (pid && trackedRef.current[pid]?.type === type) return trackedRef.current[pid]
    for (const file of item?.files || []) {
      const base = file.fileName.replace(/\.(off|disabled)$/i, '')
      const match = matchedRef.current[base]
      if (match && (match.type || type) === type) {
        return { type, filename: file.fileName, versionId: match.versionId || null, platform: match.platform || null }
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
    const key = projKey(item)
    const latest = latestOf(key)
    if (!latest) return false
    if (inst.versionId) return String(latest.id) !== String(inst.versionId)
    const matched = (versions[key] || [])
      .find(v => (v.files || []).some(f => f.filename === inst.filename))
    if (!matched) return false
    return String(latest.id) !== String(matched.id)
  }

  // Resolve which API a project came from. metaRef is keyed by filename,
  // matchedRef and trackedRef carry an explicit platform, and numeric
  // project ids are always CurseForge.
  function platformOf(item) {
    if (!item) return null
    if (item.meta?.source) return item.meta.source
    for (const file of item.files || []) {
      const base = file.fileName.replace(/\.(off|disabled)$/i, '')
      const m = metaRef.current[file.fileName] || metaRef.current[base]
      if (m?.source) return m.source
      const match = matchedRef.current[base]
      if (match?.platform) return match.platform
    }
    const pid = item.projectId || item.project_id
    if (pid && trackedRef.current[pid]?.platform) return trackedRef.current[pid].platform
    if (typeof pid === 'number') return 'curseforge'
    return null
  }

  function slugFromProjectUrl(item) {
    const url = item?.meta?.projectUrl || ''
    const m = url.match(/modrinth\.com\/(?:mod|plugin|shader|resourcepack|datapack)\/([^/?#]+)/i)
    return m ? m[1] : null
  }

  function projKey(item) {
    if (!item) return null
    return item.projectId || item.project_id || slugFromProjectUrl(item) || null
  }

  async function fetchProject(pid, platform) {
    const candidates = ['curseforge', 'modrinth']
    for (const p of candidates) {
      const full = p === 'curseforge'
        ? await window.electronAPI.curseforgeGetProject(pid).catch(() => null)
        : await window.electronAPI.modrinthGetProject(pid).catch(() => null)
      if (full && !full?.error) return { platform: p, full }
    }
    return { platform, full: null }
  }

  async function fetchVersions(pid, platform, filters) {
    const candidates = ['curseforge', 'modrinth']
    for (const p of candidates) {
      const data = p === 'curseforge'
        ? await window.electronAPI.curseforgeGetVersions(pid, filters).catch(() => null)
        : await window.electronAPI.modrinthGetVersions(pid, filters).catch(() => null)
      if (Array.isArray(data) && data.length > 0) {
        return { platform: p, data: data.map(v => ({ ...v, source: p })) }
      }
    }
    return { platform, data: null }
  }

  async function openDetail(item) {
    if (!item) return
    setSelected(item)
    setDetailTab('description')
    setLightboxIdx(-1)
    setInstallError(null)
    setInstallDone(false)
    const pid = projKey(item)
    const platform = platformOf(item)

    const loadDetail = async () => {
      if (!pid) { setDetail(item); setDetailLoading(false); return }
      if (detailCacheRef.current[pid]) {
        setDetail(detailCacheRef.current[pid])
        return
      }
      setDetailLoading(true)
      const { platform: projPlatform, full } = await fetchProject(pid, platform)
      if (full && !full?.error) {
        const merged = {
          ...full,
          source: projPlatform,
          projectId: pid,
          project_id: pid,
          files: item.files || [],
          title: full.title || item.name,
          name: full.title || item.name,
          description: full.description || item.description,
          icon_url: full.icon_url || item.iconUrl,
          author: full.author || item.meta?.author || '',
          downloads: full.downloads || item.downloads || 0,
        }
        detailCacheRef.current[pid] = merged
        setDetail(merged)
      } else {
        setDetail(item)
      }
      setDetailLoading(false)
    }
    await loadDetail()

    if (!pid || versions[pid]) return
    try {
      const filters = versionFiltersFor(profile, type)
      const { data } = await fetchVersions(pid, platform, filters)
      setVersions(prev => ({ ...prev, [pid]: Array.isArray(data) ? data : [] }))
    } catch {}
  }

  async function handleDownload(version) {
    if (!isElectron || !version) return
    const item = detail
    const src = version?.source || platformOf(item) || 'curseforge'
    setVerInstalling(true)
    setInstallProgress(null)
    setInstallError(null)
    setInstallDone(false)
    try {
      const opts = {
        versionId: version.id,
        projectId: version.project_id,
        downloadUrl: version.files?.[0]?.url,
        filename: version.files?.[0]?.filename,
        fileLength: version.files?.[0]?.size,
        projectType: type,
        instancePath: profile.instancePath,
        deleteOldVersions: true,
      }
      const result = src === 'curseforge'
        ? await window.electronAPI.curseforgeInstall(opts)
        : await window.electronAPI.modrinthInstall(opts)
      if (result?.error) {
        setInstallError(result.error)
      } else {
        setInstallDone(true)
        load()
      }
    } catch (err) {
      setInstallError(err?.message || 'Install failed')
    } finally {
      setVerInstalling(false)
    }
  }

  async function ensureListVersions(item) {
    const pid = projKey(item)
    if (!pid || versions[pid] || versionsLoadingRef.current[pid]) return
    versionsLoadingRef.current[pid] = true
    try {
      const { data } = await fetchVersions(pid, platformOf(item), versionFiltersFor(profile, type))
      setVersions(prev => ({ ...prev, [pid]: Array.isArray(data) ? data : [] }))
    } catch {} finally {
      delete versionsLoadingRef.current[pid]
    }
  }

  async function handleUpdate(item) {
    if (!isElectron) return
    const pid = projKey(item)
    let vers = versions[pid]
    if (!vers) {
      await ensureListVersions(item)
      vers = versions[pid]
    }
    const latest = (vers || []).find(v => v.version_type === 'release') || (vers || [])[0]
    if (!latest) return
    const src = latest.source || platformOf(item) || 'curseforge'
    setUpdating(item.key)
    try {
      const opts = {
        versionId: latest.id,
        projectId: latest.project_id,
        downloadUrl: latest.files?.[0]?.url,
        filename: latest.files?.[0]?.filename,
        fileLength: latest.files?.[0]?.size,
        projectType: type,
        instancePath: profile.instancePath,
        deleteOldVersions: true,
      }
      const result = src === 'curseforge'
        ? await window.electronAPI.curseforgeInstall(opts)
        : await window.electronAPI.modrinthInstall(opts)
      if (result?.error) setInstallError(result.error)
      else {
        setInstallDone(true)
        load()
      }
    } catch {}
    setUpdating(null)
  }

  async function handleToggle(item) {
    if (!isElectron || !cfg.toggleable) return
    const target = item.files.find(f => f.enabled) || item.files[0]
    if (!target) return
    setToggling(item.key)
    try {
      const r = await window.electronAPI.profileToggleMod(profile.id, target.fileName, accountId)
      if (r?.ok) load()
    } catch {}
    setToggling(null)
  }

  async function handleDelete(item) {
    if (!isElectron) return
    setDeleting(item.key)
    try {
      for (const f of item.files) {
        if (type === 'mod') await window.electronAPI.profileDeleteMod(profile.id, f.fileName, accountId)
        else if (type === 'shader') await window.electronAPI.profileDeleteShader(profile.id, f.fileName, f.subDir, accountId)
        else await window.electronAPI.profileDeleteResourcePack(profile.id, f.fileName, accountId)
      }
      setItems(prev => prev.filter(it => it.key !== item.key))
      if (selected?.key === item.key) { setSelected(null); setDetail(null) }
    } catch {}
    setDeleting(null)
    setConfirmDelete(null)
  }

  async function handleDropFiles(files) {
    if (!isElectron || !profile?.id) return
    const valid = files.filter(f => cfg.accept.some(ext => f.name.toLowerCase().endsWith(ext)))
    if (!valid.length) return
    setInstalling(valid.map(f => f.name))
    for (const file of valid) {
      try {
        const srcPath = window.electronAPI.getFilePath(file)
        if (!srcPath) continue
        await window.electronAPI.profileInstallFile(profile.id, type, srcPath, accountId)
      } catch {}
    }
    setInstalling([])
    load()
  }

  if (loading) return <LoadingState text={t(`profileSettings.${type === 'shader' ? 'shaders' : type === 'resourcepack' ? 'resourcepacks' : 'mods'}.loading`)} />

  if (items.length === 0) return (
    <DropZoneWrapper onDrop={handleDropFiles} accept={cfg.accept} color={cfg.color}>
      <EmptyState
        icon={cfg.icon}
        title={t(`profileSettings.${type === 'shader' ? 'shaders' : type === 'resourcepack' ? 'resourcepacks' : 'mods'}.emptyTitle`)}
        desc={t(`profileSettings.${type === 'shader' ? 'shaders' : type === 'resourcepack' ? 'resourcepacks' : 'mods'}.emptyDesc`)}
      />
    </DropZoneWrapper>
  )

  return (
    <DropZoneWrapper onDrop={handleDropFiles} accept={cfg.accept} color={cfg.color}>
      {selected ? (
        <div className="h-full flex flex-col min-h-0">
          <ContentDetailPanel
            item={detail}
            profile={profile}
            contentType={type}
            versions={versions[projKey(selected)] || []}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            lightboxIdx={lightboxIdx}
            setLightboxIdx={setLightboxIdx}
            installing={verInstalling}
            handleDownload={handleDownload}
            installProgress={installProgress}
            installError={installError}
            installDone={installDone}
            installedInfo={installedInfo}
            latestOf={(it) => latestOf(projKey(it))}
            hasUpdate={hasUpdate}
            onBack={() => { setSelected(null); setDetail(null) }}
            loading={detailLoading}
          />
        </div>
      ) : (
      <div className="flex flex-col h-full">
          {installing.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border-b border-violet-500/20 text-xs text-violet-400">
              {Icons.spin}
              <span>{t(`profileSettings.${type === 'shader' ? 'shaders' : type === 'resourcepack' ? 'resourcepacks' : 'mods'}.installing`, { count: installing.length })}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
            <SearchBar value={query} onChange={setQuery} placeholder={t(`profileSettings.${type === 'shader' ? 'shaders' : type === 'resourcepack' ? 'resourcepacks' : 'mods'}.search`)} />
            <span className="text-xs text-white/30 whitespace-nowrap">{q ? `${filtered.length}/${items.length}` : items.length} {type === 'shader' ? 'shaders' : type === 'resourcepack' ? 'packs' : 'mods'}</span>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
            {filtered.length === 0 ? (
              <EmptyState icon={Icons.search} title={t('profileSettings.mods.noResults')} />
            ) : (
              <div className="flex flex-col gap-1 p-2.5">
                {filtered.map(item => (
                  <div key={item.key}
                    onClick={() => openDetail(item)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group cursor-pointer ${selected?.key === item.key ? 'bg-violet-500/10 border-violet-500/30' : item.enabled ? 'bg-white/3 border-white/5 hover:bg-white/5 hover:border-white/8' : 'bg-white/1 border-white/3 opacity-50 hover:opacity-70'}`}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/8 flex items-center justify-center">
                      {item.iconUrl ? <img src={item.iconUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white/20 scale-90">{cfg.icon}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{item.name}</p>
                      <p className="text-[10px] text-white/35 truncate mt-0.5 font-mono">{item.files[0]?.fileName || item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-white/25">{formatNum(item.downloads)} downloads</span>
                        <span className="text-[10px] text-white/20">·</span>
                        <span className="text-[10px] text-white/25">{formatBytes(item.totalSize)}</span>
                        {item.files.length > 1 && (
                          <>
                            <span className="text-[10px] text-white/20">·</span>
                            <span className="text-[10px] text-violet-400/70 font-semibold">{item.files.length} phiên bản</span>
                          </>
                        )}
                        {!item.enabled && (
                          <>
                            <span className="text-[10px] text-white/20">·</span>
                            <span className="text-[10px] text-violet-400/60">{t('profileSettings.mods.disabled')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {confirmDelete === item.key ? (
                        <>
                          <span className="text-[10px] text-red-400/70">{t('profileSettings.mods.deleteConfirm')}</span>
                          <button onClick={() => handleDelete(item)} disabled={deleting === item.key} className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-[10px] font-bold hover:bg-red-500/25 transition-all disabled:opacity-50">
                            {deleting === item.key ? '...' : t('profileSettings.mods.delete')}
                          </button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-white/40 text-[10px] hover:bg-white/10 transition-all">{t('profileSettings.mods.cancel')}</button>
                        </>
                      ) : (
                        <>
                          {installedInfo(item) && (hasUpdate(item) ? (
                            <button
                              onClick={() => handleUpdate(item)}
                              disabled={updating === item.key}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-1"
                              style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}
                              title="Update to latest version"
                            >
                              {updating === item.key ? '...' : (
                                <>
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M11 5v11.17l-4.88-4.88-1.42 1.41L12 19.71l7.3-7.01-1.42-1.41L13 16.17V5h-2zM5 21h14v-2H5v2z"/></svg>
                                  Update
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-green-300 bg-green-500/15 border border-green-500/25 flex items-center gap-1" title="Ready to use">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                              Ready
                            </span>
                          ))}
                          {cfg.toggleable && (
                            <button
                              onClick={() => handleToggle(item)}
                              disabled={toggling === item.key}
                              className={`relative w-9 h-5 rounded-full transition-all flex-shrink-0 ${item.enabled ? 'bg-violet-500' : 'bg-white/10'} disabled:opacity-50`}
                              title={item.enabled ? t('profileSettings.mods.disableMod') : t('profileSettings.mods.enableMod')}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${item.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                            </button>
                          )}
                          <button onClick={() => setConfirmDelete(item.key)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all" title={t('profileSettings.mods.deleteMod')}>
                            {Icons.trash}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DropZoneWrapper>
  )
}
