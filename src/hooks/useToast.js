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

import { createContext, useContext, useState, useCallback, useRef } from 'react'

export const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx.show
}

export function useToastState() {

  const [toast, setToast]       = useState(null)
  const [visible, setVisible]   = useState(false)
  const hideTimer  = useRef(null)
  const resetTimer = useRef(null)

  const show = useCallback(({ type = 'info', title, message, duration = 3500 }) => {

    clearTimeout(hideTimer.current)
    clearTimeout(resetTimer.current)

    if (visible) {
      setVisible(false)
      resetTimer.current = setTimeout(() => {
        setToast({ id: Date.now(), type, title, message })
        setVisible(true)
        scheduleHide(duration)
      }, 280)
    } else {
      setToast({ id: Date.now(), type, title, message })
      setVisible(true)
      scheduleHide(duration)
    }

    function scheduleHide(ms) {
      hideTimer.current = setTimeout(() => setVisible(false), ms)
    }
  }, [visible])

  const dismiss = useCallback(() => {
    clearTimeout(hideTimer.current)
    clearTimeout(resetTimer.current)
    setVisible(false)
  }, [])

  return { toast, visible, show, dismiss }
}

