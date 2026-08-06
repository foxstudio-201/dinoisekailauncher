import { useState } from 'react'
import { Check, DiscordLogo, DownloadSimple } from '@phosphor-icons/react'
import { useLang } from '../i18n/LangProvider'
import { applyAppSettings, saveAppSettings } from '../utils/appSettings'
import martianIcon from '../assets/martian-icon.png'

const COPY = {
  vi: {
    welcome: ['Chào mừng đến với Dino Isekai', 'Thiết lập nhanh vài tùy chọn để launcher phù hợp với bạn.'],
    language: ['Chọn ngôn ngữ', 'Bạn luôn có thể đổi lại trong phần Cài đặt.'],
    discord: ['Discord Rich Presence', 'Hiển thị hoạt động Minecraft của bạn trên Discord.'],
    updates: ['Cập nhật tự động', 'Kiểm tra phiên bản mới mỗi khi launcher khởi động.'],
    appearance: ['Chế độ hiển thị', 'Chọn giao diện bạn muốn sử dụng.'],
    done: ['Thiết lập hoàn tất!', 'Dino Isekai đã sẵn sàng để bạn bắt đầu.'],
    continue: 'Tiếp tục', finish: 'Bắt đầu sử dụng', enabled: 'Bật', disabled: 'Tắt',
    default: 'Mặc định', gaming: 'Gaming',
  },
  en: {
    welcome: ['Welcome to Dino Isekai', 'Set up a few preferences to make the launcher yours.'],
    language: ['Choose your language', 'You can change this anytime in Settings.'],
    discord: ['Discord Rich Presence', 'Show your Minecraft activity on Discord.'],
    updates: ['Automatic updates', 'Check for a new version whenever the launcher starts.'],
    appearance: ['Display mode', 'Choose the interface you want to use.'],
    done: ['Setup complete!', 'Dino Isekai is ready when you are.'],
    continue: 'Continue', finish: 'Start using launcher', enabled: 'On', disabled: 'Off',
    default: 'Default', gaming: 'Gaming',
  },
}

function ToggleChoice({ enabled, onClick, onLabel, offLabel, icon: Icon }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full rounded-xl border p-4 flex items-center gap-3.5 text-left transition-all duration-200 ${enabled ? 'bg-white/[0.055] border-white/25' : 'bg-transparent border-white/[0.08] hover:bg-white/[0.025] hover:border-white/15'}`}>
      <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/55 flex items-center justify-center">
        <Icon size={20} weight="regular" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white/85">{enabled ? onLabel : offLabel}</p>
        <p className="text-[11px] mt-1 text-white/30">{enabled ? 'Enabled' : 'Disabled'}</p>
      </div>
      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${enabled ? 'bg-violet-400/90' : 'bg-white/15'}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </button>
  )
}

export default function InitialSetup({ initialSettings, onComplete }) {
  const { lang, langs, setLang } = useLang()
  const copy = COPY[lang] || COPY.vi
  const [step, setStep] = useState(0)
  const [settings, setSettings] = useState({
    ...initialSettings,
    language: initialSettings?.language || lang || 'vi',
    discordRPC: !!initialSettings?.discordRPC,
    autoCheckUpdate: initialSettings?.autoCheckUpdate !== false,
  })
  const [saving, setSaving] = useState(false)
  const stepNames = ['welcome', 'language', 'discord', 'updates', 'done']
  const current = stepNames[step]
  const [title, description] = copy[current]

  async function selectLanguage(code) {
    setSettings(value => ({ ...value, language: code }))
    await setLang(code, { persist: false })
  }

  async function finish() {
    setSaving(true)
    const finalSettings = { ...settings, initialSetupCompleted: true }
    await saveAppSettings(finalSettings)
    applyAppSettings(finalSettings)
    onComplete(finalSettings)
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden bg-[#090a0c]/96 p-5">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(ellipse at 50% -10%, rgba(255,255,255,.06), transparent 48%)' }} />
      <div className="relative w-full max-w-[720px] rounded-2xl border border-white/[0.09] bg-[#111216] overflow-hidden">
        <div className="px-7 sm:px-9 pt-6"><div className="h-px bg-white/[0.08]"><div className="h-px bg-violet-400 transition-all duration-500" style={{ width: `${(step / (stepNames.length - 1)) * 100}%` }} /></div></div>
        <div className="px-7 pb-7 pt-5 sm:px-9 sm:pb-9">
          <div className="flex items-center justify-between mb-9">
            <div className="flex items-center gap-2.5"><img src={martianIcon} alt="" className="w-6 h-6 object-contain opacity-90" /><span className="text-xs font-bold tracking-[0.18em] text-white/65">DINO ISEKAI</span></div>
            <span className="text-[11px] font-mono text-white/25">{String(step + 1).padStart(2, '0')} / {String(stepNames.length).padStart(2, '0')}</span>
          </div>

          <div key={current} className="animate-[setup-step-in_350ms_ease-out]">
            <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">{title}</h1>
            <p className="text-sm text-white/40 mt-2 mb-8">{description}</p>

            {current === 'welcome' && <div className="border-l-2 border-violet-400 pl-5 py-2"><p className="text-sm leading-7 text-white/55">Minecraft launcher hiện đại, nhẹ và sẵn sàng cho những thế giới mới.</p></div>}

            {current === 'language' && <div className="grid grid-cols-2 gap-3">{langs.map(item => <button key={item.code} type="button" onClick={() => selectLanguage(item.code)} className={`rounded-xl border p-4 text-left transition-all ${settings.language === item.code ? 'border-violet-400/70 bg-violet-400/[0.07]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'}`}><div className="text-xl grayscale-[.15]">{item.flag}</div><p className="text-sm font-semibold text-white/80 mt-3">{item.name}</p>{settings.language === item.code && <Check size={15} weight="bold" className="text-violet-400 mt-2" />}</button>)}</div>}

            {current === 'discord' && <ToggleChoice enabled={settings.discordRPC} onClick={() => setSettings(value => ({ ...value, discordRPC: !value.discordRPC }))} onLabel={`${copy.enabled} Discord Rich Presence`} offLabel={`${copy.disabled} Discord Rich Presence`} icon={DiscordLogo} />}
            {current === 'updates' && <ToggleChoice enabled={settings.autoCheckUpdate} onClick={() => setSettings(value => ({ ...value, autoCheckUpdate: !value.autoCheckUpdate }))} onLabel={`${copy.enabled} auto update`} offLabel={`${copy.disabled} auto update`} icon={DownloadSimple} />}

            {current === 'done' && <div className="rounded-xl border border-white/[0.1] bg-white/[0.025] p-7 text-center"><div className="w-11 h-11 mx-auto rounded-full border border-violet-400/70 text-violet-400 flex items-center justify-center"><Check size={22} weight="bold" /></div><p className="text-sm text-white/50 mt-5">Các lựa chọn của bạn đã sẵn sàng để lưu.</p></div>}
          </div>

          <div className="flex justify-end mt-9">
            {current === 'done' ? <button type="button" disabled={saving} onClick={finish} className="px-5 py-2.5 rounded-lg bg-violet-400 text-black text-sm font-bold hover:bg-violet-300 disabled:opacity-60 transition-all">{saving ? '...' : copy.finish}</button> : <button type="button" onClick={() => setStep(value => Math.min(value + 1, stepNames.length - 1))} className="px-5 py-2.5 rounded-lg bg-violet-400 text-black text-sm font-bold hover:bg-violet-300 transition-all">{copy.continue}</button>}
          </div>
        </div>
      </div>
      <style>{`@keyframes setup-step-in { from { opacity: 0; transform: translateX(12px) } to { opacity: 1; transform: translateX(0) } }`}</style>
    </div>
  )
}
