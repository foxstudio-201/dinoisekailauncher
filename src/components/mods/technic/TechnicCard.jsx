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

import {
  DownloadSimple,
  Heart,
} from '@phosphor-icons/react'

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const CATEGORY_COLORS = {
  fabric:   'bg-purple-500/20 text-purple-300',
  forge:    'bg-violet-500/20 text-violet-300',
  neoforge: 'bg-rose-500/20 text-rose-300',
  quilt:    'bg-blue-500/20 text-blue-300',
  vanilla:  'bg-violet-500/20 text-violet-300',
}

function GridCard({ project, onClick }) {
  const loaderBadges = (project.categories || [])
    .filter(c => ['fabric','forge','neoforge','quilt','vanilla'].includes(c))
    .slice(0, 3)

  return (
    <button
      onClick={() => onClick(project)}
      className="group text-left rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer relative"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        minHeight: 110,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)'
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.5)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        {project.icon_url ? (
          <>
            {}
            <img
              src={project.icon_url}
              alt=""
              className="absolute right-0 top-0 h-full"
              style={{
                width: '60%',
                objectFit: 'cover',
                objectPosition: 'center',
                filter: 'blur(6px)',
                opacity: 0.8,
                transform: 'scale(1.1)',
                transformOrigin: 'right center',
              }}
              loading="lazy"
            />
            {}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, rgba(10,10,10,1) 0%, rgba(10,10,10,0.92) 35%, rgba(10,10,10,0.55) 65%, rgba(10,10,10,0.2) 100%)',
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'rgba(14,14,14,0.98)' }} />
        )}
      </div>

      {}
      <div className="relative z-10 p-3.5 flex gap-3 h-full">
        {}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-black/30 flex items-center justify-center ring-1 ring-white/10">
          {project.icon_url
            ? <img src={project.icon_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            : <svg className="w-7 h-7 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
          }
        </div>

        {}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <p className="text-white text-sm font-semibold leading-snug line-clamp-1 mb-1 group-hover:text-violet-400 transition-colors">
              {project.title}
            </p>
            <p className="text-white/55 text-xs leading-relaxed line-clamp-2">
              {project.description || <span className="text-white/25 italic">technicpack.net/{project.slug}</span>}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            {}
            <div className="flex flex-wrap gap-1">
              {loaderBadges.map(l => (
                <span key={l} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${CATEGORY_COLORS[l] || 'bg-white/10 text-white/40'}`}>
                  {l}
                </span>
              ))}
            </div>
            {}
            {(project.downloads > 0 || project.follows > 0) && (
              <div className="flex items-center gap-2 text-[10px] flex-shrink-0">
                {project.downloads > 0 && (
                  <span className="flex items-center gap-1 text-violet-400/70">
                    <DownloadSimple size={12} weight="duotone" />
                    {formatNumber(project.downloads)}
                  </span>
                )}
                {project.follows > 0 && (
                  <span className="flex items-center gap-1 text-pink-400/70">
                    <Heart size={12} weight="duotone" />
                    {formatNumber(project.follows)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function ListCard({ project, onClick }) {
  const loaderBadges = (project.categories || [])
    .filter(c => ['fabric','forge','neoforge','quilt','vanilla'].includes(c))
    .slice(0, 3)

  return (
    <button
      onClick={() => onClick(project)}
      className="group w-full text-left flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-150"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(167,139,250,0.25)'
        e.currentTarget.style.background = 'rgba(167,139,250,0.04)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
      }}
    >
      {}
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
        {project.icon_url
          ? <img src={project.icon_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          : <svg className="w-6 h-6 text-white/20" fill="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
        }
      </div>

      {}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate group-hover:text-violet-400 transition-colors mb-0.5">
          {project.title}
        </p>
        <p className="text-white/45 text-xs truncate mb-1.5">
          {project.description || <span className="text-white/25 italic">technicpack.net/{project.slug}</span>}
        </p>
        {loaderBadges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {loaderBadges.map(l => (
              <span key={l} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${CATEGORY_COLORS[l] || 'bg-white/10 text-white/40'}`}>{l}</span>
            ))}
          </div>
        )}
      </div>

      {}
      {(project.downloads > 0 || project.follows > 0) && (
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 w-16">
          {project.downloads > 0 && (
            <span className="flex items-center gap-1 text-xs text-violet-400/80">
              <DownloadSimple size={14} weight="duotone" className="flex-shrink-0" />
              {formatNumber(project.downloads)}
            </span>
          )}
          {project.follows > 0 && (
            <span className="flex items-center gap-1 text-xs text-pink-400/70">
              <Heart size={14} weight="duotone" className="flex-shrink-0" />
              {formatNumber(project.follows)}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

export default function TechnicCard({ project, view = 'grid', onClick }) {
  if (view === 'grid') return <GridCard project={project} onClick={onClick} />
  return <ListCard project={project} onClick={onClick} />
}

