import { Gear } from '@phosphor-icons/react'
import martianIcon from '../assets/martian-icon.png'
import craftingTableIcon from '../assets/crafting-table.png'
import { useLang } from '../i18n/LangProvider'

export default function NavBar({ activePage, onNavigate, onOpenSettings, hidden }) {
  const { t } = useLang()

  return (
    <nav className={`absolute left-0 top-9 bottom-0 z-50 w-[84px] flex flex-col items-center transition-all duration-300 ${
      hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>

      {/* Home — trên cùng, ngay dưới TitleBar */}
      <button
        onClick={() => onNavigate('home')}
        title={t('sidebar.home')}
        className="mt-6 w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-105"
      >
        <img
          src={martianIcon}
          alt=""
          draggable={false}
          className={`object-contain transition-all duration-200 ${activePage === 'home' ? 'w-12 h-12' : 'w-10 h-10'}`}
        />
      </button>

      {/* Minecraft — page sắp ra mắt */}
      <button
        onClick={() => onNavigate('minecraft')}
        title="Minecraft"
        className="mt-2 w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-105"
      >
        <img
          src={craftingTableIcon}
          alt=""
          draggable={false}
          className={`object-contain transition-all duration-200 ${activePage === 'minecraft' ? 'w-11 h-11' : 'w-9 h-9'}`}
        />
      </button>

      {/* Khoảng trống giữa */}
      <div className="flex-1" />

      {/* Settings — dưới cùng, sát góc dưới, có kẻ ngang tách phía trên */}
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="w-10 h-px bg-white/25" />
        <button
          onClick={onOpenSettings}
          title={t('sidebar.settings')}
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-105"
        >
          <Gear size={32} weight="duotone" />
        </button>
      </div>
    </nav>
  )
}
