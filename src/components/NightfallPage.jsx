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
import { useState, useRef, useEffect } from 'react'
import { PlayCircle, Check, User, ArrowClockwise, Gear, FolderOpen, SlidersHorizontal, Wrench } from '@phosphor-icons/react'
import { useAccounts } from '../hooks/useAccounts'
import { useLang } from '../i18n/LangProvider'
import ProfileSettingsPanel from './home/ProfileSettingsPanel'
import GamingModalWrapper from './ui/GamingModalWrapper'
import DownloadErrorModal from './DownloadErrorModal'
import PlayerHead from './ui/PlayerHead'
import LogPanel from './LogPanel'
import ProfileFilesModal from './ProfileFilesModal'
import OptionsModal from './OptionsModal'
import { offlineUUID } from '../utils/offlineUUID'
import nightfallIcon from '../assets/nightfall-icon.gif'
import nightfallTrailer from '../assets/nightfall-trailer.mp4'

const NIGHTFALL_PROFILE_NAME = 'NightfallCraft - The Casket of Reveries'

function fmtBytes(b) {
  if (b == null) return '0 MB'
  if (b >= 1024 * 1024 * 1024) return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

function fmtSpeed(bps) {
  if (bps == null || !isFinite(bps) || bps <= 0) return '0 KB'
  if (bps >= 1024 * 1024 * 1024) return (bps / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  if (bps >= 1024 * 1024) return (bps / 1024 / 1024).toFixed(1) + ' MB'
  return (bps / 1024).toFixed(0) + ' KB'
}

const colors = { primary: '#a78bfa', secondary: '#7c3aed' }

export default function NightfallPage({ onLaunch, instances, onKillInstance, onLogPanelOpen }) {
  const { t } = useLang()
  const { accounts, selectedAccount, addAccount, selectAccount } = useAccounts()
  const accountId = selectedAccount?.id
  const isElectron = typeof window !== 'undefined' && window.electronAPI

  const [profiles, setProfiles] = useState([])
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const [filesModalOpen, setFilesModalOpen] = useState(false)
  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const [logPanelVisible, setLogPanelVisible] = useState(false)
  const [persistedLauncherLogs, setPersistedLauncherLogs] = useState([])
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameExpanded, setUsernameExpanded] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const usernameRef = useRef(null)

  const [preDl, setPreDl] = useState(null)
  const [cfPack, setCfPack] = useState(null)
  const [dlError, setDlError] = useState(null)
  const [successToast, setSuccessToast] = useState(null)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [packUpdate, setPackUpdate] = useState(false)
  const [packVer, setPackVer] = useState('')
  const [packInstalled, setPackInstalled] = useState(false)
  const [confirmInstall, setConfirmInstall] = useState(false)

  const checkedRef = useRef(false)
  const preDlRef = useRef(null)
  const cfPackRef = useRef(null)

  useEffect(() => {
    if (!profileMenuOpen) return
    function onDown(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setProfileMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [profileMenuOpen])

  const currentProfile = profiles.find(p => p.name === NIGHTFALL_PROFILE_NAME) || profiles[1] || profiles[0] || null

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.getProfiles().then(data => {
      setProfiles(data.profiles || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedAccount?.username) setUsernameInput(selectedAccount.username)
  }, [selectedAccount?.id])

  useEffect(() => {
    if (usernameExpanded) usernameRef.current?.focus()
  }, [usernameExpanded])

  useEffect(() => {
    preDlRef.current = preDl
    cfPackRef.current = cfPack
  }, [preDl, cfPack])

  const busyDownloading = (preDl?.active && !preDl.closing) || (cfPack?.active && !cfPack.closing)

  useEffect(() => {
    if (!isElectron || !window.electronAPI.onPreDownloadProgress) return
    return window.electronAPI.onPreDownloadProgress(data => {
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
    if (!isElectron || !window.electronAPI.onCfPackProgress) return
    return window.electronAPI.onCfPackProgress(data => {
      setCfPack(prev => ({ ...(prev || {}), active: true, closing: false, ...data }))
      if (data.phase === 'done') {
        setTimeout(() => {
          setCfPack(prev => prev ? { ...prev, closing: true } : prev)
          setTimeout(() => setCfPack(prev => prev ? { ...prev, active: false, closing: false } : prev), 450)
        }, 2500)
      }
    })
  }, [])

  function waitForOpClosed(ref) {
    return new Promise(resolve => {
      const check = () => {
        if (!ref.current?.active) resolve()
        else setTimeout(check, 150)
      }
      check()
    })
  }

  function showSuccessToast(msg) {
    setSuccessToast(msg)
    clearTimeout(showSuccessToast._t)
    showSuccessToast._t = setTimeout(() => setSuccessToast(null), 3000)
  }

  async function checkPackUpdate({ toast = false } = {}) {
    if (!isElectron || !window.electronAPI.cfPackCheck) return
    if (checkingUpdates || !currentProfile?.id) return
    setCheckingUpdates(true)
    try {
      const r = await window.electronAPI.cfPackCheck({ profileId: currentProfile.id })
      if (r?.ok) {
        setPackUpdate(!!r.hasUpdate)
        setPackVer(r.latest || '')
        setPackInstalled(!!r.installed)
        if (toast) {
          if (r.hasUpdate) showSuccessToast(`Có bản modpack mới: ${r.latest}`)
          else showSuccessToast(`Modpack đã mới nhất (${r.latest})`)
        }
      } else if (toast) {
        setDlError({ type: 'pack', message: r?.error || 'Không kiểm tra được bản cập nhật modpack' })
      }
    } catch {
      if (toast) setDlError({ type: 'pack', message: 'Không kết nối được CurseForge để kiểm tra cập nhật.' })
    } finally {
      setCheckingUpdates(false)
    }
  }

  useEffect(() => {
    if (checkedRef.current || !currentProfile?.id) return
    checkedRef.current = true
    checkPackUpdate()
  }, [currentProfile?.id])

  function handleProfileUpdated(updatedProfile) {
    if (updatedProfile?.id) {
      setProfiles(prev => {
        const idx = prev.findIndex(p => p.id === updatedProfile.id)
        if (idx !== -1) {
          const arr = [...prev]; arr[idx] = updatedProfile; return arr
        }
        return prev
      })
    }
  }

  function handleCloseLogPanel() {
    setLogPanelVisible(false)
  }

  function handleReopenLog() {
    setLogPanelVisible(true)
  }

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

    let accId
    const existing = accounts.find(a => a.username === name && a.type === 'offline')
    if (existing) {
      accId = existing.id
      await selectAccount(existing.id)
    } else {
      const result = await addAccount({ type: 'offline', username: name })
      if (result?.error) { setUsernameError(result.error); return }
      accId = offlineUUID(name)
      await selectAccount(accId)
    }
    playFlow(accId)
  }

  async function playFlow(accId) {
    const profileId = currentProfile?.id
    if (!profileId) return
    if (packUpdate && isElectron && window.electronAPI.cfPackRun) {
      setCfPack({ active: true, closing: false, phase: 'check', item: 'Kiểm tra cập nhật', percent: 0, log: 'Có bản modpack mới — đang tải...' })
      const res = await window.electronAPI.cfPackRun({ profileId }).catch(() => null)
      if (res && res.ok === false) {
        if (res.paused || res.cancelled) return
        setPackUpdate(false)
        setDlError({ type: 'pack', message: res.error || 'Lỗi tải modpack', stack: res.stack })
        return
      }
      setPackUpdate(false)
    }
    await waitForOpClosed(cfPackRef)
    if (isElectron && window.electronAPI.preDownload) {
      await window.electronAPI.preDownload({ profileId }).catch(() => {})
    }
    await waitForOpClosed(preDlRef)
    onLaunch(profileId, (currentProfile?.ramGb || 8) * 1024, currentProfile?.name || 'NightfallCraft', selectedAccount?.username || usernameInput.trim() || 'Player', '', accId)
  }

  function handlePlayClick() {
    if (busyDownloading) return
    if (playing) {
      onKillInstance?.(currentProfile?.id, selectedAccount?.id)
      return
    }
    if (!packInstalled && !packUpdate) {
      setConfirmInstall(true)
      return
    }
    saveAccountAndLaunch()
  }

  const currentInst = instances?.find(i => i.profileId === currentProfile?.id && (!accountId || i.accountId === accountId))
  const playing = currentInst?.state === 'running'
  const downloading = currentInst?.state === 'downloading'

  const displayLogs = currentInst?.logs || persistedLauncherLogs

  useEffect(() => {
    onLogPanelOpen?.(logPanelVisible)
  }, [logPanelVisible, onLogPanelOpen])

  useEffect(() => {
    const ll = currentInst?.logs
    if (ll?.length > 0) setPersistedLauncherLogs(ll)
  }, [currentInst?.logs])

  useEffect(() => {
    if (currentInst?.state === 'downloading' || currentInst?.state === 'running') {
      setLogPanelVisible(true)
    }
  }, [currentInst?.state])

  const preDlPhases = preDl?.phases ? Object.values(preDl.phases) : []
  const overallPct = cfPack?.active && !cfPack.closing
    ? (cfPack.percent || 0)
    : (preDl?.active && !preDl.closing
        ? (preDlPhases.length ? preDlPhases.reduce((s, p) => s + (p.percent || 0), 0) / preDlPhases.length : (preDl.percent || 0))
        : 0)

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden select-none">
      {}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden bg-black">
        <video
          src={nightfallTrailer}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(3,5,12,0.9) 0%, rgba(3,5,12,0.55) 42%, rgba(3,5,12,0.15) 75%, rgba(3,5,12,0.35) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(3,5,12,0.85) 0%, transparent 30%)' }} />
      </div>

      {}
      <div className="flex-1 flex flex-col justify-center pl-36">
        <div className="flex items-center gap-6">
          <img src={nightfallIcon} alt="NightfallCraft" className="w-28 h-28 object-contain drop-shadow-xl" draggable={false} />
          <div className="text-left">
            <div className="rounded-2xl blur-glass bg-black/40 backdrop-blur-sm border border-white/10 p-6 max-w-[560px]">
              <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">NightfallCraft</h1>
              <p className="text-lg font-bold text-violet-300 mt-1">The Casket of Reveries</p>
              <p className="text-sm text-white/45 mt-2 leading-relaxed">
                Souls-like RPG modpack với cốt truyện và hệ thống nhiệm vụ riêng.
                Chơi đơn — tạo thế giới riêng của bạn.
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-[10px] px-2 py-1 rounded-md bg-violet-500/15 border border-violet-500/25 text-violet-300 font-bold">Forge 1.20.1</span>
                <span className="text-[10px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/50 font-mono">
                  {packVer ? `v${packVer}` : (packInstalled ? 'Đã cài' : 'Chưa cài')}
                </span>
                {packUpdate && (
                  <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-bold">
                    Có bản mới: {packVer}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="absolute bottom-6 right-7 flex flex-col items-end gap-2">
        {successToast && (
          <p className="text-sm font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg shadow-lg">{successToast}</p>
        )}
        {usernameError && (
          <p className="text-sm font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg">{usernameError}</p>
        )}
        <div className="flex items-center gap-3">
          {}
          <div
            className="rounded-2xl blur-glass overflow-hidden border border-white/15 transition-all active:scale-95"
            style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          >
            <button
              onClick={() => { if (busyDownloading || checkingUpdates) return; checkPackUpdate({ toast: true }) }}
              className="w-14 h-14 flex items-center justify-center transition-colors text-emerald-400 hover:text-white"
              data-tip="Kiểm tra cập nhật modpack"
            >
              <ArrowClockwise size={26} weight="duotone" className={checkingUpdates ? 'animate-spin' : ''} />
            </button>
          </div>

          {}
          <div className="flex items-center">
            <div
              className={`flex items-center blur-glass overflow-hidden rounded-2xl border transition-all duration-300 border-white/15`}
              style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            >
              <button
                onClick={() => { setUsernameExpanded(v => !v) }}
                className="w-14 h-14 flex items-center justify-center flex-shrink-0 transition-colors text-white/70 hover:text-white rounded-l-2xl overflow-hidden"
                data-tip="Nhập tên người chơi"
              >
                {usernameInput.trim().length >= 3 ? (
                  <PlayerHead uuid={offlineUUID(usernameInput.trim())} username={usernameInput.trim()} size={56} />
                ) : (
                  <User size={26} weight="duotone" />
                )}
              </button>

              {}
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
                  onClick={() => { saveAccountAndLaunch() }}
                  className="w-11 h-11 rounded-xl bg-violet-400 text-black flex items-center justify-center hover:bg-violet-300 transition-all active:scale-95 flex-shrink-0"
                  data-tip="Xác nhận"
                >
                  <Check size={22} weight="bold" />
                </button>
                <button
                  onClick={() => { setUsernameExpanded(false); setUsernameError('') }}
                  className="w-11 h-11 rounded-xl text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all flex-shrink-0"
                  data-tip="Đóng"
                >
                  {}
                  <span className="text-white/50 text-xs font-bold px-1">✕</span>
                </button>
              </div>
            </div>
          </div>

          {}
          {downloading ? (
            <button
              disabled
              className="flex items-center gap-2 px-6 h-14 rounded-2xl font-bold text-base text-black/80 cursor-not-allowed"
              style={{ background: colors.primary, opacity: 0.75 }}
            >
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              {currentInst?.progress?.percent != null ? `${currentInst.progress.percent}%` : '...'}
            </button>
          ) : (
            <div className="glow-play" style={{ '--gc': packUpdate ? '#a78bfa' : colors.primary }}>
              <span className="glow-edge" />
              <div className="glow-inner">
                <button onClick={handlePlayClick} className="glow-btn transition-transform active:scale-95">
                  {busyDownloading ? (
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
                      </span>
                    </>
                  ) : playing ? (
                    <>
                      <PlayCircle size={26} weight="fill" className="text-red-400" />
                      <span className="text-red-200">{t('homepage.launch.kill')}</span>
                    </>
                  ) : packUpdate ? (
                    <>
                      <ArrowClockwise size={26} weight="duotone" className="text-violet-400 spin-pulse" />
                      <span className="text-violet-200">Update {packVer}</span>
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

          {}
          {currentProfile && (
            <div className="relative" ref={profileMenuRef}>
              {}
              <div
                className={`absolute bottom-full mb-2 right-0 z-[80] flex flex-col items-end gap-2 transition-all duration-200 origin-bottom-right ${
                  profileMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
                }`}
              >
                <button
                  onClick={() => { setFilesModalOpen(true); setProfileMenuOpen(false) }}
                  className="w-14 h-14 blur-glass rounded-2xl border border-white/15 flex items-center justify-center transition-colors text-cyan-400 hover:text-white hover:bg-white/10"
                  style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                  data-tip="Quản lý file profile"
                >
                  <FolderOpen size={26} weight="duotone" />
                </button>
                <button
                  onClick={() => { setOptionsModalOpen(true); setProfileMenuOpen(false) }}
                  className="w-14 h-14 blur-glass rounded-2xl border border-white/15 flex items-center justify-center transition-colors text-blue-400 hover:text-white hover:bg-white/10"
                  style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                  data-tip="Cài đặt game (options.txt)"
                >
                  <Wrench size={26} weight="duotone" />
                </button>
                <button
                  onClick={() => { logPanelVisible ? handleCloseLogPanel() : handleReopenLog(); setProfileMenuOpen(false) }}
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
                  onClick={() => { setProfileSettingsOpen(true); setProfileMenuOpen(false) }}
                  className="w-14 h-14 blur-glass rounded-2xl border border-white/15 flex items-center justify-center transition-colors text-violet-400 hover:text-white hover:bg-white/10"
                  style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                  data-tip="Mở profile settings"
                >
                  <Gear size={26} weight="duotone" />
                </button>
              </div>

              {}
              <div
                className="rounded-2xl blur-glass border border-white/15 overflow-hidden transition-all active:scale-95"
                style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
              >
                <button
                  onClick={() => { setProfileMenuOpen(v => !v) }}
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

      {}
      {preDl?.active && (
        <div className={`absolute bottom-[116px] right-7 w-[380px] ${preDl.closing ? 'preDl-down' : 'preDl-modal'}`}>
          <div className="rounded-2xl bg-[#12101c] border border-white/10 p-4">
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
                onClick={() => { window.electronAPI?.dataControl?.({ op: 'preDl', action: 'cancel' }); setPreDl(prev => prev ? { ...prev, active: false } : prev) }}
                className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                data-tip="Đóng"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <p className="text-[12px] font-semibold text-white mt-2 leading-relaxed break-words max-h-[60px] overflow-hidden">{preDl.log}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${preDl.phase === 'done' ? 'text-emerald-300' : 'text-white'}`}>{preDl.item || '...'}</span>
                <span className="text-white/80 font-mono font-semibold flex items-center gap-2">
                  {preDl.phase !== 'done' && preDl.eta && <span className="text-white/70">còn {preDl.eta}</span>}
                  {Math.round(preDl.percent || 0)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div className="h-full rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${Math.max(0, Math.min(100, preDl.percent || 0))}%`, background: preDl.phase === 'done' ? '#34d399' : '#a78bfa' }}>
                  {preDl.phase !== 'done' && preDl.phase !== 'paused' && <span className="progress-shine absolute inset-0" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {cfPack?.active && !(preDl?.active && !preDl.closing) && (
        <div className={`absolute bottom-[116px] right-7 w-[380px] ${cfPack.closing ? 'preDl-down' : 'preDl-modal'}`}>
          <div className="rounded-2xl bg-[#12101c] border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className={`animate-spin w-3.5 h-3.5 ${cfPack.phase === 'done' ? 'text-green-400' : 'text-violet-400'}`} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <span className="text-xs font-bold text-white">
                  {cfPack.phase === 'done' ? 'Hoàn tất cài modpack' : 'Đang tải modpack'}
                </span>
              </div>
              <button
                onClick={() => { window.electronAPI?.dataControl?.({ op: 'cfpack', action: 'cancel' }); setCfPack(prev => prev ? { ...prev, active: false } : prev) }}
                className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                data-tip="Đóng"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <p className="text-[12px] font-semibold text-white mt-2 leading-relaxed break-words max-h-[60px] overflow-hidden">{cfPack.log}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${cfPack.phase === 'done' ? 'text-emerald-300' : 'text-white'}`}>{cfPack.item || '...'}</span>
                <span className="text-white/80 font-mono font-semibold">{Math.round(cfPack.percent || 0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div className="h-full rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${Math.max(0, Math.min(100, cfPack.percent || 0))}%`, background: cfPack.phase === 'done' ? '#34d399' : '#a78bfa' }}>
                  {cfPack.phase !== 'done' && cfPack.phase !== 'paused' && <span className="progress-shine absolute inset-0" />}
                </div>
              </div>
              {cfPack.downloaded != null && (
                <p className="text-[11px] font-medium text-white/80 mt-1.5 font-mono">
                  {cfPack.phase === 'mods'
                    ? `Đã tải: ${cfPack.done ?? 0}/${cfPack.totalFiles ?? 0} mods · ${fmtBytes(cfPack.downloaded)}`
                    : `Đã tải: ${fmtBytes(cfPack.downloaded)} / ${fmtBytes(cfPack.total)}`}
                  {cfPack.speed != null && cfPack.speed > 0 && (
                    <span className="text-emerald-300"> · {fmtSpeed(cfPack.speed)}/s</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmInstall && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="rounded-2xl border border-violet-500/25 bg-[#12101c] p-5 w-full max-w-sm">
            <h3 className="text-sm font-bold text-white">Cài modpack NightfallCraft?</h3>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              Modpack chưa được cài. Tải và cài đặt bản mới nhất từ CurseForge (~200 mods, 8GB+ RAM khuyến nghị)?
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setConfirmInstall(false); saveAccountAndLaunch() }}
                className="flex-1 py-2 rounded-lg bg-violet-500 text-black text-xs font-bold hover:bg-violet-400 transition-all"
              >
                Cài và chơi
              </button>
              <button
                onClick={() => setConfirmInstall(false)}
                className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-bold hover:bg-white/10 transition-all"
              >
                Hủy
              </button>
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
            className="border border-blue-500/15 rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]"
            style={{ background: 'linear-gradient(165deg, #0c1526 0%, #05070d 55%, #03040a 100%)' }}
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
      {logPanelVisible && (
        <div className="absolute bottom-[116px] right-7 z-[90]">
          <LogPanel logs={displayLogs} onClose={handleCloseLogPanel} />
        </div>
      )}
      {filesModalOpen && currentProfile && (
        <ProfileFilesModal profile={currentProfile} onClose={() => setFilesModalOpen(false)} />
      )}
      {optionsModalOpen && currentProfile && (
        <OptionsModal profile={currentProfile} onClose={() => setOptionsModalOpen(false)} />
      )}
    </div>
  )
}