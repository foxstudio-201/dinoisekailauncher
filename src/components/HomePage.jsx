import { useState, useRef, useEffect } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import { useLang } from '../i18n/LangProvider'
import { Gear, PlayCircle, Check, User, Sword, Campfire, Mountains, ArrowClockwise } from '@phosphor-icons/react'
import ProfileSettingsPanel from './home/ProfileSettingsPanel'
import GamingModalWrapper from './ui/GamingModalWrapper'
import LogPanel from './LogPanel'
import AppBackground from './AppBackground'
import SystemInfo from './SystemInfo'
import PlayerHead from './ui/PlayerHead'
import { offlineUUID } from '../utils/offlineUUID'
import martianIcon from '../assets/martian-icon.png'
import vanillaIcon from '../assets/loader/vanilla.png'
import fabricIcon from '../assets/loader/fabric.png'
import forgeIcon from '../assets/loader/forge.png'
import neoforgeIcon from '../assets/loader/neoforge.png'

const LOADER_ICONS = {
  vanilla: vanillaIcon,
  fabric: fabricIcon,
  forge: forgeIcon,
  neoforge: neoforgeIcon,
}

const LOADER_COLORS = {
  vanilla:  { primary: '#a78bfa', secondary: '#7c3aed' },
  fabric:   { primary: '#a78bfa', secondary: '#7c3aed' },
  forge:    { primary: '#a78bfa', secondary: '#7c3aed' },
  neoforge: { primary: '#fb7185', secondary: '#e11d48' },
}

function getLoaderTag(p) {
  if (!p) return ''
  if (p.loader === 'vanilla') return 'Vanilla'
  const l = p.loader.charAt(0).toUpperCase() + p.loader.slice(1)
  return p.loaderVersion ? `${l} ${p.loaderVersion}` : l
}

function fmtBytes(b) {
  if (b == null) return '0 MB'
  if (b >= 1024 * 1024 * 1024) return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

export default function HomePage({ launchState, launchError, onLaunch, instances, onKillInstance, onLogPanelOpen }) {
  const { t } = useLang()
  const { accounts, selectedAccount, addAccount, selectAccount } = useAccounts()
  const accountId = selectedAccount?.id
  const [profiles, setProfiles] = useState([])
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const [logPanelVisible, setLogPanelVisible] = useState(false)
  const [logManuallyClosed, setLogManuallyClosed] = useState(false)
  const [persistedLauncherLogs, setPersistedLauncherLogs] = useState([])
  const [predownload, setPredownload] = useState(null)
  const [preDl, setPreDl] = useState(null)
  const preDlStarted = useRef(false)
  const [dSync, setDSync] = useState(null)
  const dSyncChecked = useRef(false)
  const [dataUpdate, setDataUpdate] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameExpanded, setUsernameExpanded] = useState(false)
  const [serverStatus, setServerStatus] = useState(null)
  const newLaunchRef = useRef(false)
  const isElectron = typeof window !== 'undefined' && window.electronAPI
  const initLoaded = useRef(false)
  const usernameRef = useRef(null)

  // Sync input khi selectedAccount thay đổi
  useEffect(() => {
    if (selectedAccount?.username) setUsernameInput(selectedAccount.username)
  }, [selectedAccount?.id])

  useEffect(() => {
    if (usernameExpanded) usernameRef.current?.focus()
  }, [usernameExpanded])

  // Poll trạng thái ping server từ instance
  useEffect(() => {
    if (!isElectron || !window.electronAPI.getServerStatus) return
    let cancelled = false
    const poll = () => {
      window.electronAPI.getServerStatus()
        .then(s => { if (!cancelled) setServerStatus(s || null) })
        .catch(() => { if (!cancelled) setServerStatus(null) })
    }
    poll()
    const id = setInterval(poll, 8000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  useEffect(() => {
    if (!isElectron || !window.electronAPI.onPreDownloadProgress) return
    return window.electronAPI.onPreDownloadProgress(data => {
      setPredownload(prev => prev ? { ...prev, log: data.log, percent: data.percent } : null)
      setPreDl(prev => {
        const phases = { ...(prev?.phases || {}) }
        if (data.phase !== 'done' && data.item) phases[data.phase] = { item: data.item, percent: data.percent ?? 0, eta: data.eta, log: data.log }
        return { active: true, closing: false, phase: data.phase, item: data.item, percent: data.percent ?? 0, eta: data.eta, log: data.log, phases }
      })
      if (data.phase === 'done') {
        setTimeout(() => {
          setPreDl(prev => prev ? { ...prev, closing: true } : prev)
          setTimeout(() => setPreDl(prev => prev ? { ...prev, active: false, closing: false } : prev), 450)
        }, 2500)
      }
    })
  }, [])

  useEffect(() => {
    if (!isElectron || !window.electronAPI.preDownload) return
    if (preDlStarted.current) return
    const pid = profiles[0]?.id
    if (!pid) return
    preDlStarted.current = true
    const t = setTimeout(() => {
      setPreDl({ active: true, phase: 'waiting', item: 'Đang chuẩn bị', percent: 0, eta: null, log: 'Bắt đầu tải tài nguyên trong 3 giây...', phases: {}, closing: false })
      setTimeout(() => {
        window.electronAPI.preDownload({ profileId: pid }).catch(() => {})
      }, 3000)
    }, 2000)
    return () => clearTimeout(t)
  }, [profiles])

  useEffect(() => {
    if (!isElectron || !window.electronAPI.onDataSyncProgress) return
    return window.electronAPI.onDataSyncProgress(data => {
      setDSync(prev => ({ ...(prev || {}), active: true, closing: false, ...data }))
      if (data.phase === 'done') {
        setTimeout(() => {
          setDSync(prev => prev ? { ...prev, closing: true } : prev)
          setTimeout(() => setDSync(prev => prev ? { ...prev, active: false, closing: false } : prev), 450)
        }, 2500)
      }
    })
  }, [])

  // Kiểm tra cập nhật dữ liệu mỗi lần mở launcher → cập nhật trạng thái nút Play
  useEffect(() => {
    if (!isElectron || !window.electronAPI.checkDataSync) return
    if (dSyncChecked.current || profiles.length === 0) return
    dSyncChecked.current = true
    const t = setTimeout(() => {
      window.electronAPI.checkDataSync().then(r => {
        if (r?.ok) setDataUpdate(!!r.hasUpdate)
      }).catch(() => {})
    }, 6000)
    return () => clearTimeout(t)
  }, [profiles])

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.getProfiles().then(data => {
      if (!initLoaded.current) {
        setProfiles(data.profiles || [])
        initLoaded.current = true
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    onLogPanelOpen?.(false)
  }, [onLogPanelOpen])

  async function handleProfileUpdated(updatedProfile) {
    initLoaded.current = true
    if (updatedProfile?.id) {
      setProfiles(prev => {
        const idx = prev.findIndex(p => p.id === updatedProfile.id)
        if (idx !== -1) {
          const arr = [...prev]; arr[idx] = updatedProfile; return arr
        }
        return prev
      })
    } else if (isElectron) {
      try {
        const data = await window.electronAPI.getProfiles()
        setProfiles(data.profiles || [])
      } catch {}
    }
  }

  const currentProfile = profiles[0] || null
  const colors = LOADER_COLORS[currentProfile?.loader] || LOADER_COLORS.vanilla
  const profileIcon = currentProfile?.importIconUrl || LOADER_ICONS[currentProfile?.loader] || vanillaIcon

  // Tìm instance đang chạy của một profile cụ thể
  function getProfileInstance(profileId, accountId) {
    if (!instances || !profileId) return null
    const exact = instances.find(inst =>
      inst.profileId === profileId &&
      inst.state !== 'stopped' &&
      (!accountId || inst.accountId === accountId)
    )
    if (exact) return exact
    // Fallback: bất kỳ instance đang chạy của profile (account có thể lệch nhịp)
    return instances.find(inst =>
      inst.profileId === profileId && inst.state !== 'stopped'
    ) || null
  }

  function getProfileState(profileId, accountId) {
    const inst = getProfileInstance(profileId, accountId)
    if (!inst) return 'idle'
    return inst.state // 'downloading' | 'running' | 'error' | 'stopped'
  }

  function playSelectSound() {}
  function playClickSound() {}

  function handleLaunch(profileId, ramMb, profileName, accountName, serverAddress, explicitAccountId) {
    const pid = profileId || currentProfile?.id
    const p = profiles.find(x => x.id === pid) || currentProfile
    if (!p) return
    const accId = explicitAccountId || selectedAccount?.id
    onLaunch(pid, ramMb || (p.ramGb || 4) * 1024, profileName || p.name, accountName || selectedAccount?.username || '', serverAddress, accId)
  }

  function handleKill(profileId, accountId) {
    const inst = accountId ? getProfileInstance(profileId, accountId) : getProfileInstance(profileId)
    if (!inst || !onKillInstance) return
    onKillInstance(inst.key)
  }

  // Validate + lưu account rồi tự động launch
  async function saveAccountAndLaunch() {
    const name = usernameInput.trim()
    if (!name) {
      setUsernameError('Nhập tên trước!')
      setUsernameExpanded(true)
      return
    }
    if (name.length < 3 || name.length > 16) { setUsernameError('Tên 3–16 ký tự'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) { setUsernameError('Chỉ dùng a-z, 0-9, _'); return }
    setUsernameError('')

    let accId = selectedAccount?.id
    const existing = accounts.find(a => a.username === name && a.type === 'offline')
    if (existing) {
      accId = existing.id
      await selectAccount(existing.id)
    } else {
      const result = await addAccount({ type: 'offline', username: name })
      if (result?.error) { setUsernameError(result.error); return }
      accId = result.id
    }

    syncThenLaunch(undefined, undefined, undefined, name, serverStatus?.server?.ip, accId)
  }

  // Đồng bộ dữ liệu server (khi có bản cập nhật) rồi mới khởi động game
  async function syncThenLaunch(profileId, ramMb, profileName, accountName, serverAddress, accId) {
    if (isElectron && window.electronAPI.runDataSync && dataUpdate) {
      setDSync({ active: true, closing: false, phase: 'check', item: 'Kiểm tra cập nhật', percent: 0, log: 'Có bản cập nhật — đang tải về temp...' })
      await window.electronAPI.runDataSync().catch(() => {})
      setDataUpdate(false)
    }
    handleLaunch(profileId, ramMb, profileName, accountName, serverAddress, accId)
  }

  function handlePlayClick() {
    playClickSound()
    if (playing) {
      handleKill(currentProfile?.id, selectedAccount?.id)
      return
    }
    saveAccountAndLaunch()
  }

  const currentInst = getProfileInstance(currentProfile?.id, selectedAccount?.id)
  const playing = getProfileState(currentProfile?.id, selectedAccount?.id) === 'running'
  const downloading = getProfileState(currentProfile?.id, selectedAccount?.id) === 'downloading'
  const currentProgress = currentInst?.progress

  // Auto-show log panel on new launch, don't auto-hide
  useEffect(() => {
    if (launchState === 'downloading') {
      setLogPanelVisible(true)
      setLogManuallyClosed(false)
      setPersistedLauncherLogs([])
      newLaunchRef.current = true
    } else if (launchState === 'running') {
      newLaunchRef.current = false
    }
  }, [launchState])

  // Persist logs so they survive instance deletion (after game stops)
  useEffect(() => {
    const ll = currentInst?.logs
    if (ll?.length > 0) {
      setPersistedLauncherLogs(ll)
    }
  }, [currentInst?.logs])

  // Display live logs when available, otherwise persisted (from last session)
  const displayLogs = currentInst?.logs || persistedLauncherLogs

  function handleCloseLogPanel() {
    setLogPanelVisible(false)
    setLogManuallyClosed(true)
  }

  function handleReopenLog() {
    setLogPanelVisible(true)
    setLogManuallyClosed(false)
  }

  return (
    <div className="home-enter w-full h-full flex flex-col relative overflow-hidden select-none">
      <AppBackground />

      <style dangerouslySetInnerHTML={{__html:[
        '@property --ca { syntax: \'<angle>\'; inherits: true; initial-value: 0deg; }',
        '.glow-play{position:relative;overflow:visible;border-radius:1rem;--ep:100}',
        '.glow-play .glow-inner{position:relative;z-index:1;border-radius:1rem;background:rgba(20,20,28,0.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
        '.glow-play .glow-btn{display:flex;align-items:center;gap:.5rem;height:3.5rem;padding:0 2rem;background:transparent;border:none;color:#fff;font-weight:700;font-size:1rem;cursor:pointer}',
        '.glow-play .glow-edge{position:absolute;inset:-25px;border-radius:inherit;z-index:0;pointer-events:none;opacity:calc((var(--ep,0) - 30)/70);transition:opacity .12s ease-out;-webkit-mask-image:conic-gradient(from var(--ca,0deg) at center,#000 5%,transparent 15%,transparent 85%,#000 95%);mask-image:conic-gradient(from var(--ca,0deg) at center,#000 5%,transparent 15%,transparent 85%,#000 95%);mix-blend-mode:plus-lighter;animation:glow-rotate 3.5s linear infinite}',
        '.glow-play .glow-edge::before{content:"";position:absolute;inset:25px;border-radius:inherit;box-shadow:0 0 0 1.5px var(--gc),0 0 12px 3px color-mix(in srgb,var(--gc) 45%,transparent),inset 0 0 0 1.5px var(--gc),inset 0 0 10px 0 color-mix(in srgb,var(--gc) 35%,transparent)}',
        '@keyframes glow-rotate{from{--ca:0deg}to{--ca:360deg}}',
        '.home-enter{animation:home-slide-in .5s cubic-bezier(0.22,1,0.36,1) both}',
        '@keyframes home-slide-in{from{opacity:0;transform:translateX(48px)}to{opacity:1;transform:translateX(0)}}',
      ].join('')}} />

      {/* Profile display */}
      <div className="flex-1 flex flex-col justify-center pl-36">
        <SystemInfo />
        <div className="flex items-center gap-6">
          <img src={martianIcon} alt="Dino Isekai" className="w-24 h-24 object-contain drop-shadow-xl" draggable={false} />

          <div className="text-left">
            {/* Server box */}
            <div className="rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 p-6">
              <h1 className="text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
                Dino Isekai Server
              </h1>

              <div className="flex items-center gap-3 mt-4">
                {[
                  { label: 'Fantasy',   Icon: Sword,     color: '#a78bfa' },
                  { label: 'Survival',  Icon: Campfire,  color: '#34d399' },
                  { label: 'Realistic', Icon: Mountains, color: '#60a5fa' },
                ].map(({ label, Icon, color }) => (
                  <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold"
                    style={{ color, borderColor: `${color}55`, background: `${color}1a` }}>
                    <Icon size={15} weight="duotone" />
                    {label}
                  </span>
                ))}
              </div>

              {/* Ping status */}
              <div className="flex items-center gap-3 mt-5">
                {!serverStatus ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-white/25 animate-pulse" />
                    <span className="text-lg font-bold text-white/50">Đang ping...</span>
                  </>
                ) : serverStatus.error ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.8)]" />
                    <span className="text-lg font-bold text-white/70">Offline</span>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,.9)]" />
                    <span className="text-lg font-bold text-white">Online</span>
                    <span className="text-lg font-bold text-emerald-400">{serverStatus.ping} ms</span>
                    <span className="text-sm text-white/50">{serverStatus.players}/{serverStatus.maxPlayers} players</span>
                  </>
                )}
              </div>
            </div>

            {/* Info box */}
            <div className="mt-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 px-5 py-4">
              <p className="text-sm text-white/50">Hỗ trợ Minecraft 1.20.1 · Forge</p>
              <p className="text-sm text-white/50 mt-1">Launcher hiện tại: 1.20.1</p>
            </div>
          </div>

          {/* Log modal — hiện bên cạnh thông tin profile */}
          {logPanelVisible && (
            <LogPanel logs={displayLogs} onClose={handleCloseLogPanel} />
          )}
        </div>
      </div>

      {/* Bottom-right: username + Play + Settings */}
      <div className="absolute bottom-6 right-7 flex flex-col items-end gap-2">
        {usernameError && (
          <p className="text-sm font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg">{usernameError}</p>
        )}
        <div className="flex items-center gap-3">
          {/* Logs — bên trái nút tài khoản */}
          <div
            className={`rounded-2xl overflow-hidden border transition-all active:scale-95 ${
              logPanelVisible
                ? 'bg-violet-500/20 border-violet-400/30'
                : 'border-white/15'
            }`}
            style={{ backgroundColor: logPanelVisible ? undefined : 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          >
            <button
              onClick={() => { logPanelVisible ? handleCloseLogPanel() : handleReopenLog(); playClickSound() }}
              className={`w-14 h-14 flex items-center justify-center transition-colors ${logPanelVisible ? 'text-violet-300' : 'text-white/60 hover:text-white'}`}
              title="Logs"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                <path d="M7 9h10v2H7zm0 3h7v2H7zm0-6h10v2H7z"/>
              </svg>
            </button>
          </div>

          {/* Username: collapsed icon, click to expand */}
          <div className="flex items-center">
            <div className={`flex items-center overflow-hidden rounded-2xl bg-black/60 backdrop-blur-md border transition-all duration-300 ease-out ${
              usernameExpanded
                ? 'max-w-[430px] opacity-100 border-white/15 p-1.5'
                : 'max-w-0 opacity-0 border-transparent p-0 pointer-events-none'
            }`}>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/5 ml-0.5 flex-shrink-0">
                  <PlayerHead
                    uuid={usernameInput.trim().length >= 3 ? offlineUUID(usernameInput.trim()) : null}
                    username={usernameInput.trim() || 'Player'}
                    size={44}
                  />
                </div>
                <input
                  ref={usernameRef}
                  type="text"
                  value={usernameInput}
                  onChange={e => { setUsernameInput(e.target.value); setUsernameError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') saveAccountAndLaunch() }}
                  placeholder="Tên người chơi..."
                  maxLength={16}
                  className="w-52 bg-transparent px-1 py-2.5 text-base text-white placeholder-white/25 focus:outline-none"
                />
                <button
                  onClick={() => { playClickSound(); saveAccountAndLaunch() }}
                  className="w-11 h-11 rounded-xl bg-violet-400 text-black flex items-center justify-center hover:bg-violet-300 transition-all active:scale-95 flex-shrink-0"
                  title="Xác nhận"
                >
                  <Check size={22} weight="bold" />
                </button>
                <button
                  onClick={() => { setUsernameExpanded(false); setUsernameError(''); playClickSound() }}
                  className="w-11 h-11 rounded-xl text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all flex-shrink-0"
                  title="Đóng"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
            </div>
            <div
              className={`rounded-2xl border overflow-hidden transition-all active:scale-95 ${usernameExpanded ? 'ml-2 border-white/15' : 'border-white/15'}`}
              style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            >
              <button
                onClick={() => { setUsernameExpanded(v => !v); playClickSound() }}
                className={`w-14 h-14 flex items-center justify-center transition-colors text-white/70 hover:text-white ${usernameExpanded ? 'ml-0' : ''}`}
                title="Nhập tên người chơi"
              >
                <User size={26} weight="duotone" />
              </button>
            </div>
          </div>

          {/* Play / Kill */}
          {playing ? (
            <button
              onClick={handlePlayClick}
              className="flex items-center gap-2 px-6 h-14 rounded-2xl font-bold text-base transition-all hover:brightness-110 active:scale-95 bg-red-500/80 hover:bg-red-500 text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              {t('homepage.launch.kill')}
            </button>
          ) : downloading ? (
            <button
              disabled
              className="flex items-center gap-2 px-6 h-14 rounded-2xl font-bold text-base text-black/80 cursor-not-allowed"
              style={{ background: colors.primary, opacity: 0.75 }}
            >
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              {currentProgress?.percent != null ? `${currentProgress.percent}%` : '...'}
            </button>
          ) : (
            <div className="glow-play" style={{ '--gc': dataUpdate ? '#a78bfa' : colors.primary }}>
              <span className="glow-edge" />
              <div className="glow-inner">
                <button
                  onClick={handlePlayClick}
                  className="glow-btn transition-transform active:scale-95"
                >
                  {dataUpdate ? (
                    <>
                      <ArrowClockwise size={26} weight="duotone" className="text-violet-400" />
                      <span className="text-violet-200">Update</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle size={26} weight="fill" className="text-violet-400" />
                      <span>{t('gaming.play')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Settings */}
          {currentProfile && (
            <div
              className="rounded-2xl border border-white/15 overflow-hidden transition-all active:scale-95"
              style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            >
              <button
                onClick={() => { setProfileSettingsOpen(true); playClickSound() }}
                className="w-14 h-14 flex items-center justify-center transition-colors text-white/60 hover:text-white"
                title={t('homepage.profile.settings')}
              >
                <Gear size={26} weight="duotone" />
              </button>
            </div>
          )}
        </div>
      </div>

      {preDl?.active && (
        <div className={`absolute bottom-[116px] right-7 w-[380px] ${preDl.closing ? 'preDl-down' : 'preDl-modal'}`}>
          <div className="rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className={`animate-spin w-3.5 h-3.5 ${preDl.phase === 'done' ? 'text-green-400' : 'text-violet-400'}`} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <span className="text-xs font-bold text-white">
                  {preDl.phase === 'done' ? 'Hoàn tất tải tài nguyên' : 'Đang tải tài nguyên'}
                </span>
              </div>
              <button
                onClick={() => setPreDl(prev => prev ? { ...prev, active: false } : prev)}
                className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                title="Đóng"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Message */}
            <p className="text-[12px] font-semibold text-white mt-2 leading-relaxed">{preDl.log}</p>

            {/* Single progress bar — mỗi giai đoạn về 0 rồi chạy lên 100% */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${preDl.phase === 'done' ? 'text-emerald-300' : 'text-white'}`}>
                  {preDl.item || '...'}
                </span>
                <span className="text-white/80 font-mono font-semibold flex items-center gap-2">
                  {preDl.phase !== 'done' && preDl.eta && <span className="text-white/70">còn {preDl.eta}</span>}
                  {Math.round(preDl.percent || 0)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, preDl.percent || 0))}%`, background: preDl.phase === 'done' ? '#34d399' : '#a78bfa' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {dSync?.active && (
        <div className={`absolute bottom-[116px] right-7 w-[380px] ${dSync.closing ? 'preDl-down' : 'preDl-modal'}`}>
          <div className="rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className={`animate-spin w-3.5 h-3.5 ${dSync.phase === 'done' ? 'text-green-400' : 'text-violet-400'}`} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <span className="text-xs font-bold text-white">
                  {dSync.phase === 'done' ? 'Hoàn tất đồng bộ dữ liệu' : 'Đồng bộ dữ liệu server'}
                </span>
              </div>
              <button
                onClick={() => setDSync(prev => prev ? { ...prev, active: false } : prev)}
                className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                title="Đóng"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Message */}
            <p className="text-[12px] font-semibold text-white mt-2 leading-relaxed">{dSync.log}</p>

            {/* Current phase */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${dSync.phase === 'done' ? 'text-emerald-300' : 'text-white'}`}>
                  {dSync.item || '...'}
                </span>
                <span className="text-white/80 font-mono font-semibold">{Math.round(dSync.percent || 0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, dSync.percent || 0))}%`, background: dSync.phase === 'done' ? '#34d399' : '#a78bfa' }} />
              </div>
              {dSync.downloaded != null && (
                <p className="text-[11px] font-medium text-white/80 mt-1.5 font-mono">
                  Đã tải: {fmtBytes(dSync.downloaded)} / {fmtBytes(dSync.total)} {dSync.done != null && dSync.total != null && dSync.phase === 'sync' ? `(${dSync.done}/${dSync.total} files)` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {profileSettingsOpen && currentProfile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[150] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setProfileSettingsOpen(false) }}
        >
          <GamingModalWrapper
            onClose={() => setProfileSettingsOpen(false)}
            className="border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]"
            style={{ background: 'rgba(14,14,14,0.98)' }}
          >
            <ProfileSettingsPanel
              profile={currentProfile}
              accountId={accountId}
              onClose={() => setProfileSettingsOpen(false)}
              onProfileUpdated={handleProfileUpdated}
            />
          </GamingModalWrapper>
        </div>
      )}
    </div>
  )
}
