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

import { useState, useEffect, useRef } from 'react'
import FtbGrid from './FtbGrid'
import FtbDetail from './FtbDetail'
import ViewToggle from '../shared/ViewToggle'
import TabLoadingOverlay from '../shared/TabLoadingOverlay'
import { useFtbSearch } from './useFtb'

const DEFAULT_FILTERS = { query: '' }

export default function FtbTab() {
  const [filters, setFilters]         = useState(DEFAULT_FILTERS)
  const [view, setView]               = useState('grid')
  const [selectedProject, setProject] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [tabLoading, setTabLoading]   = useState(false)
  const tabLoadingTimer               = useRef(null)

  const { results, total, loading, error, loadMore, hasMore } = useFtbSearch(filters)

  useEffect(() => {
    if (!loading && tabLoading) {
      tabLoadingTimer.current = setTimeout(() => setTabLoading(false), 120)
    }
    return () => clearTimeout(tabLoadingTimer.current)
  }, [loading, tabLoading])

  function handleSearch(e) {
    e.preventDefault()
    setFilters({ query: searchInput })
    setProject(null)
  }

  function handleSelectProject(project) {
    setProject({ id: project.project_id })
  }

  if (selectedProject) {
    return (
      <FtbDetail
        projectId={selectedProject.id}
        onBack={() => setProject(null)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-3 pb-2 space-y-2">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search FTB modpacks..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
          <ViewToggle view={view} onChange={setView} />
        </form>

        <div className="flex items-center justify-center min-h-[18px]">
          {loading ? (
            <div className="w-full h-0.5 rounded-full overflow-hidden bg-white/5">
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #8b5cf6 40%, #7c3aed 60%, transparent 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'ftb-shimmer-bar 1.4s linear infinite',
                  width: '100%',
                }}
              />
            </div>
          ) : total > 0 ? (
            <p className="text-sm font-semibold text-white/75">
              {total.toLocaleString()}
              <span className="text-white/40 font-normal text-xs ml-1">results</span>
            </p>
          ) : null}
        </div>

        <style>{`
          @keyframes ftb-shimmer-bar {
            0%   { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
        `}</style>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden px-2 py-1 relative" style={{ isolation: 'isolate' }}>
          <TabLoadingOverlay visible={tabLoading} />
          <FtbGrid
            results={results}
            loading={loading}
            error={error}
            view={view}
            onSelect={handleSelectProject}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        </div>
      </div>
    </div>
  )
}

