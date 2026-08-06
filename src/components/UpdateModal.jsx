import { useEffect, useState } from 'react'

const isElectron = typeof window !== 'undefined' && window.electronAPI

function fmtBytes(b) {
  if (b == null) return '0 MB'
  if (b >= 1024 * 1024 * 1024) return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

export default function UpdateModal() {
  const [state, setState] = useState(null) // null | {phase:'checking'} | {phase:'downloading',...} | {phase:'ready',installerPath} | {phase:'error',message}
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isElectron || !window.electronAPI.checkUpdate) return
    let cancelled = false
    let unsub = null

    window.electronAPI.checkUpdate().then(r => {
      if (cancelled) return
      if (!r?.ok || !r.supported || !r.hasUpdate) return
      setState({ phase: 'downloading', update: r, percent: 0, downloaded: 0, total: r.assetSize, log: 'Đang tải bản cập nhật...' })
      window.electronAPI.downloadUpdate().then(res => {
        if (cancelled) return
        if (res?.ok) {
          setState(s => ({ ...s, phase: 'ready', installerPath: res.installerPath, log: 'Đã tải xong — đang tự động cài đặt...' }))
          // Tự động chạy cập nhật launcher ngay sau khi tải xong
          window.electronAPI.installUpdate(res.installerPath)
        } else {
          setState(s => ({ ...s, phase: 'error', log: 'Tải cập nhật thất bại.' }))
        }
      }).catch(() => {
        if (!cancelled) setState(s => s ? { ...s, phase: 'error', log: 'Tải cập nhật thất bại.' } : null)
      })
    }).catch(() => {})

    if (window.electronAPI.onUpdateProgress) {
      unsub = window.electronAPI.onUpdateProgress(p => {
        setState(s => s ? {
          ...s,
          phase: 'downloading',
          downloaded: p.downloaded ?? 0,
          total: p.total ?? s.total,
          percent: p.total ? Math.round((p.downloaded / p.total) * 100) : 0,
          log: `Đang tải bản cập nhật v${p.version}...`,
        } : s)
      })
    }
    return () => { cancelled = true; unsub?.() }
  }, [])

  if (!state || dismissed) return null

  function handleInstall() {
    if (state.phase !== 'ready' || !state.installerPath) return
    window.electronAPI.installUpdate(state.installerPath)
  }

  const title = state.phase === 'ready' ? 'Sẵn sàng cài đặt'
    : state.phase === 'error' ? 'Lỗi cập nhật'
    : 'Có bản cập nhật mới'

  return (
    <div className="fixed top-14 right-4 z-[10000] w-[340px] blur-glass update-in">
      <div className="rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className={`animate-spin w-3.5 h-3.5 ${state.phase === 'ready' ? 'text-green-400' : 'text-violet-400'}`} viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <span className="text-xs font-bold text-white">{title}</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
            title="Đóng"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Message */}
        <p className="text-[12px] font-semibold text-white mt-2 leading-relaxed">{state.log}</p>

        {/* Progress */}
        {state.phase === 'downloading' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">
                v{state.update?.latest}
              </span>
              <span className="text-white/80 font-mono font-semibold">{Math.round(state.percent || 0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, state.percent || 0))}%`, background: '#a78bfa' }} />
            </div>
            <p className="text-[11px] font-medium text-white/80 mt-1.5 font-mono">
              Đã tải: {fmtBytes(state.downloaded)} / {fmtBytes(state.total)}
            </p>
          </div>
        )}

        {/* Install / retry button (fallback nếu tự cài không chạy) */}
        {(state.phase === 'ready' || state.phase === 'error') && (
          <button
            onClick={state.phase === 'ready' ? handleInstall : undefined}
            disabled={state.phase === 'error'}
            className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition-all ${
              state.phase === 'ready'
                ? 'bg-violet-500 text-white hover:bg-violet-400'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {state.phase === 'ready' ? 'Cài đặt & Khởi động lại' : 'Thử lại khi mở app'}
          </button>
        )}
      </div>
    </div>
  )
}
