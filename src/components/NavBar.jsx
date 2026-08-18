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
import { Gear } from '@phosphor-icons/react'
import martianIcon from '../assets/martian-icon.png'
import craftingTableIcon from '../assets/crafting-table.png'
import nightfallIcon from '../assets/nightfall-icon.gif'
import { useLang } from '../i18n/LangProvider'

export default function NavBar({ activePage, onNavigate, onOpenSettings, hidden }) {
  const { t } = useLang()

  return (
    <nav className={`absolute left-0 top-9 bottom-0 z-50 w-[84px] flex flex-col items-center transition-all duration-300 ${
      hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>

      {}
      <button
        onClick={() => onNavigate('home')}
        data-tip={t('sidebar.home')}
        className="mt-6 w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-105"
      >
        <img
          src={martianIcon}
          alt=""
          draggable={false}
          className={`object-contain transition-all duration-200 ${activePage === 'home' ? 'w-12 h-12' : 'w-10 h-10'}`}
        />
      </button>

      {}
      <button
        onClick={() => onNavigate('minecraft')}
        data-tip={t('sidebar.minecraft')}
        className="mt-2 w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-105"
      >
        <img
          src={craftingTableIcon}
          alt=""
          draggable={false}
          className={`object-contain transition-all duration-200 ${activePage === 'minecraft' ? 'w-11 h-11' : 'w-9 h-9'}`}
        />
      </button>

      {}
      <button
        onClick={() => onNavigate('nightfall')}
        data-tip={t('sidebar.nightfall')}
        className="mt-2 w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-105"
      >
        <img
          src={nightfallIcon}
          alt=""
          draggable={false}
          className={`object-contain transition-all duration-200 ${activePage === 'nightfall' ? 'w-12 h-12' : 'w-10 h-10'}`}
        />
      </button>

      {}
      <div className="flex-1" />

      {}
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="w-10 h-px bg-white/25" />
        <button
          onClick={onOpenSettings}
          data-tip={t('sidebar.settings')}
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-105"
        >
          <Gear size={32} weight="duotone" />
        </button>
      </div>
    </nav>
  )
}
