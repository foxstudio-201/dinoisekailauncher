/**
 * Dino Isekai — Crash Analyzer Modal
 * Tự động phân tích log crash, hiện root cause, tìm mod bị thiếu và cài đặt.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useLang } from '../../i18n/LangProvider'

const isElectron = typeof window !== 'undefined' && window.electronAPI

// ─── Parsers ──────────────────────────────────────────────────────────────────

export function isFabricIncompatibleCrash(logs) {
  return logs.some(l =>
    /Incompatible mod(s)? found/i.test(l) ||
    /FormattedException.*Incompatible/i.test(l) ||
    /net\.fabricmc\.loader.*FormattedException/i.test(l) ||
    /Some of your mods are incompatible/i.test(l)
  )
}

export function parseFabricCrashLogs(logs) {
  const missing = new Map()

  for (const line of logs) {
    const trimmed = line.trim()

    // ── Pattern 1: "- Install <modId>, version X or later."
    // ── Pattern 1b: "- Install <modId>, any version between X and Y."
    const installMatch = trimmed.match(
      /^[-*]\s+Install\s+([\w\-]+),\s+(.+?)\.?\s*$/i
    )
    if (installMatch) {
      const [, modId, versionDesc] = installMatch
      const key = modId.trim().toLowerCase()
      if (!missing.has(key))
        missing.set(key, {
          modId: key,
          displayName: modId.trim(),
          requiredVersion: versionDesc.trim(),
          requiredBy: [],
          action: 'install',
        })
      continue
    }

    // ── Pattern 2: "- Replace mod 'Name' (modId) X.Y.Z with any version..."
    const replaceMatch = trimmed.match(
      /^[-*]\s+Replace\s+mod\s+['"]?([^'"(]+)['"]?\s*\(([^)]+)\)\s+([\w.+\-]+)\s+with/i
    )
    if (replaceMatch) {
      const [, displayName, modId, currentVersion] = replaceMatch
      const key = modId.trim().toLowerCase()
      if (!missing.has(key))
        missing.set(key, {
          modId: key,
          displayName: displayName.trim(),
          currentVersion: currentVersion.trim(),
          requiredVersion: null,
          requiredBy: [],
          action: 'update',
        })
      continue
    }

    // ── Pattern 3: "- Mod 'Name' (modId) X requires ... of targetMod, which is missing!"
    // Bắt cả "any version between X and Y" và "version X or later"
    const reqMissingMatch = trimmed.match(
      /^[-*]?\s*Mod\s+['"]?([^'"(]+)['"]?\s*\(([^)]+)\)[^r]*requires\s+(?:version\s+)?([\w.+\-\[\],\s()]+?)\s+of\s+['"]?([\w\-\s]+?)['"]?,?\s+which\s+is\s+missing/i
    )
    if (reqMissingMatch) {
      const [, requiredByDisplay, , requiredVersion, targetModId] = reqMissingMatch
      const key = targetModId.trim().toLowerCase().replace(/\s+/g, '-')

      // Bỏ qua java — không phải mod cài được từ Modrinth
      if (key === 'java' || key === 'openjdk' || /java/i.test(key)) {
        // Vẫn ghi nhận nhưng mark là java issue
        if (!missing.has('__java_version__'))
          missing.set('__java_version__', {
            modId: '__java_version__',
            displayName: 'Java Runtime',
            requiredVersion: requiredVersion.trim(),
            requiredBy: [requiredByDisplay.trim()],
            action: 'java',
            isJava: true,
          })
        else
          missing.get('__java_version__').requiredBy.push(requiredByDisplay.trim())
        continue
      }

      if (!missing.has(key))
        missing.set(key, {
          modId: key,
          displayName: targetModId.trim(),
          requiredVersion: requiredVersion.trim(),
          requiredBy: [],
          action: 'install',
        })
      missing.get(key).requiredBy.push(requiredByDisplay.trim())
      continue
    }

    // ── Pattern 4: "requires version X or later of modId" (inline)
    const reqOfMatch = trimmed.match(
      /requires\s+version\s+([\w.+\-]+)\s+or\s+later\s+of\s+['"]?([\w\-]+)['"]?/i
    )
    if (reqOfMatch) {
      const [, version, modId] = reqOfMatch
      const key = modId.trim().toLowerCase()
      if (key === 'java' || /openjdk|jdk/i.test(key)) continue // skip java
      if (!missing.has(key))
        missing.set(key, {
          modId: key,
          displayName: modId.trim(),
          requiredVersion: version.trim() + ' or later',
          requiredBy: [],
          action: 'install',
        })
      continue
    }

    // ── Pattern 5: "Mod 'Name' (modId) requires version X+ of targetMod (currently ...)"
    const reqCurrentMatch = trimmed.match(
      /Mod\s+['"]?([^'"(]+)['"]?\s*\(([^)]+)\)\s+requires\s+version\s+([\w.+\-]+)\+?\s+of\s+['"]?([\w\-]+)['"]?\s+\(currently/i
    )
    if (reqCurrentMatch) {
      const [, requiredByDisplay, , requiredVersion, targetModId] = reqCurrentMatch
      const key = targetModId.trim().toLowerCase()
      if (key === 'java' || /openjdk|jdk/i.test(key)) continue
      if (!missing.has(key))
        missing.set(key, {
          modId: key,
          displayName: targetModId.trim(),
          requiredVersion: requiredVersion.trim(),
          requiredBy: [],
          action: 'update',
        })
      missing.get(key).requiredBy.push(requiredByDisplay.trim())
    }

    // ── Pattern 6: Fabric reason line "HARD_DEP_NO_CANDIDATE modId X.Y.Z {depends targetMod @ [>=A <B]}"
    const hardDepMatch = trimmed.match(
      /HARD_DEP(?:_NO_CANDIDATE)?\s+([\w\-]+)\s+[\w.+\-]+\s+\{depends\s+([\w\-]+)\s+@\s+\[([^\]]+)\]/i
    )
    if (hardDepMatch) {
      const [, requiredBy, targetModId, versionRange] = hardDepMatch
      const key = targetModId.trim().toLowerCase()
      if (key === 'java' || /openjdk|jdk/i.test(key)) continue
      if (!missing.has(key))
        missing.set(key, {
          modId: key,
          displayName: targetModId.trim(),
          requiredVersion: versionRange.trim(),
          requiredBy: [],
          action: 'install',
        })
      missing.get(key).requiredBy.push(requiredBy.trim())
    }
  }

  return Array.from(missing.values())
}

export function parseFabricFormattedException(logs) {
  const result = { mainMessage: null, solutions: [], incompatibleMods: [] }
  let inSolutions = false, inIncompatible = false

  for (const line of logs) {
    const trimmed = line.trim()
    if (/FormattedException.*Some of your mods/i.test(trimmed) || /Some of your mods are incompatible/i.test(trimmed)) {
      result.mainMessage = 'Một số mod của bạn không tương thích với game hoặc với nhau!'
      inSolutions = false; inIncompatible = false; continue
    }
    if (/A potential solution has been determined/i.test(trimmed)) { inSolutions = true; inIncompatible = false; continue }
    if (/Incompatible mods/i.test(trimmed) || /Mod incompatibilities/i.test(trimmed)) { inSolutions = false; inIncompatible = true; continue }
    if (inSolutions && /^[-*]\s+/.test(trimmed)) result.solutions.push(trimmed.replace(/^[-*]\s+/, ''))
    if (inIncompatible && /^[-*]\s+/.test(trimmed)) result.incompatibleMods.push(trimmed.replace(/^[-*]\s+/, ''))
  }
  return result
}

/**
 * Phân tích crash type từ toàn bộ log:
 * - fabric_incompatible
 * - out_of_memory
 * - forge_missing_dep
 * - java_exception  (generic Java exception)
 * - exit_code       (crash không có log)
 */
function analyzeCrash(logs, loader, exitCode) {
  const full = logs.join('\n')

  if (isFabricIncompatibleCrash(logs)) return 'fabric_incompatible'

  if (/java\.lang\.OutOfMemoryError/i.test(full)) return 'out_of_memory'

  if (/Missing or unsupported mandatory dependencies/i.test(full) ||
      /net\.minecraftforge.*dependency/i.test(full) ||
      /LoadingModList.*failed/i.test(full)) return 'forge_missing_dep'

  if (/Exception in thread|Caused by:|hs_err_pid/i.test(full)) return 'java_exception'

  return 'exit_code'
}

/** Lấy root exception message từ log */
function extractRootCause(logs) {
  // Ưu tiên "Caused by:" cuối cùng
  const causedByLines = logs.filter(l => /^\s*(Caused by:|Exception in thread|java\.\w+Exception|net\.\w+Exception)/i.test(l))
  if (causedByLines.length > 0) return causedByLines[causedByLines.length - 1].trim()

  // Fallback: dòng FATAL hoặc ERROR đầu tiên
  const fatalLine = logs.find(l => /FATAL|ERROR/i.test(l) && l.length > 20)
  return fatalLine?.trim() || null
}

/** Lấy các dòng liên quan nhất để hiển thị trong log preview */
function getRelevantLogLines(logs) {
  const relevant = []
  for (const line of logs) {
    if (/FATAL|ERROR|FormattedException|Incompatible|OutOfMemoryError|Exception in thread|Caused by:|hs_err_pid|crash-reports/i.test(line)) {
      relevant.push(line)
    }
  }
  // Nếu quá ít, lấy 30 dòng cuối
  if (relevant.length < 3) return logs.slice(-30)
  return relevant.slice(0, 40)
}

// ─── Modrinth search ──────────────────────────────────────────────────────────

/**
 * Tìm project trên Modrinth. Thử 2 lần:
 * 1. Tìm có filter gameVersion (chính xác hơn)
 * 2. Nếu không tìm thấy, tìm không filter (fallback)
 */
async function searchModrinthForMod(modId, gameVersion) {
  if (!isElectron) return null
  try {
    // Lần 1: tìm có filter version
    const facets1 = [['project_type:mod']]
    if (gameVersion) facets1.push([`versions:${gameVersion}`])
    const r1 = await window.electronAPI.modrinthSearch({
      query: modId, limit: 5, facets: JSON.stringify(facets1),
    })
    if (r1?.hits?.length) {
      const exact = r1.hits.find(
        h => h.slug === modId || h.project_id === modId ||
             h.slug?.replace(/-/g, '') === modId.replace(/-/g, '')
      )
      if (exact || r1.hits[0]) return exact || r1.hits[0]
    }

    // Lần 2: fallback không filter version (mod có thể không indexed theo version trên search)
    if (gameVersion) {
      const facets2 = [['project_type:mod']]
      const r2 = await window.electronAPI.modrinthSearch({
        query: modId, limit: 5, facets: JSON.stringify(facets2),
      })
      if (r2?.hits?.length) {
        const exact = r2.hits.find(
          h => h.slug === modId || h.project_id === modId ||
               h.slug?.replace(/-/g, '') === modId.replace(/-/g, '')
        )
        return exact || r2.hits[0]
      }
    }
    return null
  } catch { return null }
}

/**
 * Lấy versions của project có filter gameVersion + loader.
 * Nếu không có kết quả, thử bỏ filter loader (một số mod support nhiều loader
 * nhưng không label đúng).
 */
async function getModrinthVersions(projectId, gameVersion, loader) {
  if (!isElectron) return []
  try {
    // Thử 1: filter cả game_versions + loaders
    const filters1 = {}
    if (gameVersion) filters1.game_versions = [gameVersion]
    if (loader && loader !== 'vanilla') filters1.loaders = [loader]
    const v1 = await window.electronAPI.modrinthGetVersions(projectId, filters1) || []
    if (v1.length > 0) return v1

    // Thử 2: chỉ filter game_versions (bỏ loader filter)
    if (gameVersion) {
      const v2 = await window.electronAPI.modrinthGetVersions(projectId, { game_versions: [gameVersion] }) || []
      if (v2.length > 0) return v2
    }

    // Thử 3: lấy toàn bộ (không filter) — sort compatible versions lên trước
    const v3 = await window.electronAPI.modrinthGetVersions(projectId, {}) || []
    return v3
  } catch { return [] }
}

// ─── ModFixItem ───────────────────────────────────────────────────────────────

/** Phân loại version theo mức độ tương thích với profile */
function classifyVersions(versions, gameVersion, loader) {
  const compatible   = []
  const gameOnly     = []
  const loaderOnly   = []
  const incompatible = []

  for (const v of versions) {
    const gvs = v.game_versions || []
    const lds = (v.loaders || []).map(l => l.toLowerCase())
    const matchGame   = !gameVersion || gvs.includes(gameVersion)
    const matchLoader = !loader || loader === 'vanilla' || lds.length === 0 || lds.includes(loader.toLowerCase())

    if (matchGame && matchLoader)   compatible.push(v)
    else if (matchGame)             gameOnly.push(v)
    else if (matchLoader)           loaderOnly.push(v)
    else                            incompatible.push(v)
  }
  return { compatible, gameOnly, loaderOnly, incompatible }
}

function versionOptionLabel(v, gameVersion, loader) {
  const gvs = v.game_versions || []
  const lds = v.loaders || []
  const matchGame   = !gameVersion || gvs.includes(gameVersion)
  const matchLoader = !loader || loader === 'vanilla' || lds.length === 0 || lds.map(l => l.toLowerCase()).includes(loader?.toLowerCase())
  const prefix = (matchGame && matchLoader) ? '✓ ' : matchGame ? '~ ' : '✗ '
  const verStr = v.name || v.version_number
  const gvLabel = gvs.slice(0, 2).join(', ')
  const ldLabel = lds.slice(0, 2).join(', ')
  return `${prefix}${verStr}${gvLabel ? ` — ${gvLabel}` : ''}${ldLabel ? ` [${ldLabel}]` : ''}`
}

function ModFixItem({ missingMod, gameVersion, loader, instancePath, accountId, onFixed }) {
  const { t } = useLang()

  // Java version issue — không tải được từ Modrinth, chỉ hiện thông báo
  if (missingMod.isJava) {
    return (
      <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-3.5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-violet-400">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-violet-300">Java Runtime cần nâng cấp</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20">java</span>
            </div>
            <p className="text-xs text-yellow-400/70 mt-0.5">
              Yêu cầu: <span className="font-mono">{missingMod.requiredVersion}</span>
            </p>
            {missingMod.requiredBy?.length > 0 && (
              <p className="text-[10px] text-white/30 mt-0.5">
                Cần bởi: {missingMod.requiredBy.join(', ')}
              </p>
            )}
            <p className="text-xs text-white/45 mt-1.5 leading-relaxed">
              Vào <span className="text-white/70">Profile Settings → General → Java Runtime</span> để chọn Java phiên bản cao hơn, hoặc xóa mod yêu cầu Java version quá cao.
            </p>
          </div>
          <span className="flex-shrink-0 text-xs text-violet-400/50 font-semibold">Thủ công</span>
        </div>
      </div>
    )
  }

  const [state, setState]             = useState('idle')
  const [project, setProject]         = useState(null)
  const [versions, setVersions]       = useState([])
  const [classified, setClassified]   = useState({ compatible: [], gameOnly: [], loaderOnly: [], incompatible: [] })
  const [selectedVer, setSelectedVer] = useState(null)
  const [errorMsg, setErrorMsg]       = useState('')
  const [progress, setProgress]       = useState(null)
  const unsubRef = useRef(null)

  useEffect(() => { doSearch(); return () => unsubRef.current?.() }, [])

  async function doSearch() {
    setState('searching')
    const hit = await searchModrinthForMod(missingMod.modId, gameVersion)
    if (!hit) { setState('notfound'); return }
    setProject(hit)

    const vers = await getModrinthVersions(hit.project_id, gameVersion, loader)
    if (!vers.length) { setState('notfound'); return }

    const cls = classifyVersions(vers, gameVersion, loader)
    setClassified(cls)
    // Ưu tiên: compatible → gameOnly → loaderOnly → incompatible
    const best = cls.compatible[0] || cls.gameOnly[0] || cls.loaderOnly[0] || cls.incompatible[0]
    setVersions(vers)
    setSelectedVer(best?.id || null)
    setState('found')
  }

  async function handleInstall() {
    if (!selectedVer || !project) return
    setState('downloading')
    setProgress({ percent: 0 })
    if (isElectron) unsubRef.current = window.electronAPI.onModrinthInstallProgress(p => setProgress(p))
    try {
      const result = await window.electronAPI.modrinthInstall({
        versionId: selectedVer, projectType: 'mod', instancePath, accountId,
      })
      unsubRef.current?.()
      if (result?.error) { setErrorMsg(result.error); setState('error'); return }
      setState('done')
      onFixed?.(missingMod.modId)
    } catch (err) {
      unsubRef.current?.()
      setErrorMsg(err.message)
      setState('error')
    }
  }

  const selectedIsCompat  = selectedVer ? classified.compatible.some(v => v.id === selectedVer) || classified.gameOnly.some(v => v.id === selectedVer) : false
  const selectedIsIncompat = selectedVer ? classified.incompatible.some(v => v.id === selectedVer) : false
  const noCompatible = classified.compatible.length === 0 && classified.gameOnly.length === 0

  return (
    <div className={`rounded-xl border p-3.5 transition-all ${
      state === 'done'    ? 'border-violet-500/30 bg-violet-500/8' :
      state === 'error' || state === 'notfound' ? 'border-red-500/20 bg-red-500/5' :
      'border-white/8 bg-white/3'
    }`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
          {project?.icon_url
            ? <img src={project.icon_url} alt="" className="w-full h-full object-cover" />
            : <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white/20">
                <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
              </svg>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white/90">
              {project?.title || missingMod.displayName || missingMod.modId}
            </span>
            <span className="text-[10px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
              {missingMod.modId}
            </span>
            {missingMod.action === 'update' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">update</span>
            )}
          </div>

          {missingMod.requiredVersion && (
            <p className="text-xs text-yellow-400/70 mt-0.5">
              {t('crash.requires')} <span className="font-mono">{missingMod.requiredVersion}</span>
            </p>
          )}
          {missingMod.requiredBy?.length > 0 && (
            <p className="text-[10px] text-white/30 mt-0.5">
              {t('crash.neededBy')} {missingMod.requiredBy.join(', ')}
            </p>
          )}

          {/* Version picker — chỉ hiện khi found */}
          {state === 'found' && versions.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {/* Compatibility badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {classified.compatible.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20">
                    ✓ {classified.compatible.length} tương thích
                  </span>
                )}
                {classified.gameOnly.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">
                    ~ {classified.gameOnly.length} MC {gameVersion}
                  </span>
                )}
                {noCompatible && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                    Không có version tương thích đầy đủ
                  </span>
                )}
                <span className="text-[9px] text-white/20 font-mono">
                  {gameVersion}{loader && loader !== 'vanilla' ? ` · ${loader}` : ''}
                </span>
              </div>

              {/* Dropdown grouped by compatibility */}
              <select
                value={selectedVer || ''}
                onChange={e => setSelectedVer(e.target.value)}
                className={`text-xs bg-white/5 border rounded-lg px-2 py-1.5 focus:outline-none max-w-full transition-colors ${
                  selectedIsIncompat
                    ? 'border-red-500/30 text-red-400/80'
                    : selectedIsCompat
                    ? 'border-violet-500/25 text-white/80'
                    : 'border-yellow-500/25 text-yellow-400/80'
                }`}
              >
                {classified.compatible.length > 0 && (
                  <optgroup label={`✓ Compatible — ${gameVersion} + ${loader}`} style={{ background: 'rgba(14,14,14,0.98)' }}>
                    {classified.compatible.map(v => (
                      <option key={v.id} value={v.id} style={{ background: 'rgba(14,14,14,0.98)' }}>
                        {versionOptionLabel(v, gameVersion, loader)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {classified.gameOnly.length > 0 && (
                  <optgroup label={`~ MC ${gameVersion} only`} style={{ background: 'rgba(14,14,14,0.98)' }}>
                    {classified.gameOnly.map(v => (
                      <option key={v.id} value={v.id} style={{ background: 'rgba(14,14,14,0.98)' }}>
                        {versionOptionLabel(v, gameVersion, loader)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {classified.loaderOnly.length > 0 && (
                  <optgroup label={`~ ${loader} loader only (other MC versions)`} style={{ background: 'rgba(14,14,14,0.98)' }}>
                    {classified.loaderOnly.slice(0, 5).map(v => (
                      <option key={v.id} value={v.id} style={{ background: 'rgba(14,14,14,0.98)' }}>
                        {versionOptionLabel(v, gameVersion, loader)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {noCompatible && classified.incompatible.length > 0 && (
                  <optgroup label="✗ Không tương thích (other versions)" style={{ background: 'rgba(14,14,14,0.98)' }}>
                    {classified.incompatible.slice(0, 5).map(v => (
                      <option key={v.id} value={v.id} style={{ background: 'rgba(14,14,14,0.98)' }}>
                        {versionOptionLabel(v, gameVersion, loader)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {/* Warning */}
              {selectedIsIncompat && (
                <p className="text-[10px] text-red-400/70 flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                  Version này không tương thích với MC {gameVersion}. Có thể gây crash tiếp.
                </p>
              )}
              {!selectedIsCompat && !selectedIsIncompat && selectedVer && (
                <p className="text-[10px] text-yellow-400/60 flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                  Không có version tương thích hoàn toàn ({gameVersion} + {loader}).
                </p>
              )}
            </div>
          )}

          {/* Download progress */}
          {state === 'downloading' && (
            <div className="mt-2">
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-violet-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress?.percent ?? 0}%` }} />
              </div>
              <p className="text-[10px] text-white/30 mt-1">{progress?.log || t('crash.downloading')}</p>
            </div>
          )}

          {state === 'error' && <p className="text-xs text-red-400 mt-1">{errorMsg}</p>}
        </div>

        {/* Action */}
        <div className="flex-shrink-0 mt-0.5">
          {(state === 'idle' || state === 'searching') && (
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {t('crash.searching')}
            </div>
          )}
          {state === 'found' && (
            <button onClick={handleInstall}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 border ${
                selectedIsIncompat
                  ? 'bg-yellow-500/15 border-yellow-500/25 text-yellow-400 hover:bg-yellow-500/25'
                  : 'bg-violet-500/15 border-violet-500/25 text-violet-400 hover:bg-violet-500/25'
              }`}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              {t('crash.download')}
            </button>
          )}
          {state === 'downloading' && (
            <div className="text-xs text-violet-400/60 flex items-center gap-1">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {progress?.percent ?? 0}%
            </div>
          )}
          {state === 'done' && (
            <div className="flex items-center gap-1 text-xs text-violet-400 font-semibold">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              {t('crash.installed')}
            </div>
          )}
          {state === 'notfound' && <span className="text-xs text-white/25">{t('crash.notFound')}</span>}
          {state === 'error' && (
            <button onClick={doSearch} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
              {t('crash.retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Log viewer ───────────────────────────────────────────────────────────────

function LogViewer({ logs }) {
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef(null)

  function getLineStyle(line) {
    if (/FATAL|FormattedException/i.test(line)) return 'text-red-400'
    if (/\bERROR\b/i.test(line)) return 'text-red-400/80'
    if (/\bWARN\b/i.test(line)) return 'text-yellow-400/70'
    if (/Incompatible|missing|OutOfMemoryError/i.test(line)) return 'text-violet-400/80'
    if (/Caused by:|Exception in thread/i.test(line)) return 'text-red-300/90'
    return 'text-white/35'
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(logs.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/25">{logs.length} lines</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border ${
            copied
              ? 'bg-violet-500/15 border-violet-500/25 text-violet-400'
              : 'bg-white/5 border-white/8 text-white/40 hover:text-white/70 hover:bg-white/8'
          }`}
        >
          {copied
            ? <><svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied</>
            : <><svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg> Copy log</>
          }
        </button>
      </div>
      <div
        className="rounded-xl bg-black/60 border border-white/5 p-3 font-mono text-[11px] leading-relaxed overflow-y-auto"
        style={{ maxHeight: 340, scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
      >
        {logs.length === 0
          ? <p className="text-white/20 text-center py-4">No logs available</p>
          : logs.map((line, i) => (
            <div key={i} className={`py-px whitespace-pre-wrap break-all ${getLineStyle(line)}`}>
              {line}
            </div>
          ))
        }
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── Crash summary block ──────────────────────────────────────────────────────

function CrashSummary({ crashType, fabricInfo, rootCause, exitCode, loader }) {
  const isFabric = crashType === 'fabric_incompatible'
  const isOOM    = crashType === 'out_of_memory'
  const isForgeDep = crashType === 'forge_missing_dep'

  if (isFabric) return (
    <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/6 px-4 py-3.5">
      <div className="flex items-center gap-2 mb-2">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-400 flex-shrink-0">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
        <p className="text-sm font-bold text-yellow-400">Mod không tương thích (Fabric)</p>
      </div>
      <p className="text-xs text-white/55 leading-relaxed">
        {fabricInfo?.mainMessage || 'Fabric phát hiện mod không tương thích với game hoặc với nhau.'}
      </p>
      {fabricInfo?.solutions?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-yellow-500/15">
          <p className="text-[10px] font-bold text-yellow-400/60 uppercase tracking-widest mb-2">Giải pháp đề xuất</p>
          <div className="flex flex-col gap-1">
            {fabricInfo.solutions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/50">
                <span className="text-yellow-400/50 flex-shrink-0 mt-0.5">→</span>
                <span className="font-mono leading-relaxed">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {fabricInfo?.incompatibleMods?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-yellow-500/15">
          <p className="text-[10px] font-bold text-red-400/60 uppercase tracking-widest mb-2">Mod xung đột</p>
          <div className="flex flex-col gap-1">
            {fabricInfo.incompatibleMods.map((m, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-red-400/60">
                <span className="flex-shrink-0 mt-0.5">✗</span>
                <span className="font-mono leading-relaxed">{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (isOOM) return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-violet-400 flex-shrink-0">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
        <p className="text-sm font-bold text-violet-400">Hết bộ nhớ RAM (OutOfMemoryError)</p>
      </div>
      <p className="text-xs text-white/55 leading-relaxed">
        Game bị tắt vì không đủ RAM. Hãy tăng RAM trong Profile Settings → General → RAM slider.
      </p>
    </div>
  )

  if (isForgeDep) return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-violet-400 flex-shrink-0">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
        <p className="text-sm font-bold text-violet-400">Mod thiếu dependency ({loader})</p>
      </div>
      <p className="text-xs text-white/55 leading-relaxed">
        Có mod yêu cầu mod khác chưa được cài đặt. Kiểm tra danh sách mod trong thư mục profile.
      </p>
      {rootCause && (
        <p className="text-[11px] font-mono text-white/40 mt-2 break-all">{rootCause}</p>
      )}
    </div>
  )

  if (crashType === 'java_exception') return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400 flex-shrink-0">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p className="text-sm font-bold text-red-400">Java Exception / Crash</p>
      </div>
      {rootCause ? (
        <p className="text-[11px] font-mono text-white/50 leading-relaxed break-all">{rootCause}</p>
      ) : (
        <p className="text-xs text-white/40">Xem tab Log để biết chi tiết.</p>
      )}
    </div>
  )

  // exit_code fallback
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400 flex-shrink-0">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p className="text-sm font-bold text-red-400">
          Game tắt bất thường{exitCode !== undefined && exitCode !== 0 ? ` (exit ${exitCode})` : ''}
        </p>
      </div>
      <p className="text-xs text-white/40">
        {exitCode === -1 || exitCode === 255
          ? 'Game bị kill hoặc crash do lỗi hệ thống. Xem log để biết thêm.'
          : 'Không phát hiện được nguyên nhân cụ thể. Xem tab Log để biết chi tiết.'}
      </p>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'summary', label: 'Tóm tắt' },
  { id: 'log',     label: 'Log' },
]

export default function CrashAnalyzerModal({ crashData, onClose }) {
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState('summary')
  const [fixedMods, setFixedMods] = useState(new Set())

  // Tất cả hooks phải đặt TRƯỚC mọi early return
  const logs = crashData?.logs || []
  const relevantLines = useMemo(() => getRelevantLogLines(logs), [logs])

  useEffect(() => {
    if (crashData) setActiveTab('summary')
  }, [crashData])

  if (!crashData) return null

  const { profileId, accountId, instancePath, gameVersion, loader, profileName, exitCode } = crashData

  const crashType  = analyzeCrash(logs, loader, exitCode)
  const isFabric   = crashType === 'fabric_incompatible'
  const fabricInfo = isFabric ? parseFabricFormattedException(logs) : null
  const missingMods = isFabric ? parseFabricCrashLogs(logs) : []
  const rootCause   = extractRootCause(logs)

  const allFixed = missingMods.length > 0 && fixedMods.size >= missingMods.length

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div
        className="border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ background: 'rgba(14,14,14,0.98)' }}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-start gap-4 px-6 py-4 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5 text-red-400">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white">{t('crash.title')}</h2>
            <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1.5 flex-wrap">
              {profileName && <span className="text-white/60">{profileName}</span>}
              {gameVersion && <><span className="text-white/20">·</span><span>MC {gameVersion}</span></>}
              {loader && loader !== 'vanilla' && (
                <><span className="text-white/20">·</span>
                <span className={{
                  fabric: 'text-purple-400', forge: 'text-violet-400', neoforge: 'text-rose-400'
                }[loader] || 'text-white/50'}>
                  {loader.charAt(0).toUpperCase() + loader.slice(1)}
                </span></>
              )}
              {exitCode !== undefined && exitCode !== 0 && (
                <><span className="text-white/20">·</span><span className="font-mono text-red-400/60">exit {exitCode}</span></>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-white/5 px-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-white/30 hover:text-white/60'
              }`}
            >
              {tab.label}
              {tab.id === 'log' && logs.length > 0 && (
                <span className="ml-1.5 text-[9px] text-white/20">({logs.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4"
          style={{ scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
        >
          {activeTab === 'summary' && (
            <>
              {/* Crash summary */}
              <CrashSummary
                crashType={crashType}
                fabricInfo={fabricInfo}
                rootCause={rootCause}
                exitCode={exitCode}
                loader={loader}
              />

              {/* Auto-fix mods (Fabric) */}
              {missingMods.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-violet-400">
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                    {t('crash.modsToInstall', { count: missingMods.length })}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {missingMods.map(mod => (
                      <ModFixItem
                        key={mod.modId}
                        missingMod={mod}
                        gameVersion={gameVersion}
                        loader={loader}
                        profileId={profileId}
                        accountId={accountId}
                        instancePath={instancePath}
                        onFixed={id => setFixedMods(prev => new Set([...prev, id]))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Log preview (relevant lines) */}
              {relevantLines.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>
                      </svg>
                      {t('crash.errorLog')}
                    </h3>
                    <button
                      onClick={() => setActiveTab('log')}
                      className="text-[10px] text-violet-400/70 hover:text-violet-400 transition-colors"
                    >
                      Xem toàn bộ →
                    </button>
                  </div>
                  <div
                    className="rounded-xl bg-black/50 border border-white/5 p-3 font-mono text-[11px] leading-relaxed overflow-y-auto"
                    style={{ maxHeight: 160, scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
                  >
                    {relevantLines.map((line, i) => (
                      <div key={i} className={`py-px break-all ${
                        /FATAL|FormattedException/i.test(line) ? 'text-red-400' :
                        /\bERROR\b/i.test(line)   ? 'text-red-400/75' :
                        /\bWARN\b/i.test(line)    ? 'text-yellow-400/70' :
                        /Incompatible|missing|OutOfMemoryError/i.test(line) ? 'text-violet-400/70' :
                        /Caused by:|Exception in thread/i.test(line) ? 'text-red-300/80' :
                        'text-white/35'
                      }`}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'log' && (
            <LogViewer logs={logs} />
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-white/5 bg-black/20">
          {allFixed ? (
            <p className="text-xs text-violet-400 flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              {t('crash.allFixed')}
            </p>
          ) : missingMods.length > 0 ? (
            <p className="text-xs text-white/25">
              {fixedMods.size > 0
                ? t('crash.installedCount', { done: fixedMods.size, total: missingMods.length })
                : t('crash.installHint')}
            </p>
          ) : crashType === 'out_of_memory' ? (
            <p className="text-xs text-violet-400/60">Tăng RAM trong Profile Settings → General</p>
          ) : (
            <p className="text-xs text-white/25">{t('crash.viewLog')}</p>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/8 border border-white/10 text-white/60 hover:bg-white/12 hover:text-white/80 transition-all"
          >
            {t('crash.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
