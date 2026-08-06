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

export function initGlobalSmoothScroll() {

  const STEP   = 100

  const LERP   = 0.12

  const SNAP   = 0.5

  const states = new WeakMap()

  function getState(el) {
    if (!states.has(el)) {
      states.set(el, {
        current: el.scrollTop,
        target:  el.scrollTop,
        rafId:   null,
      })
    }
    return states.get(el)
  }

  function getScrollParent(el) {
    let node = el
    while (node && node !== document.documentElement) {
      const ov = window.getComputedStyle(node).overflowY
      if ((ov === 'auto' || ov === 'scroll') && node.scrollHeight > node.clientHeight + 1)
        return node
      node = node.parentElement
    }
    return null
  }

  function tick(el) {
    const s   = states.get(el)
    if (!s) return

    const dist = s.target - s.current

    if (Math.abs(dist) < SNAP) {

      s.current  = s.target
      el.scrollTop = s.target
      s.rafId    = null
      return
    }

    s.current   += dist * LERP
    el.scrollTop = s.current
    s.rafId      = requestAnimationFrame(() => tick(el))
  }

  function getScrollParentAndSync(el) {
    const scrollEl = getScrollParent(el)
    if (!scrollEl) return null

    const s = getState(scrollEl)
    if (Math.abs(scrollEl.scrollTop - s.current) > 2) {
      s.current = scrollEl.scrollTop
      s.target  = scrollEl.scrollTop
    }
    return scrollEl
  }

  function onWheel(e) {
    if (e.ctrlKey) return
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

    const scrollEl = getScrollParentAndSync(e.target)
    if (!scrollEl) return

    e.preventDefault()
    e.stopPropagation()

    let delta = e.deltaY
    if (e.deltaMode === 1) delta *= 20
    if (e.deltaMode === 2) delta *= 300

    const normalized = (delta / 100) * STEP

    const s   = getState(scrollEl)
    const max = scrollEl.scrollHeight - scrollEl.clientHeight

    s.target = Math.max(0, Math.min(max, s.target + normalized))

    if (!s.rafId) {
      s.rafId = requestAnimationFrame(() => tick(scrollEl))
    }
  }

  document.addEventListener('wheel', onWheel, { passive: false })
  return () => document.removeEventListener('wheel', onWheel)
}

export function useSmoothScroll() {}

