import { useState, useRef, useEffect } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import { useLang } from '../i18n/LangProvider'
import { Gear, PlayCircle, Check, User, Sword, Campfire, Mountains, ArrowClockwise, FolderOpen, SlidersHorizontal, Memory, GraphicsCard, BookOpen, Gauge } from '@phosphor-icons/react'
import ProfileSettingsPanel from './home/ProfileSettingsPanel'
import GamingModalWrapper from './ui/GamingModalWrapper'
import LogPanel from './LogPanel'
import DownloadErrorModal from './DownloadErrorModal'
import ProfileFilesModal from './ProfileFilesModal'
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

function fmtEta(ms) {
  if (ms == null || !isFinite(ms) || ms < 0) return null
  const s = Math.round(ms / 1000)
  if (s < 60) return `~${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `~${m}p ${s % 60}s`
  return `~${Math.floor(m / 60)}g ${m % 60}p`
}

function fmtSpeed(bps) {
  if (bps == null || !isFinite(bps) || bps <= 0) return '0 KB'
  if (bps >= 1024 * 1024 * 1024) return (bps / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  if (bps >= 1024 * 1024) return (bps / 1024 / 1024).toFixed(1) + ' MB'
  return (bps / 1024).toFixed(0) + ' KB'
}

const INTRO_VI = 'Bạn bị một luồng sáng dịch chuyển và đưa bạn vào thế giới lạ, nơi đây đầy dãy quái vật mạnh mẽ, nhưng không vì thế, bạn tỉnh dậy ở nơi gọi là Hư Không, và gặp được một ông lão. Ông lão nói rằng "Chào mừng ngươi đến với thế giới này, ta là Bụi Tiên..." Và rồi sau đó bạn nhận lấy một vật phẩm từ người này và bắt đầu cuộc hành trình chinh phục thế giới mới. Bạn được chọn một nơi để sinh sống, ở đó bạn gặp được dân làng lương thiện. Tuy nhiên mọi thứ sẽ bắt đầu từ đây.....'

const INTRO_EN = 'You suddenly find yourself transported to a strange world, teeming with powerful monsters, but you are not afraid. You wake up in a place called the Void and meet an old man, who says: "Welcome to this world, I am the Fairy Dust..." Then you receive an item from him and begin your journey to conquer this new world. You get to choose a place to live, where you meet kind-hearted villagers. However, everything begins from here.....'

export default function HomePage({ launchState, launchError, onLaunch, instances, onKillInstance, onLogPanelOpen }) {
  const { t, lang } = useLang()
  const { accounts, selectedAccount, addAccount, selectAccount } = useAccounts()
  const accountId = selectedAccount?.id
  const [profiles, setProfiles] = useState([])
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [filesModalOpen, setFilesModalOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const [profileTab, setProfileTab] = useState('intro')
  const [typedIntro, setTypedIntro] = useState('')
  const introRef = useRef(null)
  const introText = lang?.startsWith('vi') ? INTRO_VI : INTRO_EN

  // Đánh chữ từng chữ giới thiệu (chỉ theo ngôn ngữ launcher)
  useEffect(() => {
    let i = 0
    let cancelled = false
    const iv = setInterval(() => {
      i++
      setTypedIntro(introText.slice(0, i))
      if (i >= introText.length) clearInterval(iv)
    }, 45)
    return () => { cancelled = true; clearInterval(iv) }
  }, [introText])

  // Tự động cuộn xuống theo chữ mới
  useEffect(() => {
    if (introRef.current) introRef.current.scrollTop = introRef.current.scrollHeight
  }, [typedIntro])

  useEffect(() => {
    if (!profileMenuOpen) return
    function onDown(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setProfileMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [profileMenuOpen])
  const [logPanelVisible, setLogPanelVisible] = useState(false)
  const [logManuallyClosed, setLogManuallyClosed] = useState(false)
  const [persistedLauncherLogs, setPersistedLauncherLogs] = useState([])
  const [predownload, setPredownload] = useState(null)
  const [preDl, setPreDl] = useState(null)
  const preDlStarted = useRef(false)
  const [dSync, setDSync] = useState(null)
  const dSyncChecked = useRef(false)
  const [dataUpdate, setDataUpdate] = useState(false)
  const [dataUpdateVer, setDataUpdateVer] = useState('')
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
      if (data.phase === 'paused') setPausedOp('preDl')
      else if (data.phase === 'cancelled') setPausedOp(null)
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
        window.electronAPI.preDownload({ profileId: pid })
          .then(res => {
            if (res && res.ok === false && !res.paused) {
              setDlError({ type: 'resource', message: res.error || 'Lỗi tải tài nguyên' })
              return
            }
            // Tài nguyên xong → nếu chưa có dữ liệu gốc (dinostatedata) thì tự tải luôn
            window.electronAPI.checkBaseData?.().then(r => {
              if (r?.ok && !r.installed) {
                setDSync({ active: true, closing: false, phase: 'check', item: 'Dữ liệu gốc', percent: 0, log: 'Tự động tải dữ liệu gốc lần đầu...' })
                window.electronAPI.runBaseDataSync?.().catch(() => {})
              }
            }).catch(() => {})
          })
          .catch(() => {})
      }, 3000)
    }, 2000)
    return () => clearTimeout(t)
  }, [profiles])

  useEffect(() => {
    if (!isElectron || !window.electronAPI.onDataSyncProgress) return
    return window.electronAPI.onDataSyncProgress(data => {
      if (data.phase === 'paused') setPausedOp('dSync')
      else if (data.phase === 'cancelled') setPausedOp(null)
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
        if (r?.ok) { setDataUpdate(!!r.hasUpdate); setDataUpdateVer(r.hasUpdate ? r.latest : '') }
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
      // id của account offline = offlineUUID(username); select để chắc chắn dùng tên mới
      accId = offlineUUID(name)
      await selectAccount(accId)
    }

    syncThenLaunch(undefined, undefined, undefined, name, serverStatus?.server?.ip, accId)
  }

  // Đồng bộ dữ liệu server (khi có bản cập nhật) rồi mới khởi động game
  async function syncThenLaunch(profileId, ramMb, profileName, accountName, serverAddress, accId) {
    if (isElectron && window.electronAPI.runDataSync && dataUpdate) {
      setDSync({ active: true, closing: false, phase: 'check', item: 'Kiểm tra cập nhật', percent: 0, log: 'Có bản cập nhật — đang tải về temp...' })
      const res = await window.electronAPI.runDataSync().catch(() => null)
      if (res && res.ok === false) {
        if (res.paused) return // tạm dừng — không launch, người dùng bấm Play để tiếp tục
        setDataUpdate(false)
        setDlError({ type: 'data', message: res.error || 'Lỗi tải dữ liệu server' })
        return // LỖI → không tự động khởi động game
      }
      setDataUpdate(false)
      // Có file bị bỏ qua (EPERM...) → vẫn hiện modal báo lỗi file nhưng vẫn chạy game
      if (res && res.skippedFiles && res.skippedFiles.length) {
        const list = res.skippedFiles.slice(0, 20).map(s => `• ${s.file} (${s.error})`).join('\n')
        const more = res.skippedFiles.length > 20 ? `\n... còn ${res.skippedFiles.length - 20} file nữa` : ''
        setDlError({ type: 'data', message: `Một số file bị lỗi quyền và đã được bỏ qua (${res.skippedFiles.length}):\n${list}${more}` })
      }
    }
    handleLaunch(profileId, ramMb, profileName, accountName, serverAddress, accId)
  }

  // Đang tải tài nguyên / tải file GitHub → chặn nút Play/Update
  const busyDownloading = (preDl?.active && !preDl.closing) || (dSync?.active && !dSync.closing)

  // Tiến trình tổng (0-100) + ETA toàn bộ
  const preDlPhases = preDl?.phases ? Object.values(preDl.phases) : []
  const preDlTotal = preDlPhases.length
    ? preDlPhases.reduce((s, p) => s + (p.percent || 0), 0) / preDlPhases.length
    : (preDl?.percent || 0)
  const overallPct = dSync?.active && !dSync.closing
    ? (dSync.percent || 0)
    : (preDl?.active && !preDl.closing ? preDlTotal : 0)
  const busyStartRef = useRef(null)
  const [pausedOp, setPausedOp] = useState(null)
  const [dlError, setDlError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)
  useEffect(() => {
    if (busyDownloading && !busyStartRef.current) busyStartRef.current = Date.now()
    if (!busyDownloading) { busyStartRef.current = null; setPausedOp(null) }
  }, [busyDownloading])
  let overallEta = null
  if (busyDownloading && busyStartRef.current && overallPct > 2 && overallPct < 100) {
    const elapsed = Date.now() - busyStartRef.current
    overallEta = fmtEta(Math.round((elapsed / overallPct) * (100 - overallPct)))
  }

  const activeOp = pausedOp
    || (dSync?.active && !dSync.closing ? 'dSync' : null)
    || (preDl?.active && !preDl.closing ? 'preDl' : null)
  const isPaused = pausedOp && busyDownloading
  const isPausedAny = pausedOp != null

  function showSuccessToast(msg) {
    setSuccessToast(msg)
    clearTimeout(showSuccessToast._t)
    showSuccessToast._t = setTimeout(() => setSuccessToast(null), 3000)
  }

  function togglePause() {
    if (isPaused) {
      // Resume: chạy lại tác vụ (tiếp tục từ phần đã tải)
      setPausedOp(null)
      if (pausedOp === 'preDl' && window.electronAPI.preDownload) {
        window.electronAPI.preDownload({ profileId: currentProfile?.id }).catch(() => {})
      } else if (pausedOp === 'dSync' && window.electronAPI.runDataSync) {
        window.electronAPI.runDataSync().catch(() => {})
      }
      return
    }
    if (!activeOp) return
    window.electronAPI.dataControl?.({ op: activeOp, action: 'pause' })
    setPausedOp(activeOp)
  }

  function handlePlayClick() {
    if (busyDownloading) { togglePause(); return }
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
      <div className="flex-1 flex flex-col justify-center pl-36 gap-6">
        <SystemInfo />
        <div className="flex items-start gap-6">
          {/* Cột trái: logo + 2 nút tab */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <img src={martianIcon} alt="Dino Isekai" className="w-24 h-24 object-contain drop-shadow-xl" draggable={false} />

            <button
              onClick={() => setProfileTab('intro')}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                profileTab === 'intro' ? 'border-violet-400/40 text-violet-300 bg-violet-500/15' : 'border-white/15 text-white/50 hover:text-white hover:bg-white/10'
              }`}
              style={{ backgroundColor: profileTab === 'intro' ? undefined : 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
              data-tip="Giới thiệu"
            >
              <BookOpen size={22} weight="duotone" />
            </button>

            <button
              onClick={() => setProfileTab('config')}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                profileTab === 'config' ? 'border-violet-400/40 text-violet-300 bg-violet-500/15' : 'border-white/15 text-white/50 hover:text-white hover:bg-white/10'
              }`}
              style={{ backgroundColor: profileTab === 'config' ? undefined : 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
              data-tip="Cấu hình"
            >
              <Gauge size={22} weight="duotone" />
            </button>
          </div>

            <div className="text-left">
              {/* Server box — luôn hiện */}
              <div className="rounded-2xl blur-glass bg-black/10 backdrop-blur-[2px] border border-white/10 p-6">
                <h1 className="text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
                  Dino Isekai Server
                </h1>

                <div className="flex items-center gap-3 mt-4">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold"
                    style={{ color: '#facc15', borderColor: '#facc1555', background: '#facc151a' }}>
                    Forge 1.20.1
                  </span>
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

              {/* Cấu hình — hiện khi ấn nút Gauge */}
              {profileTab === 'config' && (
              <div className="mt-4 rounded-2xl blur-glass bg-black/10 backdrop-blur-[2px] border border-white/10 px-5 py-4">
                <p className="text-sm text-white/50">Launcher hiện tại: 1.20.1</p>

                <div className="h-px bg-white/10 my-3" />
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Yêu cầu cấu hình</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white/60 flex-shrink-0">Tối thiểu</span>
                    <Memory size={14} weight="duotone" className="text-cyan-400 flex-shrink-0" />
                    <span className="text-[11px] text-white/70">4GB RAM</span>
                    <GraphicsCard size={14} weight="duotone" className="text-emerald-400 ml-1 flex-shrink-0" />
                    <span className="text-[11px] text-white/70">Intel HD Graphics 500+</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 flex-shrink-0">Đề xuất</span>
                    <Memory size={14} weight="duotone" className="text-cyan-400 flex-shrink-0" />
                    <span className="text-[11px] text-white/70">12GB RAM</span>
                    <GraphicsCard size={14} weight="duotone" className="text-emerald-400 ml-1 flex-shrink-0" />
                    <span className="text-[11px] text-white/70">RTX 2060+</span>
                  </div>
                </div>
              </div>
              )}

              {/* Giới thiệu — hiện khi ấn nút BookOpen */}
              {profileTab === 'intro' && (
              <div className="mt-4 max-w-[500px]">
                <div className="rounded-2xl blur-glass bg-black/10 backdrop-blur-[2px] border border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-violet-300">
                      {lang?.startsWith('vi') ? 'Giới thiệu' : 'Introduction'}
                    </span>
                  </div>
                  <div
                    ref={introRef}
                    className="h-20 overflow-y-auto text-[12px] leading-relaxed text-white/80 whitespace-pre-wrap"
                    style={{ scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
                  >
                    {typedIntro}
                    <span className="inline-block w-[2px] h-3.5 bg-violet-300/80 align-middle animate-pulse ml-0.5" />
                  </div>
                </div>
              </div>
              )}
            </div>

          {/* Log — luôn giữ chỗ cố định để không dịch layout khi mở/đóng */}
          <div className="w-[420px] h-[400px] flex-shrink-0">
            {logPanelVisible && (
              <LogPanel logs={displayLogs} onClose={handleCloseLogPanel} />
            )}
          </div>
          </div>
        </div>

      {/* Bottom-right: username + Play + Settings */}
      <div className="absolute bottom-6 right-7 flex flex-col items-end gap-2">
        {successToast && (
          <p className="text-sm font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg shadow-lg">{successToast}</p>
        )}
        {usernameError && (
          <p className="text-sm font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg">{usernameError}</p>
        )}
        <div className="flex items-center gap-3">
          {/* Kiểm tra cập nhật data — bên trái nút tài khoản */}
          <div
            className="rounded-2xl blur-glass overflow-hidden border border-white/15 transition-all active:scale-95"
            style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          >
            <button
              onClick={() => {
                playClickSound()
                window.electronAPI.checkDataSync?.().then(r => {
                  if (r?.ok && r.hasUpdate) {
                    setDataUpdate(true)
                    setDataUpdateVer(r.latest || '')
                    showSuccessToast(`Có bản cập nhật dữ liệu mới (${r.latest}).`)
                  } else if (r?.ok && !r.hasUpdate) {
                    setDataUpdate(false)
                    setDataUpdateVer('')
                    showSuccessToast(`Dữ liệu đã mới nhất (${r.latest}).`)
                  } else if (!r?.ok) {
                    setDlError({ type: 'data', message: r?.error || 'Không kiểm tra được bản cập nhật' })
                  }
                }).catch(() => {
                  setDlError({ type: 'data', message: 'Không kết nối được để kiểm tra cập nhật.' })
                })
              }}
              className="w-14 h-14 flex items-center justify-center transition-colors text-emerald-400 hover:text-white"
              data-tip="Kiểm tra cập nhật dữ liệu"
            >
              <ArrowClockwise size={26} weight="duotone" />
            </button>
          </div>

          {/* Username: icon + phần nhập nằm chung một khối mở rộng */}
          <div className="flex items-center">
            <div
              className={`flex items-center blur-glass overflow-hidden rounded-2xl border transition-all duration-300 ${
                usernameExpanded ? 'border-white/15' : 'border-white/15'
              }`}
              style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            >
              <button
                onClick={() => { setUsernameExpanded(v => !v); playClickSound() }}
                className="w-14 h-14 flex items-center justify-center flex-shrink-0 transition-colors text-white/70 hover:text-white rounded-l-2xl overflow-hidden"
                data-tip="Nhập tên người chơi"
              >
                {usernameInput.trim().length >= 3 ? (
                  <PlayerHead uuid={offlineUUID(usernameInput.trim())} username={usernameInput.trim()} size={56} />
                ) : (
                  <User size={26} weight="duotone" />
                )}
              </button>

              {/* Phần nhập mở rộng ra từ nút */}
              <div className={`flex items-center gap-2 whitespace-nowrap overflow-hidden transition-all duration-700 ease-out ${
                usernameExpanded ? 'max-w-[430px] opacity-100 px-1.5' : 'max-w-0 opacity-0'
              }`}>
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
                  data-tip="Xác nhận"
                >
                  <Check size={22} weight="bold" />
                </button>
                <button
                  onClick={() => { setUsernameExpanded(false); setUsernameError(''); playClickSound() }}
                  className="w-11 h-11 rounded-xl text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all flex-shrink-0"
                  data-tip="Đóng"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
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
            <div className="glow-play" style={{ '--gc': isPaused ? '#f59e0b' : (dataUpdate ? '#a78bfa' : colors.primary) }}>
              <span className="glow-edge" />
              <div className="glow-inner">
                <button
                  onClick={handlePlayClick}
                  disabled={busyDownloading}
                  className="glow-btn transition-transform active:scale-95"
                >
                  {busyDownloading ? (
                    isPaused ? (
                      <>
                        <PlayCircle size={26} weight="fill" className="text-amber-400" />
                        <span className="text-amber-300">Tiếp tục</span>
                      </>
                    ) : (
                      <>
                        <div className="relative w-9 h-9 flex-shrink-0">
                          <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                            <circle cx="18" cy="18" r="15" fill="none" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 15}`}
                              strokeDashoffset={`${2 * Math.PI * 15 * (1 - (overallPct || 0) / 100)}`}
                              style={{ transition: 'stroke-dashoffset .3s ease' }} />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                            {Math.round(overallPct || 0)}%
                          </span>
                        </div>
                        <span className="text-left leading-tight">
                          <span className="block text-xs font-bold text-white">Đang tải...</span>
                          {overallEta && <span className="block text-[10px] text-white/60">còn {overallEta}</span>}
                        </span>
                      </>
                    )
                  ) : dataUpdate ? (
                    <>
                      <ArrowClockwise size={26} weight="duotone" className="text-violet-400 spin-pulse" />
                      <span className="text-violet-200">Update {dataUpdateVer}</span>
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

          {/* Profile menu — open up: thư mục profile + profile settings */}
          {currentProfile && (
            <div className="relative" ref={profileMenuRef}>
              {/* Menu popup: 2 nút icon riêng biệt */}
              <div
                className={`absolute bottom-full mb-2 right-0 z-[80] flex flex-col items-end gap-2 transition-all duration-200 origin-bottom-right ${
                  profileMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
                }`}
              >
                <button
                  onClick={() => { setFilesModalOpen(true); setProfileMenuOpen(false); playClickSound() }}
                  className="w-14 h-14 blur-glass rounded-2xl border border-white/15 flex items-center justify-center transition-colors text-cyan-400 hover:text-white hover:bg-white/10"
                  style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                  data-tip="Quản lý file profile"
                >
                  <FolderOpen size={26} weight="duotone" />
                </button>
                <button
                  onClick={() => { logPanelVisible ? handleCloseLogPanel() : handleReopenLog(); playClickSound(); setProfileMenuOpen(false) }}
                  className={`w-14 h-14 blur-glass rounded-2xl border flex items-center justify-center transition-colors ${
                    logPanelVisible ? 'border-violet-400/30 text-violet-300 bg-violet-500/15' : 'border-white/15 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  style={{ backgroundColor: logPanelVisible ? undefined : 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                  data-tip="Mở log"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                    <path d="M7 9h10v2H7zm0 3h7v2H7zm0-6h10v2H7z"/>
                  </svg>
                </button>
                <button
                  onClick={() => { setProfileSettingsOpen(true); setProfileMenuOpen(false); playClickSound() }}
                  className="w-14 h-14 blur-glass rounded-2xl border border-white/15 flex items-center justify-center transition-colors text-violet-400 hover:text-white hover:bg-white/10"
                  style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                  data-tip="Mở profile settings"
                >
                  <Gear size={26} weight="duotone" />
                </button>
              </div>

              {/* Menu toggle */}
              <div
                className="rounded-2xl blur-glass border border-white/15 overflow-hidden transition-all active:scale-95"
                style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
              >
                <button
                  onClick={() => { setProfileMenuOpen(v => !v); playClickSound() }}
                  className="w-14 h-14 flex items-center justify-center transition-colors text-white/70 hover:text-white"
                  data-tip="Menu profile"
                >
                  <SlidersHorizontal size={26} weight="duotone" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {preDl?.active && (
        <div className={`absolute bottom-[116px] right-7 w-[380px] ${preDl.closing ? 'preDl-down' : 'preDl-modal'}`}>
          <div className="rounded-2xl bg-[#12101c] border border-white/10 p-4">
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
                onClick={() => { window.electronAPI.dataControl?.({ op: 'preDl', action: 'cancel' }); setPausedOp(null); setPreDl(prev => prev ? { ...prev, active: false } : prev) }}
                className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                data-tip="Đóng"
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
                <div className="h-full rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${Math.max(0, Math.min(100, preDl.percent || 0))}%`, background: preDl.phase === 'done' ? '#34d399' : '#a78bfa' }}>
                  {preDl.phase !== 'done' && preDl.phase !== 'paused' && (
                    <span className="progress-shine absolute inset-0" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {dSync?.active && (
        <div className={`absolute bottom-[116px] right-7 w-[380px] ${dSync.closing ? 'preDl-down' : 'preDl-modal'}`}>
          <div className="rounded-2xl bg-[#12101c] border border-white/10 p-4">
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
                onClick={() => { window.electronAPI.dataControl?.({ op: 'dSync', action: 'cancel' }); setPausedOp(null); setDSync(prev => prev ? { ...prev, active: false } : prev) }}
                className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                data-tip="Đóng"
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
              {dSync.phase === 'extract' ? (
                <div className="flex items-center gap-2 text-xs">
                  <svg className="animate-spin w-3.5 h-3.5 text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  <span className="font-bold text-white">{dSync.item || 'Giải nén'}</span>
                  <span className="text-white/60">— Xin vui lòng chờ...</span>
                </div>
              ) : (
              <>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${dSync.phase === 'done' ? 'text-emerald-300' : 'text-white'}`}>
                  {dSync.item || '...'}
                </span>
                <span className="text-white/80 font-mono font-semibold">{Math.round(dSync.percent || 0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div className="h-full rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${Math.max(0, Math.min(100, dSync.percent || 0))}%`, background: dSync.phase === 'done' ? '#34d399' : '#a78bfa' }}>
                  {dSync.phase !== 'done' && dSync.phase !== 'paused' && (
                    <span className="progress-shine absolute inset-0" />
                  )}
                </div>
              </div>
              {dSync.downloaded != null && (
                <p className="text-[11px] font-medium text-white/80 mt-1.5 font-mono">
                  Đã tải: {fmtBytes(dSync.downloaded)} / {fmtBytes(dSync.total)} {dSync.done != null && dSync.total != null && dSync.phase === 'sync' ? `(${dSync.done}/${dSync.total} files)` : ''}
                  {dSync.speed != null && dSync.speed > 0 && dSync.phase === 'download' && (
                    <span className="text-emerald-300"> · {fmtSpeed(dSync.speed)}/s</span>
                  )}
                </p>
              )}
              </>
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

      <DownloadErrorModal error={dlError} onClose={() => setDlError(null)} />
      {filesModalOpen && currentProfile && (
        <ProfileFilesModal profile={currentProfile} onClose={() => setFilesModalOpen(false)} />
      )}
    </div>
  )
}
