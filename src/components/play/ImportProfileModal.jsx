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

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLang } from '../../i18n/LangProvider'
import fabricIcon    from '../../assets/loader/fabric.png'
import forgeIcon     from '../../assets/loader/forge.png'
import neoforgeIcon  from '../../assets/loader/neoforge.png'
import curseforgeIcon from '../../assets/loader/curseforge.png'
import modrinthIcon  from '../../assets/loader/modrinth.png'
import defaultBg     from '../../assets/minecraft-versions/default.png'

import v112 from '../../assets/minecraft-versions/1.12.png'
import v115 from '../../assets/minecraft-versions/1.15.png'
import v116 from '../../assets/minecraft-versions/1.16.png'
import v117 from '../../assets/minecraft-versions/1.17.png'
import v118 from '../../assets/minecraft-versions/1.18.png'
import v119 from '../../assets/minecraft-versions/1.19.png'
import v120 from '../../assets/minecraft-versions/1.20.png'
import v121 from '../../assets/minecraft-versions/1.21.png'

const isElectron = typeof window !== 'undefined' && window.electronAPI

const VERSION_MAP = {
  '1.12': v112, '1.15': v115, '1.16': v116, '1.17': v117,
  '1.18': v118, '1.19': v119, '1.20': v120, '1.21': v121,
}

const LOADER_ICONS = {
  fabric:   fabricIcon,
  forge:    forgeIcon,
  neoforge: neoforgeIcon,
}

const SOURCES = {
  curseforge: {
    id: 'curseforge',
    label: 'CurseForge',
    color: '#8b5cf6',
    icon: curseforgeIcon,
    ext: '.zip',
  },
  modrinth: {
    id: 'modrinth',
    label: 'Modrinth',
    color: '#8b5cf6',
    icon: modrinthIcon,
    ext: '.zip / .mrpack',
  },
}

function getMajorVersion(v) {
  if (!v) return null
  const parts = v.split('.')
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : v
}

function getVersionImage(gameVersion) {
  if (!gameVersion) return defaultBg
  const major = getMajorVersion(gameVersion)
  return VERSION_MAP[major] || defaultBg
}

function PreviewCard({ source, meta }) {
  const theme = SOURCES[source]

  const icon = meta.iconBase64 || meta.iconUrl || LOADER_ICONS[meta.loader] || forgeIcon
  const bgImage = meta.iconUrl || getVersionImage(meta.gameVersion)

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ borderColor: theme.color + '44', background: `linear-gradient(135deg, ${theme.color}12 0%, #141414 60%)` }}
    >
      <div className="relative h-24 overflow-hidden">
        <img src={bgImage} alt="bg" className="w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70 pointer-events-none" />
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: theme.color + 'cc', color: '#fff' }}>
          <img src={theme.icon} alt={theme.label} className="w-3 h-3 object-contain" />
          {theme.label}
        </div>
        {meta.gameVersion && (
          <div className="absolute bottom-2 left-3">
            <span className="text-[10px] font-mono text-white/70 bg-black/50 px-1.5 py-0.5 rounded">{meta.gameVersion}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border"
          style={{ background: theme.color + '18', borderColor: theme.color + '33' }}>
          <img src={icon} alt="icon" className="w-7 h-7 object-contain" draggable={false} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{meta.name || 'Unnamed'}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {meta.loader && (
              <span className="text-[10px] font-semibold capitalize" style={{ color: theme.color }}>
                {meta.loader}{meta.loaderVersion ? ` ${meta.loaderVersion}` : ''}
              </span>
            )}
            {meta.loader && meta.gameVersion && <span className="text-[10px] text-white/25">·</span>}
            {meta.gameVersion && <span className="text-[10px] text-white/40">{meta.gameVersion}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

const MINIMIZED_LEFT = 80

export default function ImportProfileModal({ onClose, onCreate }) {
  const { t } = useLang()
  const [activeSource, setActiveSource] = useState('curseforge')
  const [filePath, setFilePath]         = useState(null)
  const [fileName, setFileName]         = useState(null)
  const [meta, setMeta]                 = useState(null)
  const [reading, setReading]           = useState(false)
  const [importing, setImporting]       = useState(false)
  const [progress, setProgress]         = useState(null)
  const [isDragging, setIsDragging]     = useState(false)
  const [minimized, setMinimized]       = useState(false)
  const dropZoneRef                     = useRef(null)
  const dragCounter                     = useRef(0)

  const theme = SOURCES[activeSource]

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !importing) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, importing])

  const processFilePath = useCallback(async (fPath, fName) => {
    setReading(true)
    setMeta(null)
    setFilePath(fPath)
    setFileName(fName)
    try {
      const metaResult = await window.electronAPI.readModpackMeta(fPath)
      if (metaResult?.error) {
        setMeta({ name: fName.replace(/\.(zip|mrpack)$/i, ''), gameVersion: '', loader: '', loaderVersion: '', iconBase64: null, iconUrl: null })
      } else {
        setMeta(metaResult)
      }
    } catch {
      setMeta({ name: fName.replace(/\.(zip|mrpack)$/i, ''), gameVersion: '', loader: '', loaderVersion: '', iconBase64: null, iconUrl: null })
    } finally {
      setReading(false)
    }
  }, [])

  async function handleBrowse() {
    if (!isElectron) return
    try {
      const r = await window.electronAPI.browseModpack()
      if (r?.canceled || !r?.filePath) return
      await processFilePath(r.filePath, r.name)
    } catch (err) { console.error('[ImportModal]', err) }
  }

  const onDragEnter = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current++
    if (dragCounter.current === 1) setIsDragging(true)
  }, [])
  const onDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation() }, [])
  const onDragLeave = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }, [])
  const onDrop = useCallback(async (e) => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current = 0; setIsDragging(false)
    if (importing) return
    const dropped = e.dataTransfer.files[0]
    if (!dropped || !dropped.name.match(/\.(zip|mrpack)$/i)) return
    let fPath = null
    if (isElectron && window.electronAPI.getFilePath) fPath = window.electronAPI.getFilePath(dropped)
    if (!fPath) return
    await processFilePath(fPath, dropped.name)
  }, [importing, processFilePath])

  function handleClearFile() {
    setFilePath(null); setFileName(null); setMeta(null); setProgress(null)
  }
  function switchSource(src) { setActiveSource(src); handleClearFile() }

  async function handleImport() {
    if (!filePath || !meta) return
    setImporting(true)
      setProgress({ phase: 'create', log: t('playpage.importProfile.creatingProfile'), percent: 1 })

    try {
      const loader = meta.loader || (activeSource === 'modrinth' ? 'fabric' : 'forge')

      const iconUrl = meta.iconUrl || meta.iconBase64 || null

      const createResult = await onCreate({
        name:          meta.name || fileName?.replace(/\.(zip|mrpack)$/i, '') || 'Modpack',
        loader,
        gameVersion:   meta.gameVersion || '',
        loaderVersion: meta.loaderVersion || '',
        importSource:  activeSource,
        importIconUrl: iconUrl,
        importBgUrl:   meta.iconUrl || meta.iconBase64 || null,
      })

      if (createResult?.error) {
        setProgress({ phase: 'error', log: t('playpage.importProfile.errorCreatingProfile', { error: createResult.error }), percent: 0 })
        return
      }

      const profileId = createResult?.profile?.id
      if (!profileId || !isElectron) { onClose(); return }

      const unsub = window.electronAPI.onImportProgress?.((data) => setProgress(data))
      setProgress({ phase: 'start', log: t('playpage.importProfile.startImport'), percent: 2 })

      const result = await window.electronAPI.importModpack({ filePath, source: activeSource, profileId })
      unsub?.()

      if (result?.error) {
        setProgress({ phase: 'error', log: t('playpage.importProfile.errorImport', { error: result.error }), percent: 0 })
        return
      }

      setProgress({ phase: 'done', log: t('playpage.importProfile.importDone'), percent: 100 })
      setTimeout(() => onClose(), 900)
    } catch (err) {
      setProgress({ phase: 'error', log: t('playpage.importProfile.errorImport', { error: err.message }), percent: 0 })
    } finally {
      setImporting(false)
    }
  }

  const canImport = !!filePath && !!meta && !reading && !importing

  if (minimized) {
    const isRunning = importing && progress
    const isDone    = progress?.phase === 'done'
    const isError   = progress?.phase === 'error'

    return (
      <div
        className="fixed z-50 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl shadow-2xl shadow-black/60 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
        style={{
          bottom: 20,
          left: MINIMIZED_LEFT,
          background: 'rgba(14,14,14,0.98)',
          border: `1px solid ${isError ? '#ef444455' : isDone ? '#8b5cf655' : theme.color + '55'}`,
          minWidth: 260,
          maxWidth: 340,
        }}
        onClick={() => setMinimized(false)}
        title={t('playpage.importProfile.minimizedTitle')}
      >
        {}
        <div className="flex-shrink-0 w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: theme.color + '20', border: `1px solid ${theme.color}44` }}>
          <img src={theme.icon} alt={theme.label} className="w-5 h-5 object-contain" />
        </div>

        {}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/80 truncate">
            {meta?.name || fileName?.replace(/\.(zip|mrpack)$/i, '') || 'Import'}
          </p>
          {isRunning ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent ?? 0}%`, background: isError ? '#ef4444' : theme.color }}
                />
              </div>
              <span className="text-[10px] font-mono flex-shrink-0"
                style={{ color: isError ? '#f87171' : isDone ? '#a78bfa' : theme.color }}>
                {progress.percent ?? 0}%
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-white/30 mt-0.5">
              {filePath ? t('playpage.importProfile.readyToImport') : t('playpage.importProfile.selectFile')}
            </p>
          )}
        </div>

        {}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {importing && !isDone && !isError && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" style={{ color: theme.color }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
          {isDone && (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-violet-400">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          )}
          {isError && (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          )}
          {}
          {!importing && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose() }}
              className="w-5 h-5 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/10 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !importing) onClose() }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(14,14,14,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">{t('playpage.importProfile.title')}</h2>
            <p className="text-xs text-white/30 mt-0.5">{t('playpage.importProfile.subtitle')}</p>
          </div>
          <div className="flex items-center gap-1">
            {}
            <button
              onClick={() => setMinimized(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
              title={t('playpage.importProfile.minimize')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
            </button>
            {}
            <button
              onClick={() => { if (!importing) onClose() }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/8 transition-all"
              title={t('playpage.importProfile.close')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        {}
        <div className="px-5 pb-4">
          <div className="flex gap-1.5 p-1 bg-white/4 rounded-xl border border-white/5">
            {Object.values(SOURCES).map(src => (
              <button
                key={src.id}
                onClick={() => switchSource(src.id)}
                disabled={importing}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all duration-150 disabled:opacity-50"
                style={
                  activeSource === src.id
                    ? { background: src.color + '20', borderColor: src.color + '55', color: src.color }
                    : { background: 'transparent', borderColor: 'transparent', color: 'rgba(255,255,255,0.35)' }
                }
              >
                <img src={src.icon} alt={src.label} className="w-3.5 h-3.5 object-contain flex-shrink-0" />
                {src.label}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="px-5 pb-5 flex flex-col gap-4">
          {}
          {!filePath ? (
            <div
              ref={dropZoneRef}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 px-6 cursor-pointer transition-all duration-200 select-none"
              style={{
                borderColor: isDragging ? theme.color : theme.color + '44',
                background:  isDragging ? theme.color + '12' : theme.color + '06',
              }}
              onClick={handleBrowse}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: isDragging ? theme.color + '30' : theme.color + '20',
                  border: `1px solid ${theme.color}${isDragging ? '88' : '44'}`,
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" style={{ color: theme.color }}>
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: isDragging ? theme.color : 'rgba(255,255,255,0.7)' }}>
                  {isDragging ? t('playpage.importProfile.dropHere') : t('playpage.importProfile.dragDrop')}
                </p>
                <p className="text-xs text-white/30 mt-1">{t('playpage.importProfile.supportedFormats', { source: `${theme.label} (${theme.ext})` })}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                style={{ background: theme.color + '0d', borderColor: theme.color + '33' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" style={{ color: theme.color }}>
                  <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z"/>
                </svg>
                <span className="flex-1 text-xs text-white/70 truncate font-mono">{fileName}</span>
                {!importing && (
                  <button onClick={handleClearFile}
                    className="w-5 h-5 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/8 transition-all flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                )}
              </div>

              {reading && (
                <div className="flex items-center justify-center gap-2 py-6">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" style={{ color: theme.color }}>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span className="text-xs text-white/40">{t('playpage.importProfile.readingFile')}</span>
                </div>
              )}

              {!reading && meta && <PreviewCard source={activeSource} meta={meta} />}
            </div>
          )}

          {}
          {progress && (
            <div className="flex flex-col gap-2 px-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-white/50 truncate flex-1">{progress.log}</span>
                <span className="text-xs font-mono font-bold flex-shrink-0"
                  style={{ color: progress.phase === 'error' ? '#f87171' : theme.color }}>
                  {progress.percent ?? 0}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent ?? 0}%`, background: progress.phase === 'error' ? '#ef4444' : theme.color }} />
              </div>
              {progress.total > 0 && (
                <p className="text-[10px] text-white/25 text-right">{progress.done ?? 0} / {progress.total} mods</p>
              )}
              {progress.phase === 'error' && (
                <p className="text-[10px] text-red-400/70 mt-1">
                  {t('playpage.importProfile.errorNetwork')}
                </p>
              )}
            </div>
          )}

          {}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { if (!importing) onClose() }}
              disabled={importing}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/8 border border-white/5 hover:border-white/10 transition-all disabled:opacity-40"
            >
              {t('playpage.importProfile.huy')}
            </button>
            <button
              onClick={handleImport}
              disabled={!canImport}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-150 active:scale-95 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              style={{
                background: canImport ? theme.color : 'rgba(255,255,255,0.08)',
                boxShadow:  canImport ? `0 4px 16px ${theme.color}40` : 'none',
              }}
            >
              {importing ? (
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {progress?.phase === 'mods' ? t('playpage.importProfile.downloadMods', { current: progress.done ?? 0, total: progress.total ?? 0 })
                    : progress?.phase === 'overrides' ? t('playpage.importProfile.extracting')
                    : progress?.phase === 'done' ? t('playpage.importProfile.importDone')
                    : t('playpage.importProfile.importing')}
                </span>
              ) : t('playpage.importProfile.import')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

