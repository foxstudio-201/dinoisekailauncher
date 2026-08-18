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
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { loadAppSettings } from '../utils/appSettings'

const MAX_PARTICLES = 24

export default function CursorTrail() {
  const [particles, setParticles] = useState([])
  const [enabled, setEnabled] = useState(true)
  const lastPos = useRef(null)
  const lastSpawn = useRef(0)
  const counter = useRef(0)

  useEffect(() => {
    let mounted = true
    loadAppSettings().then(s => { if (mounted) setEnabled(s.starTrail !== false) })

    function onSettings(e) {
      if (e.detail) {
        setEnabled(e.detail.starTrail !== false)
      } else {
        loadAppSettings().then(s => setEnabled(s.starTrail !== false))
      }
    }
    window.addEventListener('vxc-settings-changed', onSettings)
    return () => {
      mounted = false
      window.removeEventListener('vxc-settings-changed', onSettings)
    }
  }, [])

  useEffect(() => {
    function onMove(e) {
      const now = performance.now()
      const x = e.clientX
      const y = e.clientY
      const last = lastPos.current
      if (!last) {
        lastPos.current = { x, y }
        return
      }
      const dist = Math.hypot(x - last.x, y - last.y)
      if (dist < 16) return
      if (now - lastSpawn.current < 55) return
      lastSpawn.current = now
      lastPos.current = { x, y }

      const id = ++counter.current
      const size = 7 + Math.random() * 9
      const dur = 750 + Math.random() * 650
      const rot = Math.random() * 360
      const delay = Math.random() * 140
      const dx = (Math.random() - 0.5) * 90
      const dy = (Math.random() - 0.5) * 90

      setParticles(prev => {
        const next = [...prev, { id, x, y, size, dur, rot, delay, dx, dy }]
        return next.length > MAX_PARTICLES ? next.slice(next.length - MAX_PARTICLES) : next
      })
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== id))
      }, dur + delay + 200)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  if (!enabled) return null

  return createPortal(
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2147483647 }}>
      {particles.map(p => (
        <div
          key={p.id}
          className="star-trail absolute"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            ['--rot']: `${p.rot}deg`,
            ['--dx']: `${p.dx}px`,
            ['--dy']: `${p.dy}px`,
            animationDuration: `${p.dur}ms`,
            animationDelay: `${p.delay}ms`,
          }}
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="#c4b5fd">
            <path d="M12 0l2.6 7.6 8 1.4-6 5.6 1.8 7.9-6.4-4.6-6.4 4.6L8 14.6 2 9l8-1.4z" />
          </svg>
        </div>
      ))}
      <style>{`
        .star-trail{opacity:0;filter:drop-shadow(0 0 4px #a78bfa) drop-shadow(0 0 10px rgba(167,139,250,.9)) drop-shadow(0 0 18px rgba(139,92,246,.55));animation-name:star-pop;animation-timing-function:linear;animation-fill-mode:both}
        @keyframes star-pop{
          0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--rot,0deg)) scale(.15)}
          22%{opacity:1;transform:translate(-50%,-50%) rotate(var(--rot,0deg)) scale(1)}
          45%{opacity:.95}
          100%{opacity:0;transform:translate(calc(-50% + var(--dx,0px)),calc(-50% + var(--dy,0px))) rotate(var(--rot,0deg)) scale(0)}
        }
      `}</style>
    </div>,
    document.body
  )
}
