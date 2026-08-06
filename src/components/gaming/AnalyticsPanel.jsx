import { useState, useEffect, useRef } from 'react'

const HOUR = 3600
const MIN = 60

function fmt(seconds) {
  if (!seconds || seconds < MIN) return '< 1m'
  const h = Math.floor(seconds / HOUR)
  const m = Math.floor((seconds % HOUR) / MIN)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function AnalyticsPanel({ profileId, t }) {
  const [data, setData] = useState(null)
  const lastRefreshDay = useRef('')

  function fetch() {
    if (!profileId || !window.electronAPI) return
    window.electronAPI.getProfileAnalytics({ profileId }).then(r => {
      if (r) setData(r)
    }).catch(() => {})
  }

  useEffect(() => {
    fetch()
    if (!window.electronAPI?.onGameStopped) return
    const unsub = window.electronAPI.onGameStopped(({ profileId: pid }) => {
      if (pid === profileId) fetch()
    })
    return unsub
  }, [profileId])

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (lastRefreshDay.current !== today) {
      lastRefreshDay.current = today
    }
  }, [data])

  if (!data) return null

  const maxSec = Math.max(...data.daily.map(d => d.seconds), 1)

  return (
    <div className="h-full flex flex-col text-xs">
      <div className="flex-shrink-0 px-3 py-2 border-b border-white/5">
        <span className="text-white/50 font-semibold uppercase tracking-wider text-[10px]">{t('analytics.title')}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        <div className="grid grid-cols-2 gap-2">
          <StatBox label={t('analytics.totalPlaytime')} value={fmt(data.playtimeSeconds)} />
          <StatBox label={t('analytics.avgSession')} value={fmt(data.avgSessionSeconds)} />
          <StatBox label={t('analytics.sessions')} value={String(data.sessionCount)} />
          <StatBox label={t('analytics.crashes')} value={String(data.crashCount)}
            color={data.crashCount > 0 ? 'text-red-400' : 'text-white/70'} />
        </div>

        <div className="pt-1">
          <p className="text-[10px] text-white/30 mb-2">{t('analytics.lastPlayed')}: {data.lastPlayed ? new Date(data.lastPlayed).toLocaleDateString() : t('analytics.never')}</p>
        </div>

        <div>
          <p className="text-[10px] text-white/30 mb-2">{t('analytics.barChart')}</p>
          <div className="flex items-end gap-[3px] h-20">
            {data.daily.map(d => {
              const pct = (d.seconds / maxSec) * 100
              const isToday = d.date === new Date().toISOString().slice(0, 10)
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(pct, 1)}%`,
                      background: isToday ? '#a78bfa' : '#a78bfa55',
                    }} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black/80 text-[9px] text-white px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                    {d.date}: {fmt(d.seconds)}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-white/20">{data.daily[0]?.date?.slice(5)}</span>
            <span className="text-[8px] text-white/20">{data.daily[data.daily.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>

      </div>
    </div>
  )
}

function StatBox({ label, value, color = 'text-white/70' }) {
  return (
    <div className="bg-white/3 border border-white/5 rounded-lg px-2.5 py-2">
      <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  )
}
