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
import { useAccounts } from '../hooks/useAccounts'
import PlayerHead from './ui/PlayerHead'

const isElectron = typeof window !== 'undefined' && window.electronAPI

function InstanceModal({ instances, onKill, onClose }) {
  const runningInstances = instances.filter(i => i.state === 'running' || i.state === 'downloading')

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-12"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {}
      <div className="relative z-10 w-[420px] bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
        {}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">Running Instances</h3>
            <span className="text-xs text-white/30 bg-white/8 px-1.5 py-0.5 rounded-md font-mono">
              {runningInstances.length}
            </span>
          </div>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/8 transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {}
        <div className="px-3 py-3 flex flex-col gap-2 max-h-80 overflow-y-auto">
          {instances.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-6">No instances running</p>
          ) : (
            instances.map(inst => {
              const isRunning = inst.state === 'running'
              const isLoading = inst.state === 'downloading'
              const isStopped = inst.state === 'stopped'
              const isError   = inst.state === 'error'

              return (
                <div key={inst.key}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/5">
                  {}
                  <div className="flex-shrink-0">
                    {isRunning && <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse block" />}
                    {isLoading && (
                      <svg className="animate-spin w-2.5 h-2.5 text-yellow-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    )}
                    {isStopped && <span className="w-2.5 h-2.5 rounded-full bg-white/20 block" />}
                    {isError   && <span className="w-2.5 h-2.5 rounded-full bg-red-400 block" />}
                  </div>

                  {}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{inst.profileName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-white/35">@{inst.accountName}</span>
                      <span className="text-[10px] text-white/20">·</span>
                      <span className={`text-[10px] font-semibold ${
                        isRunning ? 'text-violet-400' :
                        isLoading ? 'text-yellow-400' :
                        isStopped ? 'text-white/30' : 'text-red-400'
                      }`}>
                        {isRunning ? 'Running' : isLoading ? 'Loading...' : isStopped ? 'Stopped' : 'Error'}
                      </span>
                      {isLoading && inst.progress?.percent > 0 && (
                        <span className="text-[10px] text-white/25 font-mono">{inst.progress.percent}%</span>
                      )}
                    </div>
                  </div>

                  {}
                  {(isRunning || isLoading) && (
                    <button
                      onClick={() => onKill(inst.key)}
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-all active:scale-95"
                      title="Kill instance"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                      Kill
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default function TitleBar({ instances = [], onKillInstance, onCloseRequest }) {
  const [showModal, setShowModal] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [pending, setPending]     = useState([])
  const notifRef = useRef(null)
  const { selectedAccount } = useAccounts()
  const myUuid = selectedAccount?.uuid

  
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  function handleAccept(fromUuid) {
    setPending(p => p.filter(r => r.fromUuid !== fromUuid))
  }
  function handleReject(fromUuid) {
    setPending(p => p.filter(r => r.fromUuid !== fromUuid))
  }

  const handleMinimize = () => isElectron && window.electronAPI.minimizeWindow()
  const handleMaximize = () => isElectron && window.electronAPI.maximizeWindow()
  const handleClose    = () => { if (isElectron) { if (onCloseRequest) onCloseRequest(); else window.electronAPI.closeWindow() } }

  const runningCount = instances.filter(i => i.state === 'running' || i.state === 'downloading').length

  return (
    <>
      <div className="drag-region flex items-center justify-between h-9 px-4 absolute top-0 left-0 right-0 z-50">
        {}
        <div className="flex items-center gap-2 no-drag">
        </div>

        {}
        <div className="absolute left-1/2 -translate-x-1/2 no-drag">
          {runningCount > 0 ? (
            <button
              onClick={() => setShowModal(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs font-semibold hover:bg-violet-500/22 transition-all active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              {runningCount} instance{runningCount > 1 ? 's' : ''} running
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-violet-400/60">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
          ) : instances.length > 0 ? (
            <button
              onClick={() => setShowModal(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/30 text-xs hover:bg-white/8 transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              {instances.length} instance{instances.length > 1 ? 's' : ''}
            </button>
          ) : null}
        </div>

        {}
        <div className="no-drag flex items-center gap-1">
          <button onClick={handleMinimize}
            data-tip="Minimize"
            className="w-8 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white/90">
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"/></svg>
          </button>
          <button onClick={handleClose}
            data-tip="Close"
            className="w-8 h-7 flex items-center justify-center rounded hover:bg-red-500/80 transition-colors text-white/50 hover:text-white">
            <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5">
              <line x1="0" y1="0" x2="10" y2="10"/>
              <line x1="10" y1="0" x2="0" y2="10"/>
            </svg>
          </button>
        </div>
      </div>

      {}
      {showModal && (
        <InstanceModal
          instances={instances}
          onKill={(key) => { onKillInstance?.(key) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

