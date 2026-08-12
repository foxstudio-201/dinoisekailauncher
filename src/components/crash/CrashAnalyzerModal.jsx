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
        className="rounded-xl bg-[#14101f]/80 border border-violet-500/10 p-3 font-mono text-[11px] leading-relaxed overflow-y-auto"
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

  // Tất cả hooks phải đặt TRƯỚC mọi early return
  const logs = crashData?.logs || []
  const relevantLines = useMemo(() => getRelevantLogLines(logs), [logs])

  useEffect(() => {
    if (crashData) setActiveTab('summary')
  }, [crashData])

  if (!crashData) return null

  const { gameVersion, loader, profileName, exitCode } = crashData

  const crashType  = analyzeCrash(logs, loader, exitCode)
  const isFabric   = crashType === 'fabric_incompatible'
  const fabricInfo = isFabric ? parseFabricFormattedException(logs) : null
  const rootCause   = extractRootCause(logs)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div
        className="border border-violet-500/15 rounded-2xl w-full max-w-2xl flex flex-col"
        style={{ background: 'rgba(23,16,36,0.98)', maxHeight: '90vh' }}
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
                    className="rounded-xl bg-[#14101f]/80 border border-violet-500/10 p-3 font-mono text-[11px] leading-relaxed overflow-y-auto"
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
          {crashType === 'out_of_memory' ? (
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
