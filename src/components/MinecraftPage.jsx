import { PlayCircle, User, Gear, Clock } from '@phosphor-icons/react'
import martianIcon from '../assets/martian-icon.png'
import vanillaBg from '../assets/vanilla-mc.png'
import SystemInfo from './SystemInfo'

export default function MinecraftPage() {
  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden select-none">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <img src={vanillaBg} className="w-full h-full object-cover" draggable={false} />
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{
            width: '600px',
            background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.25) 70%, transparent 100%)',
          }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center pl-36">
        <SystemInfo />
        <div className="flex items-center gap-6">
          <img src={martianIcon} alt="Dino Isekai" className="w-24 h-24 object-contain drop-shadow-xl" draggable={false} />

          <div className="text-left">
            <div className="rounded-2xl blur-glass bg-black/40 backdrop-blur-sm border border-white/10 p-6">
              <h1 className="text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">Minecraft</h1>
              <div className="flex items-center gap-2.5 mt-4">
                <Clock size={22} weight="duotone" className="text-violet-400" />
                <span className="text-2xl font-bold text-violet-300">Sắp ra mắt</span>
              </div>
              <p className="text-sm text-white/45 mt-2">Tính năng này đang được phát triển. Hãy quay lại sau!</p>
            </div>

            <div className="mt-4 rounded-2xl blur-glass bg-black/40 backdrop-blur-sm border border-white/10 px-5 py-4">
              <p className="text-sm text-white/50">Trạng thái: Sắp ra mắt</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-7 flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl border border-white/15 text-white/50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        >
          <User size={26} weight="duotone" />
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-7 h-14 rounded-2xl font-bold text-base border border-white/15 text-white/50 cursor-not-allowed"
          style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        >
          <PlayCircle size={26} weight="fill" />
          Sắp ra mắt
        </button>
        <div
          className="w-14 h-14 rounded-2xl border border-white/15 text-white/50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        >
          <Gear size={26} weight="duotone" />
        </div>
      </div>
    </div>
  )
}
