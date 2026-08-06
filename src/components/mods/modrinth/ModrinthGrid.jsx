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

import ModrinthCard from './ModrinthCard'

export default function ModrinthGrid({ results, loading, error, view, onSelect, hasMore, onLoadMore }) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <svg className="w-8 h-8 text-red-400/50" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p className="text-red-400/70 text-sm">{error}</p>
      </div>
    )
  }

  if (!loading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <svg className="w-8 h-8 text-white/10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <p className="text-white/25 text-sm">No results found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex-1 overflow-y-auto pr-1"
        style={{ scrollbarColor: 'rgba(255,255,255,0.10) transparent' }}
      >
        {view === 'grid' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 p-1">
            {results.map(p => (
              <ModrinthCard key={p.project_id} project={p} view="grid" onClick={onSelect} />
            ))}
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl p-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-12 h-12 rounded-xl bg-white/5 mb-3" />
                <div className="h-3 bg-white/5 rounded mb-2 w-3/4" />
                <div className="h-2 bg-white/5 rounded mb-1 w-full" />
                <div className="h-2 bg-white/5 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-1">
            {results.map(p => (
              <ModrinthCard key={p.project_id} project={p} view="list" onClick={onSelect} />
            ))}
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-10 h-10 rounded-lg bg-white/5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-white/5 rounded mb-1.5 w-1/3" />
                  <div className="h-2 bg-white/5 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {}
        {hasMore && !loading && (
          <div className="flex justify-center py-4">
            <button
              onClick={onLoadMore}
              className="px-6 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

