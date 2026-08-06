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

import { useState, useEffect, useRef } from 'react'
import { DownloadSimple, X, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import curseforgeIcon from '../../../assets/loader/curseforge.png'
import modrinthIcon   from '../../../assets/loader/modrinth.png'
import technicIcon    from '../../../assets/loader/technic.png'

const isElectron = typeof window !== 'undefined' && window.electronAPI

const MINIMIZED_LEFT = 80

const SOURCE_META = {
  modrinth:   { label: 'Modrinth',   color: '#8b5cf6', icon: modrinthIcon },
  curseforge: { label: 'CurseForge', color: '#8b5cf6', icon: curseforgeIcon },
  technic:    { label: 'Technic',    color: '#3b82f6', icon: technicIcon },
}

const VERSION_TYPE_STYLE = {
  release: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  beta:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  alpha:   'bg-red-500/15 text-red-400 border-red-500/25',
}

export default function ModpackInstallModal({ project, version, source, onClose }) {
  const [phase, setPhase]       = useState('idle')
  const [progress, setProgress] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [minimized, setMinimized] = useState(false)
  const unsubRef = useRef(null)
  // Track max percent seen to prevent backward jumps
  const maxPctRef = useRef(0)

  const src = SOURCE_META[source] || SOURCE_META.modrinth

  useEffect(() => {
    if (!isElectron) return
    unsubRef.current = window.electronAPI.onImportProgress?.((data) => {
      // Clamp percent to never go backwards
      const rawPct = data.percent ?? 0
      const clampedPct = Math.max(maxPctRef.current, rawPct)
      maxPctRef.current = clampedPct

      setProgress(prev => ({ ...prev, ...data, percent: clampedPct }))
      if (data.phase === 'done')  setPhase('done')
      if (data.phase === 'error') { setPhase('error'); setErrorMsg(data.log) }
    })
    return () => {
      unsubRef.current?.()
      maxPctRef.current = 0
    }
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        if (phase === 'running') handleCancel()
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, onClose])

  async function handleCancel() {
    if (!isElectron) return
    await window.electronAPI.cancelModpackDownload?.()
    setPhase('idle')
    setProgress(null)
    setErrorMsg(null)
    maxPctRef.current = 0
  }

  async function handleInstall() {
    if (phase === 'running') return
    maxPctRef.current = 0

    const primaryFile = version?.files?.find(f => f.primary) || version?.files?.[0]
    const downloadUrl = primaryFile?.url
    const filename    = primaryFile?.filename || `${project?.slug || 'modpack'}.zip`

    if (!downloadUrl) {
      setPhase('error')
      setErrorMsg('Không tìm thấy URL tải xuống cho phiên bản này.')
      return
    }

    setPhase('running')
    setErrorMsg(null)
    setProgress({ phase: 'download', log: 'Chuẩn bị tải...', percent: 0 })

    const result = await window.electronAPI.downloadAndImportModpack({
      downloadUrl,
      filename,
      source,
      profileMeta: {
        name:          project?.title || filename.replace(/\.(zip|mrpack)$/i, ''),
        iconUrl:       project?.icon_url || null,
        gameVersion:   version?.game_versions?.[0] || '',
        loader:        version?.loaders?.[0] || (source === 'modrinth' ? 'fabric' : 'forge'),
        loaderVersion: '',
      },
    })

    if (result?.cancelled) {
      // Đã hủy qua signal — state đã được reset bởi handleCancel
      return
    }
    if (result?.error && phase !== 'done') {
      setPhase('error')
      setErrorMsg(result.error)
    }
  }

  const isRunning = phase === 'running'
  const isDone    = phase === 'done'
  const isError   = phase === 'error'
  const pct       = progress?.percent ?? 0

  if (minimized) {
    return (
      <div
        className="fixed z-[300] flex items-center gap-3 px-3.5 py-2.5 rounded-2xl shadow-2xl shadow-black/60 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
        style={{
          bottom: 20,
          left: MINIMIZED_LEFT,
          background: 'rgba(14,14,14,0.98)',
          border: `1px solid ${isError ? '#ef444455' : isDone ? '#8b5cf655' : src.color + '55'}`,
          minWidth: 260,
          maxWidth: 340,
        }}
        onClick={() => setMinimized(false)}
        title="Click để mở lại"
      >
        {}
        <div className="flex-shrink-0 w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: src.color + '20', border: `1px solid ${src.color}44` }}>
          <img src={src.icon} alt={src.label} className="w-5 h-5 object-contain" />
        </div>

        {}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/80 truncate">
            {project?.title || 'Modpack'}
          </p>
          {isRunning && progress ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, background: isError ? '#ef4444' : src.color }}
                />
              </div>
              <span className="text-[10px] font-mono flex-shrink-0"
                style={{ color: isError ? '#f87171' : isDone ? '#a78bfa' : src.color }}>
                {pct}%
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-white/30 mt-0.5">
              {isDone ? 'Hoàn tất!' : isError ? 'Lỗi' : 'Sẵn sàng cài đặt'}
            </p>
          )}
        </div>

        {}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {isRunning && !isDone && !isError && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" style={{ color: src.color }}>
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
          {!isRunning && (
            <button
              onClick={e => { e.stopPropagation(); onClose() }}
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
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      onClick={e => { if (e.target === e.currentTarget) { if (isRunning) handleCancel(); else onClose() } }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { if (isRunning) handleCancel(); else onClose() }} />

      <div
        className="relative z-10 w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'rgba(14,14,14,0.98)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
      >
        {}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            {project?.icon_url && (
              <img src={project.icon_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            )}
            <div>
              <h3 className="text-white font-bold text-sm leading-tight">{project?.title}</h3>
              <p className="text-white/30 text-xs mt-0.5">{src.label} Modpack</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {}
            <button
              onClick={() => setMinimized(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
              title="Thu gọn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19 13H5v-2h14v2z"/>
              </svg>
            </button>
            {}
            <button
              onClick={() => { if (isRunning) handleCancel(); else onClose() }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/8 transition-all"
              title={isRunning ? 'Hủy tải' : 'Đóng'}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {}
          {version && (
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1.5 block">
                Version
              </label>
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{version.version_number}</p>
                  <p className="text-white/35 text-xs mt-0.5">
                    {version.game_versions?.slice(0, 3).join(', ')}
                    {version.loaders?.length > 0 && (
                      <span className="ml-1.5 text-white/25">· {version.loaders.join(', ')}</span>
                    )}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${
                  VERSION_TYPE_STYLE[version.version_type] || 'bg-white/8 text-white/40 border-white/10'
                }`}>
                  {version.version_type}
                </span>
              </div>
            </div>
          )}

          {}

          {!isRunning && !isDone && !isError && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs text-white/40"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <DownloadSimple size={14} weight="duotone" className="flex-shrink-0 mt-0.5 text-violet-400/60" />
              <p>Modpack sẽ được tải xuống và tự động tạo profile mới. Bạn có thể chơi ngay sau khi hoàn tất.</p>
            </div>
          )}

          {}
          {(isRunning || isDone || isError) && (
            <div className="flex flex-col gap-2 px-1">
              <div className="flex items-center justify-between gap-2 min-h-[20px]">
                <span className="text-xs text-white/50 truncate flex-1 min-w-0">{progress?.log}</span>
                <span className="text-xs font-mono font-bold flex-shrink-0 w-10 text-right tabular-nums"
                  style={{ color: isError ? '#f87171' : isDone ? '#a78bfa' : src.color }}>
                  {pct}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: isError ? '#ef4444' : src.color,
                    transition: pct > 0 ? 'width 0.4s ease-out' : 'none',
                  }}
                />
              </div>
              <div className="flex items-center justify-between min-h-[16px]">
                {progress?.total > 0 ? (
                  <p className="text-[10px] text-white/25 tabular-nums">
                    {progress.done ?? 0} / {progress.total} mods
                  </p>
                ) : (
                  <span />
                )}
                {isError && (
                  <p className="text-[10px] text-red-400/70">
                    Kiểm tra kết nối mạng hoặc thử lại.
                  </p>
                )}
              </div>
            </div>
          )}

          {}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { if (isRunning) handleCancel(); else onClose() }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white transition-all border border-white/8 hover:bg-white/5"
            >
              {isDone ? 'Đóng' : isRunning ? 'Hủy tải' : 'Hủy'}
            </button>
            {!isDone && (
              <button
                onClick={handleInstall}
                disabled={isRunning || !version}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${src.color}, ${src.color}cc)`, boxShadow: `0 4px 16px ${src.color}40` }}
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span className="truncate">
                      {progress?.phase === 'mods' && progress?.total > 0
                        ? `Tải mods ${progress.done ?? 0}/${progress.total}`
                        : progress?.phase === 'overrides' ? 'Giải nén...'
                        : 'Đang cài đặt...'}
                    </span>
                  </>
                ) : isError ? (
                  <><DownloadSimple size={15} weight="duotone" /> Thử lại</>
                ) : (
                  <><DownloadSimple size={15} weight="duotone" /> Cài đặt Modpack</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
