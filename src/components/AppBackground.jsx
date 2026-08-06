import { useEffect, useState } from 'react'
import bgUrl from '../assets/background-launcher.png'

export default function AppBackground() {
  const [src, setSrc] = useState(bgUrl)

  useEffect(() => {
    let cancelled = false
    window.electronAPI.getBackgroundPath?.()
      .then(path => {
        if (cancelled || !path) return
        setSrc(`vxc-bg://local?path=${encodeURIComponent(path)}`)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <img className="w-full h-full object-cover" src={src} draggable={false} />
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{
          width: '600px',
          background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.25) 70%, transparent 100%)',
        }}
      />
    </div>
  )
}