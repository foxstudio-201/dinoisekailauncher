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

import { useEffect, useRef } from 'react'
import notifySound from '../assets/sound/notify.mp3'
import { useLang } from '../i18n/LangProvider'

const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
  ),
}

const STYLES = {
  success: {
    icon:    'text-violet-400',
    iconBg:  'bg-violet-500/15',
    border:  'border-violet-500/25',
    bar:     'bg-violet-500',
  },
  error: {
    icon:    'text-red-400',
    iconBg:  'bg-red-500/15',
    border:  'border-red-500/25',
    bar:     'bg-red-500',
  },
  warning: {
    icon:    'text-yellow-400',
    iconBg:  'bg-yellow-500/15',
    border:  'border-yellow-500/25',
    bar:     'bg-yellow-500',
  },
  info: {
    icon:    'text-blue-400',
    iconBg:  'bg-blue-500/15',
    border:  'border-blue-500/25',
    bar:     'bg-blue-400',
  },
}

export default function Toast({ toast, visible, onDismiss }) {
  const audioRef = useRef(null)

  useEffect(() => {
    if (visible && toast) {
      if (!audioRef.current) {
        audioRef.current = new Audio(notifySound)
        audioRef.current.volume = 0.5
      }

      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
  }, [visible, toast?.id])

  if (!toast) return null

  const s = STYLES[toast.type] ?? STYLES.info

  return (
    <div
      className={`
        fixed bottom-5 right-5 z-[9999] w-80
        transition-all duration-300 ease-out
        ${visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }
      `}
    >
      <div className={`
        relative overflow-hidden rounded-xl
        border ${s.border}
        shadow-2xl shadow-black/50
        backdrop-blur-sm
      `} style={{ background: 'rgba(14,14,14,0.98)' }}>
        {}
        <div
          className={`absolute top-0 left-0 h-[2px] ${s.bar} ${visible ? 'animate-toast-bar' : ''}`}
          style={{ width: visible ? '0%' : '100%' }}
        />

        <div className="flex items-start gap-3 px-4 py-3.5">
          {}
          <div className={`w-7 h-7 rounded-lg ${s.iconBg} ${s.icon} flex items-center justify-center flex-shrink-0 mt-0.5`}>
            {ICONS[toast.type]}
          </div>

          {}
          <div className="flex-1 min-w-0 pt-0.5">
            {toast.title && (
              <p className="text-sm font-semibold text-white leading-tight">{toast.title}</p>
            )}
            {toast.message && (
              <p className={`text-xs text-white/50 leading-relaxed ${toast.title ? 'mt-0.5' : ''}`}>
                {toast.message}
              </p>
            )}
          </div>

          {}
          <button
            onClick={onDismiss}
            className="w-5 h-5 flex items-center justify-center rounded text-white/20 hover:text-white/60 transition-colors flex-shrink-0 mt-0.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

