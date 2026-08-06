import { useState, useEffect, useRef } from 'react'
import JavaManagerModal from '../JavaManagerModal'
import { isElectron, Icons } from './shared'
import { useLang } from '../../../i18n/LangProvider'

// ─────────────────────────────────────────────────────────────────────────────

export default function GeneralTab({ profile, onProfileUpdated }) {
  const { t } = useLang()
  const [name, setName] = useState(profile?.name || '')
  const [ram, setRam] = useState(profile?.ramGb || 2)
  const [winWidth, setWinWidth] = useState(profile?.windowWidth || 854)
  const [winHeight, setWinHeight] = useState(profile?.windowHeight || 480)
  const [jvmArgs, setJvmArgs] = useState(profile?.jvmArgs || '')
  const [javaRuntime, setJavaRuntime] = useState(profile?.javaRuntime || '')
  const [autoPerformanceMods, setAutoPerformanceMods] = useState(profile?.autoPerformanceMods === true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showJavaModal, setShowJavaModal] = useState(false)
  const [javaList, setJavaList] = useState([])
  const saveTimerRef = useRef(null)

  useEffect(() => {
    setName(profile?.name || '')
    setRam(profile?.ramGb || 2)
    setWinWidth(profile?.windowWidth || 854)
    setWinHeight(profile?.windowHeight || 480)
    setJvmArgs(profile?.jvmArgs || '')
    setJavaRuntime(profile?.javaRuntime || '')
    setAutoPerformanceMods(profile?.autoPerformanceMods === true)
  }, [profile?.id])

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.profileListJavas?.()
      .then(r => { if (r?.ok) setJavaList(r.javas || []) })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!isElectron || !profile?.id) return
    setSaving(true)
    try {
      const patch = {
        name: name.trim() || profile.name,
        ramGb: ram,
        windowWidth: Number(winWidth) || 854,
        windowHeight: Number(winHeight) || 480,
        jvmArgs: jvmArgs.trim(),
        javaRuntime: javaRuntime.trim(),
        autoPerformanceMods,
      }
      await window.electronAPI.profileUpdate(profile.id, patch)
      setSaved(true)
      onProfileUpdated?.({ ...profile, ...patch })
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  function handleJavaSelected(javaExe) {
    setJavaRuntime(javaExe)
    setShowJavaModal(false)
  }

  const ramMarks = [1, 2, 4, 6, 8, 12, 16, 24, 32]

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Tên profile */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-white/50">{t('profileSettings.general.nameLabel')}</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={profile?.name}
          className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/8 transition-all"
        />
      </div>

      {/* Loader/Version cố định */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-white/50">Loader</label>
          <span className="text-[10px] text-white/25 font-mono">{profile?.gameVersion}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/6">
          <span className="text-violet-400">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          </span>
          <span className="text-xs text-white/40">
            <span className="text-violet-400">Forge</span>
            {' · '}{profile?.loaderVersion || '47.2.0'}
            {' — '}Cố định (Dino Isekai 1.20.1)
          </span>
        </div>
      </div>

      {/* RAM */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-white/50">{t('profileSettings.general.ramLabel')}</label>
          <span className="text-xs font-bold text-violet-400">{ram} GB</span>
        </div>
        <div className="relative flex items-center gap-0 h-6">
          {ramMarks.map((m, i) => {
            const isActive = m <= ram
            const isCurrent = m === ram
            const isLast = i === ramMarks.length - 1
            return (
              <button
                key={m}
                onClick={() => setRam(m)}
                className="relative flex-1 flex flex-col items-center gap-1 group"
                title={`${m} GB`}
              >
                <div className={`w-full h-1.5 transition-all ${
                  isLast ? 'rounded-r-full' : i === 0 ? 'rounded-l-full' : ''
                } ${isActive ? 'bg-violet-500' : 'bg-white/10 group-hover:bg-white/20'}`} />
                {isCurrent && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-violet-400 shadow-lg shadow-violet-500/40 ring-2 ring-violet-400/30 z-10" />
                )}
              </button>
            )
          })}
        </div>
        <div className="flex">
          {ramMarks.map(m => (
            <button
              key={m}
              onClick={() => setRam(m)}
              className={`flex-1 text-center text-[9px] py-0.5 rounded transition-all ${
                m === ram ? 'text-violet-400 font-bold' : 'text-white/20 hover:text-white/50'
              }`}
            >
              {m}G
            </button>
          ))}
        </div>
      </div>

      {/* Kích thước cửa sổ */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-white/50">{t('profileSettings.general.windowSize')}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={winWidth}
            onChange={e => setWinWidth(e.target.value)}
            placeholder="854"
            className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none focus:border-white/20 transition-all text-center"
          />
          <span className="text-white/20 text-xs">×</span>
          <input
            type="number"
            value={winHeight}
            onChange={e => setWinHeight(e.target.value)}
            placeholder="480"
            className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none focus:border-white/20 transition-all text-center"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[['854×480', 854, 480], ['1280×720', 1280, 720], ['1920×1080', 1920, 1080]].map(([label, w, h]) => (
            <button
              key={label}
              onClick={() => { setWinWidth(w); setWinHeight(h) }}
              className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${winWidth === w && winHeight === h ? 'border-violet-500/40 bg-violet-500/10 text-violet-400' : 'border-white/8 bg-white/3 text-white/30 hover:text-white/60 hover:border-white/15'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* JVM Args */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-white/50">{t('profileSettings.general.jvmArgs')}</label>
        <textarea
          value={jvmArgs}
          onChange={e => setJvmArgs(e.target.value)}
          placeholder="-XX:+UseG1GC -XX:MaxGCPauseMillis=50"
          rows={3}
          className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white/85 placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/8 transition-all font-mono resize-none"
        />
      </div>

      {/* Java Runtime */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-white/50">{t('profileSettings.general.javaRuntime')}</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white/60 font-mono truncate min-w-0">
            {javaRuntime || <span className="text-white/20">{t('profileSettings.general.javaAuto')}</span>}
          </div>
          <button
            onClick={() => setShowJavaModal(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white/50 hover:text-white/80 hover:border-white/15 transition-all text-xs"
          >
            {Icons.java}
            <span>{t('profileSettings.general.javaSelect')}</span>
          </button>
          {javaRuntime && (
            <button
              onClick={() => setJavaRuntime('')}
              className="flex-shrink-0 p-2.5 rounded-xl bg-white/5 border border-white/8 text-white/30 hover:text-red-400 hover:border-red-500/20 transition-all"
              title="Xóa"
            >
              {Icons.trash}
            </button>
          )}
        </div>
        {javaList.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {javaList.map((j, i) => (
              <button
                key={i}
                onClick={() => setJavaRuntime(j.path)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${javaRuntime === j.path ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400' : 'bg-white/3 border border-white/5 text-white/50 hover:bg-white/6 hover:text-white/70'}`}
              >
                <span className="text-[10px] font-mono truncate flex-1">{j.path}</span>
                {j.version && <span className="text-[9px] text-white/25 flex-shrink-0">Java {j.version}</span>}
                {javaRuntime === j.path && <span className="flex-shrink-0 text-violet-400">{Icons.check}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Auto Performance Mods — chỉ hiện với Fabric */}
      {profile?.loader === 'fabric' && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/6">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/70">{t('profileSettings.general.autoPerformanceMods')}</p>
            <p className="text-[10px] text-white/35 mt-0.5 leading-relaxed">{t('profileSettings.general.autoPerformanceModsDesc')}</p>
          </div>
          <button
            onClick={() => setAutoPerformanceMods(v => !v)}
            className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-all mt-0.5 ${autoPerformanceMods ? 'bg-violet-500' : 'bg-white/10'}`}
            title={autoPerformanceMods ? t('profileSettings.general.autoPerformanceModsOn') : t('profileSettings.general.autoPerformanceModsOff')}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${autoPerformanceMods ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      {/* Lưu */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${saved ? 'bg-violet-500/20 border border-violet-500/30 text-violet-400' : 'bg-white/8 border border-white/10 text-white/70 hover:bg-white/12 hover:text-white/90'} disabled:opacity-50`}
      >
        {saving ? Icons.spin : saved ? Icons.check : null}
        {saving ? t('profileSettings.general.saving') : saved ? t('profileSettings.general.saved') : t('profileSettings.general.save')}
      </button>

      {showJavaModal && (
        <JavaManagerModal
          profile={profile}
          onClose={() => setShowJavaModal(false)}
          onJavaSelected={handleJavaSelected}
        />
      )}
    </div>
  )
}
