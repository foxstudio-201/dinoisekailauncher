import { useLang } from '../../../i18n/LangProvider'
import { Section } from '../SettingsUI.jsx'

function applyBorder(radius, color) {
  document.documentElement.style.setProperty('--app-radius', `${radius}px`)
  document.documentElement.style.setProperty('--app-border-color', color)
}

export default function AppearanceTab({ settings, onChange }) {
  const { t } = useLang()
  const radius      = settings.borderRadius ?? 12
  const borderColor = settings.borderColor  ?? 'rgba(255,255,255,0.08)'
  const starTrail   = settings.starTrail !== false

  const BORDER_PRESETS = [
    { labelKey: 'default', value: 'rgba(255,255,255,0.08)' },
    { labelKey: 'green',   value: 'rgba(167,139,250,0.25)'  },
    { labelKey: 'blue',    value: 'rgba(96,165,250,0.25)'  },
    { labelKey: 'purple',  value: 'rgba(167,139,250,0.25)' },
    { labelKey: 'red',     value: 'rgba(248,113,113,0.25)' },
    { labelKey: 'yellow',  value: 'rgba(251,191,36,0.25)'  },
    { labelKey: 'white',   value: 'rgba(255,255,255,0.20)' },
    { labelKey: 'hidden',  value: 'transparent'            },
  ]

  function handleRadius(v) {
    onChange({ borderRadius: v })
    applyBorder(v, borderColor)
  }

  function handleColor(v) {
    onChange({ borderColor: v })
    applyBorder(radius, v)
  }

  return (
    <div className="px-6 py-5 space-y-6">

      <Section title={t('settings.launcher.borderRadius')}>
        <div className="py-3 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/40 uppercase tracking-widest">{t('settings.launcher.borderRadius')}</p>
              <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md">
                {radius}px
              </span>
            </div>
            <input type="range" min={0} max={24} step={2} value={radius}
              onChange={e => handleRadius(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:cursor-pointer" />
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-2">{t('settings.launcher.borderColor')}</p>
            <div className="grid grid-cols-4 gap-2">
              {BORDER_PRESETS.map(p => (
                <button key={p.labelKey}
                  onClick={() => handleColor(p.value)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all duration-150
                    ${borderColor === p.value ? 'border-violet-500/40 bg-violet-500/8' : 'border-white/5 bg-white/3 hover:bg-white/6 hover:border-white/12'}`}>
                  <div className="w-8 h-8 rounded-lg border-2"
                    style={{ borderColor: p.value === 'transparent' ? 'rgba(255,255,255,0.05)' : p.value, background: 'rgba(255,255,255,0.03)', borderStyle: p.value === 'transparent' ? 'dashed' : 'solid' }} />
                  <span className={`text-[9px] font-medium ${borderColor === p.value ? 'text-violet-400' : 'text-white/35'}`}>{t(`settings.launcher.borderPresets.${p.labelKey}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Hiệu ứng chuột">
        <button
          onClick={() => onChange({ starTrail: !starTrail })}
          className="w-full flex items-center justify-between py-3 transition-all"
        >
          <span className="text-sm text-white/70">Sao bay theo chuột (tím huyền bí)</span>
          <span className={`w-11 h-6 rounded-full relative transition-colors ${starTrail ? 'bg-violet-500' : 'bg-white/15'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${starTrail ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      </Section>

    </div>
  )
}