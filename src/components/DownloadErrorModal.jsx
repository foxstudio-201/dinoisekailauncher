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
import { useState } from 'react'
import { Check, Copy } from '@phosphor-icons/react'

export default function DownloadErrorModal({ error, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!error) return null
  const isResource = error.type === 'resource'
  const isBase = error.type === 'base'
  const title = isResource ? 'Lỗi tải tài nguyên' : isBase ? 'Lỗi tải dữ liệu gốc' : 'Lỗi tải dữ liệu server'
  const subtitle = isResource ? 'Tải tài nguyên không thành công' : isBase ? 'Cập nhật dữ liệu gốc không thành công' : 'Đồng bộ dữ liệu không thành công'
  const fullText = [
    error.message || 'Lỗi không xác định',
    error.stack ? `\n\n${error.stack}` : '',
  ].join('')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = fullText
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div
        className="border border-violet-500/15 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col"
        style={{ background: 'rgba(23,16,36,0.98)' }}
      >
        {}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400">
              <path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z"/>
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white/90">
              {title}
            </h3>
            <p className="text-[11px] text-white/40 mt-0.5">
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-all"
            title="Đóng"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm text-white/75 leading-relaxed">
            Không thể {isResource ? 'tải tài nguyên' : 'tải dữ liệu'}. Vui lòng kiểm tra kết nối mạng và thử lại.
          </p>
          <div className="rounded-xl bg-[#14101f] border border-violet-500/10 p-3 font-mono text-[11px] leading-relaxed text-red-300 overflow-y-auto max-h-64 whitespace-pre-wrap break-all select-text">
            {fullText}
          </div>
        </div>

        {}
        <div className="px-5 py-4 border-t border-white/5 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="px-5 py-2 rounded-lg bg-white/10 text-white/90 text-sm font-bold hover:bg-white/20 transition-all"
          >
            {copied ? (
              <>
                <Check size={16} weight="bold" className="inline-block mr-1 -mt-0.5 text-emerald-400" />
                Đã copy
              </>
            ) : (
              <>
                <Copy size={16} className="inline-block mr-1 -mt-0.5" />
                Copy lỗi
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-violet-500 text-white text-sm font-bold hover:bg-violet-400 transition-all"
          >
            <Check size={16} weight="bold" className="inline-block mr-1 -mt-0.5" />
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  )
}