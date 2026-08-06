import { Gear } from '@phosphor-icons/react'
import martianIcon from '../assets/martian-icon.png'
import craftingTableIcon from '../assets/crafting-table.png'
import { useLang } from '../i18n/LangProvider'

export default function NavBar({ activePage, onNavigate, onOpenSettings, hidden }) {
  const { t } = useLang()

  return (
    <nav className={`absolute left-0 top-9 bottom-0 z-50 w-[76px] flex flex-col items-center transition-all duration-300 ${
      hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>

      {/* Home — trên cùng, ngay dưới TitleBar */}
      <button
        onClick={() => onNavigate('home')}
        title={t('sidebar.home')}
        className={`mt-6 w-14 h-14 rounded-2xl flex items-center justify-center transition-all border ${
          activePage === 'home'
            ? 'bg-violet-500/25 border-violet-400/30'
            : 'bg-white/[0.08] border-white/15 hover:bg-white/15'
        }`}
      >
        <img src={martianIcon} alt="" className="w-10 h-10 object-contain" draggable={false} />
      </button>

      {/* Minecraft — page sắp ra mắt */}
      <button
        onClick={() => onNavigate('minecraft')}
        title="Minecraft"
        className={`mt-3 w-14 h-14 rounded-2xl flex items-center justify-center transition-all border ${
          activePage === 'minecraft'
            ? 'bg-violet-500/25 border-violet-400/30 text-violet-300'
            : 'bg-white/[0.08] border-white/15 text-white/85 hover:bg-white/15 hover:text-white'
        }`}
      >
        <img src={craftingTableIcon} alt="" className="w-9 h-9 object-contain" draggable={false} />
      </button>

      {/* Khoảng trống giữa */}
      <div className="flex-1" />

      {/* Settings — dưới cùng, sát góc dưới, có kẻ ngang tách phía trên */}
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="w-10 h-px bg-white/25" />
        <button
          onClick={onOpenSettings}
          title={t('sidebar.settings')}
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all border border-white/15 bg-white/[0.08] text-white/85 hover:bg-white/15 hover:text-white"
        >
          <Gear size={30} weight="duotone" />
        </button>
      </div>
    </nav>
  )
}
