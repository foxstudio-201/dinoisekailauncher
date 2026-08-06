import { useState, useCallback, useEffect } from 'react'
import { getFileExt } from '../../../utils/fileExt'
import { isElectron, Icons, formatBytes, formatDate, LoadingState, EmptyState } from './shared'
import { useLang } from '../../../i18n/LangProvider'

function ProfileFileIcon({ name, isDir }) {
  if (isDir) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-400/70 flex-shrink-0">
        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>
    )
  }
  const ext = getFileExt(name)
  if (['zip', 'gz', 'tar'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-purple-400/70 flex-shrink-0">
        <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V6h2v2z"/>
      </svg>
    )
  }
  if (['json', 'yml', 'yaml', 'properties', 'toml', 'xml', 'conf', 'cfg', 'ini'].includes(ext)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-blue-400/70 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white/20 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
    </svg>
  )
}

export default function FilesTab({ profile }) {
  const { t } = useLang()
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  const loadDir = useCallback(async (subPath = '') => {
    if (!isElectron || !profile?.id) return
    setLoading(true)
    try {
      const r = await window.electronAPI.profileListDirFull(profile.id, subPath)
      setEntries(r?.ok ? (r.entries || []) : [])
      setCurrentPath(subPath)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    const timer = setTimeout(() => { loadDir('') }, 0)
    return () => clearTimeout(timer)
  }, [loadDir])

  const breadcrumbs = currentPath ? currentPath.split(/[\\/]/).filter(Boolean) : []

  return (
    <div className="p-4 h-full flex flex-col gap-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/4 border border-white/6 min-h-[44px]">
        <div className="flex items-center gap-1 text-[11px] flex-1 min-w-0 overflow-hidden">
          <button onClick={() => loadDir('')} className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0">root</button>
          {breadcrumbs.map((part, i, arr) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              <span className="text-white/20 flex-shrink-0">/</span>
              <button
                onClick={() => loadDir(arr.slice(0, i + 1).join('/'))}
                className={`truncate max-w-[110px] ${i === arr.length - 1 ? 'text-white/70' : 'text-white/40 hover:text-white/70'}`}
              >
                {part}
              </button>
            </span>
          ))}
        </div>
        <button
          onClick={() => loadDir(currentPath)}
          disabled={loading}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all disabled:opacity-30"
          title={t('profileSettings.files.refresh')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}>
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 min-h-0 rounded-2xl bg-black/20 border border-white/6 overflow-hidden">
        {loading ? (
          <LoadingState text={t('profileSettings.files.loading')} />
        ) : !entries.length ? (
          <EmptyState icon={Icons.files} title={t('profileSettings.files.emptyTitle')} desc={t('profileSettings.files.emptyDesc')} />
        ) : (
          <div className="h-full overflow-y-auto px-2 py-2">
            <div className="divide-y divide-white/5">
              {entries.map(entry => (
                <button
                  key={entry.path}
                  onClick={() => entry.isDir && loadDir(entry.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${entry.isDir ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
                >
                  <ProfileFileIcon name={entry.name} isDir={entry.isDir} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white/85 truncate">{entry.name}</div>
                    <div className="text-[11px] text-white/30 flex items-center gap-2">
                      <span>{entry.isDir ? t('profileSettings.files.folder') : t('profileSettings.files.file')}</span>
                      {!entry.isDir && <span>{formatBytes(entry.size || 0)}</span>}
                      {entry.mtime ? <span>{formatDate(entry.mtime)}</span> : null}
                    </div>
                  </div>
                  {entry.isDir && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-white/20 flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
