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
import { useState, useCallback, useEffect } from 'react'
import { getFileExt } from '../utils/fileExt'

const isElectron = typeof window !== 'undefined' && window.electronAPI

function fmtBytes(b) {
  if (b == null) return ''
  if (b >= 1024 * 1024 * 1024) return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB'
  return (b / 1024).toFixed(0) + ' KB'
}

function FileIcon({ name, isDir }) {
  if (isDir) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-400/70 flex-shrink-0"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
  }
  const ext = getFileExt(name)
  if (['zip', 'gz', 'rar', 'tar'].includes(ext)) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-cyan-400/70 flex-shrink-0"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V6h2v2z"/></svg>
  }
  if (['json', 'yml', 'yaml', 'properties', 'toml', 'xml', 'conf', 'cfg', 'ini', 'txt'].includes(ext)) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-blue-400/70 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white/20 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
}

export default function ProfileFilesModal({ profile, onClose }) {
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState({})
  const [dragging, setDragging] = useState(false)
  const [dropToast, setDropToast] = useState('')
  const [presetOpen, setPresetOpen] = useState(false)
  const [preset, setPreset] = useState(null)

  const PRESETS = [
    { key: 'mc', label: 'mods + config', targets: ['config', 'mods'] },
    { key: 'cmk', label: 'config + mods + kubejs', targets: ['config', 'mods', 'kubejs'] },
    { key: 'all', label: 'toàn bộ (config, mods, kubejs, .dinobase_version, .dinosync_version)', targets: ['config', 'mods', 'kubejs', '.dinobase_version', '.dinosync_version'] },
  ]

  async function applyPreset(p) {
    setPresetOpen(false)
    setPreset(p.key)
    setLoading(true)
    setSelected({})
    try {
      const r = await window.electronAPI.profileListDirFull(profile.id, '')
      const list = r?.ok ? (r.entries || []) : []
      setEntries(list)
      setCurrentPath('')
      const targetNames = new Set(p.targets.map(t => t.toLowerCase()))
      const next = {}
      list.forEach(e => { if (targetNames.has(e.name.toLowerCase())) next[e.path] = true })
      setSelected(next)
      const count = Object.keys(next).length
      setDropToast(count ? `Đã chọn ${count} mục theo preset: ${p.label}` : `Không tìm thấy mục nào của preset: ${p.label}`)
      setTimeout(() => setDropToast(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const loadDir = useCallback(async (subPath = '') => {
    if (!isElectron || !profile?.id) return
    setLoading(true)
    setSelected({})
    try {
      const r = await window.electronAPI.profileListDirFull(profile.id, subPath)
      setEntries(r?.ok ? (r.entries || []) : [])
      setCurrentPath(subPath)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    loadDir('')
  }, [loadDir])

  const breadcrumbs = currentPath ? currentPath.split(/[\\/]/).filter(Boolean) : []
  const filtered = entries.filter(e =>
    !query || e.name.toLowerCase().includes(query.toLowerCase())
  )
  const hasSelection = Object.values(selected).some(Boolean)

  async function deleteSelected() {
    const targets = entries.filter(e => selected[e.path])
    if (!targets.length) return
    for (const t of targets) {
      await window.electronAPI.profileDeletePath(profile.id, t.path)
    }
    loadDir(currentPath)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer?.files || [])
      .map(f => (window.electronAPI?.getFilePath ? window.electronAPI.getFilePath(f) : f.path))
      .filter(Boolean)
    if (!files.length || !profile?.id) {
      setDropToast('Không đọc được file. Thử kéo từ thư mục khác.')
      setTimeout(() => setDropToast(''), 3000)
      return
    }
    setDropToast(`Đang tải ${files.length} file lên...`)
    window.electronAPI.profileUploadTo(profile.id, currentPath, files).then(r => {
      const okCount = (r?.results || []).filter(x => x.ok).length
      const failCount = (r?.results || []).length - okCount
      if (okCount) {
        setDropToast(`Đã tải ${okCount} file thành công.`)
      } else {
        setDropToast('Không tải được file nào.')
      }
      setTimeout(() => setDropToast(''), 3000)
      loadDir(currentPath)
    }).catch(() => {
      setDropToast('Tải file thất bại.')
      setTimeout(() => setDropToast(''), 3000)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="border border-blue-500/15 rounded-2xl w-full max-w-3xl flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #0c1526 0%, #05070d 55%, #03040a 100%)', maxHeight: '85vh' }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-300"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white/90">Quản lý file profile</h3>
            <p className="text-[11px] text-white/40 mt-0.5">{profile?.name}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {}
            <div className="relative">
              <button
                onClick={() => setPresetOpen(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 h-7 rounded-lg transition-all ${
                  presetOpen ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300' : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'
                }`}
                data-tip="Xóa nhanh theo nhóm"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V6h2v2z"/></svg>
                <span className="text-[11px] font-bold">Xóa nhanh</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-3 h-3 transition-transform ${presetOpen ? 'rotate-180' : ''}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {presetOpen && (
                <>
                  <div className="fixed inset-0 z-[9999]" onClick={() => setPresetOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-[320px] rounded-2xl border border-blue-500/20 bg-gradient-to-b from-[#0f1a30]/95 to-[#05070d]/98 backdrop-blur-md shadow-2xl shadow-black/60 overflow-hidden z-[10000] origin-top-right animate-[page-in-f_.18s_ease_both]">
                    <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-white/40">XÓA NHANH THEO NHÓM</span>
                      <button onClick={() => setPresetOpen(false)} className="text-white/30 hover:text-white/70 transition-colors">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                      </button>
                    </div>
                    {PRESETS.map((p, i) => (
                      <button
                        key={p.key}
                        onClick={() => applyPreset(p)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-blue-500/10 ${i > 0 ? 'border-t border-white/5' : ''}`}
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${preset === p.key ? 'bg-blue-500/25 text-blue-300' : 'bg-red-500/15 text-red-400'}`}>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[12px] font-bold ${preset === p.key ? 'text-blue-300' : 'text-white/85'}`}>{p.label}</span>
                          <span className="block text-[10px] text-white/35 mt-0.5">Chọn &amp; xóa: {p.targets.join(', ')}</span>
                        </span>
                        {preset === p.key && (
                          <span className="w-5 h-5 rounded-full bg-blue-500/25 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 text-blue-300"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-all">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        </div>

        {}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 flex-shrink-0">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25">
              <circle cx="11" cy="11" r="7"/><path strokeLinecap="round" d="M20 20l-3.5-3.5"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm kiếm file..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-blue-500/40"
            />
          </div>
          <button
            onClick={deleteSelected}
            disabled={!hasSelection}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              hasSelection ? 'bg-red-500/80 text-white hover:bg-red-500' : 'bg-white/5 text-white/25 cursor-not-allowed'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            Xóa ({Object.values(selected).filter(Boolean).length})
          </button>
        </div>

        {}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-white/5 flex-shrink-0">
          <button onClick={() => loadDir('')} className="text-[11px] text-blue-300 hover:text-blue-200 transition-colors flex-shrink-0">root</button>
          {breadcrumbs.map((part, i, arr) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              <span className="text-white/20 flex-shrink-0">/</span>
              <button onClick={() => loadDir(arr.slice(0, i + 1).join('/'))}
                className={`truncate max-w-[120px] text-[11px] ${i === arr.length - 1 ? 'text-white/70' : 'text-white/40 hover:text-white/70'}`}>
                {part}
              </button>
            </span>
          ))}
        </div>

        {}
        <div className="flex-1 min-h-0 overflow-y-auto p-3" style={{ scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-white/30 text-xs">Đang tải...</div>
          ) : !filtered.length ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-white/25">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
              <span className="text-xs">Không có file</span>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map(entry => (
                <div key={entry.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${entry.isDir ? 'hover:bg-white/5' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={!!selected[entry.path]}
                    onChange={e => setSelected(s => ({ ...s, [entry.path]: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500 flex-shrink-0"
                  />
                  <button
                    onClick={() => entry.isDir && loadDir(entry.path)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <FileIcon name={entry.name} isDir={entry.isDir} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white/85 truncate">{entry.name}</div>
                      <div className="text-[11px] text-white/30 flex items-center gap-2">
                        <span>{entry.isDir ? 'Thư mục' : 'File'}</span>
                        {!entry.isDir && <span>{fmtBytes(entry.size || 0)}</span>}
                      </div>
                    </div>
                    {entry.isDir && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-white/20 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {}
        <div className={`px-5 py-2 border-t border-white/5 text-[11px] text-center flex-shrink-0 transition-colors ${
          dragging ? 'bg-blue-500/15 text-blue-300' : 'text-white/25'
        }`}>
          {dragging ? 'Thả để tải file vào thư mục này' : 'Kéo & thả file vào đây để tải lên thư mục hiện tại'}
        </div>
        {dropToast && (
          <div className="px-5 py-2 text-[11px] text-center bg-emerald-500/15 text-emerald-300 border-t border-white/5 flex-shrink-0">{dropToast}</div>
        )}
      </div>
    </div>
  )
}
