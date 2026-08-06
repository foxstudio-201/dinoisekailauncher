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
import { useModrinthInstall } from '../modrinth/useModrinth'
import { useCurseForgeInstall } from '../curseforge/useCurseForge'
import { useTechnicInstall } from '../technic/useTechnic'
import { useFtbInstall } from '../ftb/useFtb'
import ModpackInstallModal from './ModpackInstallModal'
import { useAccounts } from '../../../hooks/useAccounts'

const isElectron = typeof window !== 'undefined' && window.electronAPI

const LOADER_COLORS = {
  fabric:   'text-purple-400',
  forge:    'text-violet-400',
  neoforge: 'text-rose-400',
  vanilla:  'text-violet-400',
}

function ProfileSelect({ profiles, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = profiles.find(p => p.id === value)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.1)'}`,
          color: selected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
        }}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <span className="truncate font-medium">{selected.name}</span>
              <span className="text-white/25 flex-shrink-0">{selected.gameVersion}</span>
              <span className={`text-[9px] capitalize flex-shrink-0 ${LOADER_COLORS[selected.loader] || 'text-white/40'}`}>
                {selected.loader}
              </span>
            </>
          ) : (
            <span>Select profile</span>
          )}
        </span>
        <svg className={`w-3.5 h-3.5 flex-shrink-0 text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
          style={{ background:'rgba(14,14,14,0.98)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 16px 40px rgba(0,0,0,0.7)', backdropFilter:'blur(12px)' }}>
          <div className="overflow-y-auto max-h-44 py-1">
            {profiles.length === 0 && (
              <div className="px-3 py-3 text-xs text-white/25 text-center">No profiles found</div>
            )}
            {profiles.map(p => {
              const isSelected = p.id === value
              return (
                <button key={p.id} type="button"
                  onClick={() => { onChange(p); setOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all duration-100"
                  style={{ background: isSelected ? 'rgba(167,139,250,0.1)' : 'transparent', color: isSelected ? '#a78bfa' : 'rgba(255,255,255,0.65)' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <span className="flex-1 text-xs font-semibold truncate">{p.name}</span>
                  <span className="text-[10px] text-white/25 flex-shrink-0">{p.gameVersion}</span>
                  <span className={`text-[9px] capitalize flex-shrink-0 ${LOADER_COLORS[p.loader] || 'text-white/40'}`}>{p.loader}</span>
                  {isSelected && (
                    <svg className="w-3 h-3 text-violet-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InstallModal({ project, versions, projectType, source = 'modrinth', onClose }) {
  const { selectedId } = useAccounts()

  if (projectType === 'modpack') {
    return (
      <ModpackInstallModal
        project={project}
        version={versions?.[0]}
        source={source}
        onClose={onClose}
      />
    )
  }
  const [profiles, setProfiles]       = useState([])
  const [selectedProfile, setProfile] = useState(null)
  const [selectedVersion, setVersion] = useState(null)

  const modrinthInstall = useModrinthInstall()
  const curseforgeInstall = useCurseForgeInstall()
  const technicInstall = useTechnicInstall()
  const ftbInstall = useFtbInstall()

  const installer = source === 'ftb' ? ftbInstall
    : source === 'technic' ? technicInstall
    : source === 'curseforge' ? curseforgeInstall
    : modrinthInstall
  const { install, installing, progress, error, done, reset } = installer

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.getProfiles().then(data => {
      const list = data?.profiles || []

      const isShader = projectType === 'shader'

      const isResourcePack = projectType === 'resourcepack'

      let displayList
      if (isShader) {
        displayList = list.filter(p => p.loader && p.loader !== 'vanilla')
      } else if (isResourcePack) {

        displayList = list
      } else {
        const versionLoaders = versions?.find(v => v.id === selectedVersion?.id)?.loaders
          || (selectedVersion?.loaders)
          || []
        const compatible = versionLoaders.length > 0
          ? list.filter(p => versionLoaders.includes(p.loader) || p.loader === 'vanilla')
          : list
        displayList = compatible.length > 0 ? compatible : list
      }

      setProfiles(displayList)
      setProfile(displayList.find(p => p.id === data?.selectedProfileId) || displayList[0] || null)
    })
  }, [selectedVersion, projectType])

  useEffect(() => {
    if (versions?.length > 0 && !selectedVersion) setVersion(versions[0])
  }, [versions])

  async function handleInstall() {
    if (!selectedVersion || !selectedProfile) return
    reset()
    await install({
      versionId:    selectedVersion.id,
      projectId:    selectedVersion.project_id,
      downloadUrl:  selectedVersion.files?.[0]?.url,
      filename:     selectedVersion.files?.[0]?.filename,
      fileLength:   selectedVersion.files?.[0]?.size,
      projectType,
      instancePath: selectedProfile.instancePath,
      accountId:    selectedId || null,
      deleteOldVersions: true,
    })
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background:'rgba(14,14,14,0.98)', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 24px 80px rgba(0,0,0,0.7)' }}>

        {}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            {project?.icon_url && (
              <img src={project.icon_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
            )}
            <div>
              <h3 className="text-white font-bold text-sm">{project?.title}</h3>
              <p className="text-white/30 text-xs capitalize">{projectType}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {}
          {selectedVersion && (
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1.5 block">
                Version
              </label>
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{selectedVersion.version_number}</p>
                  <p className="text-white/35 text-xs mt-0.5">
                    {selectedVersion.game_versions?.slice(0, 3).join(', ')}
                    {selectedVersion.loaders?.length > 0 && (
                      <span className="ml-1.5 text-white/25">· {selectedVersion.loaders.join(', ')}</span>
                    )}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${
                  selectedVersion.version_type === 'release' ? 'bg-violet-500/15 text-violet-400 border-violet-500/25' :
                  selectedVersion.version_type === 'beta'    ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' :
                  'bg-red-500/15 text-red-400 border-red-500/25'
                }`}>
                  {selectedVersion.version_type}
                </span>
              </div>
            </div>
          )}

          {}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1.5 block">
              Install to Profile
            </label>
            <ProfileSelect
              profiles={profiles}
              value={selectedProfile?.id || ''}
              onChange={p => setProfile(p)}
            />
          </div>

          {}
          {installing && progress && (
            <div className="rounded-xl p-3 bg-white/3 border border-white/8">
              <p className="text-xs text-white/50 mb-1.5">{progress.log}</p>
              {progress.total > 0 && (
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent}%` }} />
                </div>
              )}
            </div>
          )}

          {}
          {error && (
            <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {}
          {done && (
            <div className="rounded-xl p-3 bg-violet-500/10 border border-violet-500/20 flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <p className="text-xs text-violet-400 font-semibold">Installed successfully!</p>
            </div>
          )}

          {}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white transition-all border border-white/8 hover:bg-white/5">
              {done ? 'Close' : 'Cancel'}
            </button>
            {!done && (
              <button onClick={handleInstall}
                disabled={installing || !selectedVersion || !selectedProfile}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background:'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>
                {installing ? 'Installing...' : 'Install'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

