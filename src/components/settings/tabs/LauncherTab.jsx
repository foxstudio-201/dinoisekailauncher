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














 
















import { useLang } from '../../../i18n/LangProvider'

function Toggle({ checked, onChange, id }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200
        focus:outline-none
        ${checked ? 'bg-violet-500' : 'bg-white/15'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
          transform transition-transform duration-200
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  )
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80">{label}</p>
        {description && <p className="text-xs text-white/30 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-white/40 mb-2 px-1">{title}</p>
      <div className="rounded-xl border border-white/5 bg-white/2 divide-y divide-white/5 px-4">
        {children}
      </div>
    </div>
  )
}



export default function LauncherTab({ settings, onChange }) {
  const { t, lang, setLang, langs, loading: langLoading } = useLang()

  return (
    <div className="px-6 py-5">

      {}
      <Section title={t('settings.launcher.language')}>
        <div className="py-3">
          <div className="grid grid-cols-2 gap-2">
            {langs.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
                  lang === l.code
                    ? 'border-violet-500/40 bg-violet-500/10 text-white'
                    : 'border-white/8 bg-white/3 text-white/50 hover:border-white/15 hover:text-white/70'
                }`}
              >
                <span className="text-lg">{l.flag}</span>
                <span className="text-xs font-medium">{l.name}</span>
                {lang === l.code && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-violet-400 ml-auto">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
          {langLoading && (
            <p className="text-[10px] text-white/30 mt-2 flex items-center gap-1.5">
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {t('settings.language.updating')}
            </p>
          )}
        </div>
      </Section>

      <Section title={t('settings.launcher.game')}>
        <SettingRow
          label={t('settings.launcher.hideLauncher')}
          description={t('settings.launcher.hideLauncherDesc')}
        >
          <Toggle
            checked={settings.hideLauncherOnLaunch ?? true}
            onChange={v => onChange({ hideLauncherOnLaunch: v })}
          />
        </SettingRow>
        <SettingRow
          label={t('settings.launcher.dataSync')}
          description={t('settings.launcher.dataSyncDesc')}
        >
          <Toggle
            checked={settings.dataSyncEnabled !== false}
            onChange={v => onChange({ dataSyncEnabled: v })}
          />
        </SettingRow>
        <SettingRow
          label={t('settings.launcher.discordRPC')}
          description={t('settings.launcher.discordRPCDesc')}
        >
          <Toggle
            checked={settings.discordRPC ?? false}
            onChange={v => onChange({ discordRPC: v })}
          />
        </SettingRow>
        <SettingRow
          label={t('settings.launcher.boostMode')}
          description={t('settings.launcher.boostModeDesc')}
        >
          <Toggle
            checked={settings.boostMode ?? false}
            onChange={v => onChange({ boostMode: v })}
          />
        </SettingRow>
        <SettingRow
          label={t('settings.launcher.bigCoreMode')}
          description={t('settings.launcher.bigCoreModeDesc')}
        >
          <Toggle
            checked={settings.bigCoreMode ?? false}
            onChange={v => onChange({ bigCoreMode: v })}
          />
        </SettingRow>
      </Section>


    </div>
  )
}

