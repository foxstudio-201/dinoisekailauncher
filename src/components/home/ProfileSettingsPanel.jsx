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































import { useState, useEffect } from 'react'
import { Icons } from './tab/shared'
import GeneralTab from './tab/GeneralTab'
import { useLang } from '../../i18n/LangProvider'
import { useModalClose } from '../ui/GamingModalWrapper'

export default function ProfileSettingsPanel({ profile, onClose: onCloseProp, onProfileUpdated, accountId, onRepair, repairing }) {
  const { t } = useLang()
  const onClose = useModalClose(onCloseProp)

  const tabs = [
    { id: 'general', labelKey: 'profileSettings.tabs.general', icon: Icons.settings, component: GeneralTab },
  ]

  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => { setActiveTab('general') }, [profile?.id])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const currentTab = tabs.find(tab => tab.id === activeTab) || tabs[0]
  const TabComponent = currentTab?.component

  if (!profile) return null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-all flex-shrink-0"
          title={t('profileSettings.back')}
        >
          {Icons.back}
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white/90 truncate">{profile.name}</h3>
          <p className="text-[10px] text-white/30 mt-0.5">
            {profile.loader
              ? `${profile.loader.charAt(0).toUpperCase() + profile.loader.slice(1)} ${profile.gameVersion}`
              : profile.gameVersion
            }
          </p>
        </div>
      </div>

      {}
      <div className="flex-shrink-0 flex gap-1 px-4 border-b border-white/5">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all duration-150 -mb-px ${
              activeTab === tab.id
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-white/35 hover:text-white/60 hover:border-white/15'
            }`}>
            <span className={activeTab === tab.id ? 'text-violet-400' : 'text-white/25'}>
              {tab.icon}
            </span>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        {TabComponent && (
          <TabComponent
            profile={profile}
            onProfileUpdated={onProfileUpdated}
            accountId={accountId}
            onRepair={onRepair}
            repairing={repairing}
          />
        )}
      </div>
    </div>
  )
}
