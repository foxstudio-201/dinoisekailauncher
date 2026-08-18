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
import { useEffect, useState } from 'react'
import { Cpu, GraphicsCard } from '@phosphor-icons/react'

const isElectron = typeof window !== 'undefined' && window.electronAPI




function splitLines(name) {
  const n = String(name || '').trim()
  if (!n) return ['', '']

  
  const b = n.match(/^(.+?)\s*\[\s*([^\]]+)\s*\]\s*$/)
  if (b && b[1] && b[2]) return [b[1].trim(), b[2].trim()]

  
  const tokens = n.split(/\s+/)
  const idx = tokens.findIndex(t => /^(i\d|r\d|Ryzen|A\d|GeForce|Radeon|RTX|Arc|Quadro|Ultra|EPYC|PRO\d?)/i.test(t))
  if (idx > 0) return [tokens.slice(0, idx).join(' '), tokens.slice(idx).join(' ')]

  return [n, '']
}

function InfoCol({ Icon, iconCls, label, name }) {
  const [line1, line2] = splitLines(name)
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={20} weight="duotone" className={`${iconCls} flex-shrink-0`} />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">{label}</p>
        <p className="text-[11px] font-semibold text-white leading-snug">
          {line1}
          {line2 ? <span className="block">{line2}</span> : null}
        </p>
      </div>
    </div>
  )
}

export default function SystemInfo() {
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (!isElectron || !window.electronAPI.getSystemInfo) return
    let cancelled = false
    window.electronAPI.getSystemInfo()
      .then(r => { if (!cancelled && r) setInfo(r) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!info) return null

  return (
    <div
      className="absolute bottom-6 left-28 blur-glass flex items-center gap-4 px-4 py-3 rounded-2xl border border-white/10"
      style={{ backgroundColor: 'rgba(20,20,28,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <InfoCol Icon={Cpu} iconCls="text-cyan-400" label="CPU" name={info.cpu} />
      <div className="w-px h-9 bg-white/10" />
      <InfoCol Icon={GraphicsCard} iconCls="text-emerald-400" label="GPU" name={info.gpu} />
    </div>
  )
}
