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

export default function LogPanel({ logs = [], onClose }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="w-[420px] h-[400px] blur-glass rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex flex-col overflow-hidden flex-shrink-0">
      {}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-semibold text-white/60">Console</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigator.clipboard.writeText(logs.join('\n'))}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-all"
            title="Copy logs"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-all"
            title="Đóng"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      {}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
        style={{ scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-white/20 text-[11px]">Waiting for logs...</span>
          </div>
        ) : (
          logs.map((line, i) => {
            const isLauncher = line.startsWith('[Launcher]')
            const isError = line.startsWith('[ERR]')
            const isWarn = line.startsWith('[WARN]')
            if (isLauncher) {
              const bracket = line.match(/^(\[Launcher\])\s*/)
              if (bracket) {
                const prefix = bracket[0]
                const rest = line.slice(prefix.length)
                return (
                  <div key={i} className="py-[1px] whitespace-pre-wrap break-all">
                    <span className="text-green-400">{prefix}</span>
                    <span className="text-white/60">{rest}</span>
                  </div>
                )
              }
            }
            return (
              <div key={i} className="py-[1px] whitespace-pre-wrap break-all">
                <span className={`${isError ? 'text-red-400' : isWarn ? 'text-yellow-400' : 'text-white/60'}`}>
                  {line}
                </span>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
