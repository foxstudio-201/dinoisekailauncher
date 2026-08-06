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

import { useState, useEffect } from 'react'
import { useLang } from '../../../i18n/LangProvider'
import martianLogo from '../../../assets/martian-logo.png'

const isElectron = typeof window !== 'undefined' && window.electronAPI

function VXCLogo({ size = 56 }) {
  return <img src={martianLogo} alt="Dino Isekai" className="rounded-xl" style={{ width: size, height: size }} />
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono text-violet-400' : 'text-white/70'}`}>{value}</span>
    </div>
  )
}

function LinkButton({ href, icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => { if (href === '#') e.preventDefault() }}
      className="
        flex items-center gap-2 px-4 py-2.5 rounded-xl
        border border-white/8 bg-white/3
        text-xs text-white/50 font-medium
        hover:bg-white/6 hover:border-white/15 hover:text-white/80
        transition-all duration-150 active:scale-95
      "
    >
      {icon}
      {label}
    </a>
  )
}

export default function AboutTab() {
  const { t } = useLang()
  const [version, setVersion] = useState('')
  const [hwid, setHwid]       = useState('')
  const [hwidCopied, setHwidCopied] = useState(false)

  useEffect(() => {
    if (isElectron) {
      window.electronAPI.getVersion().then(setVersion)
      window.electronAPI.getHwid().then(r => {
        if (r?.hwidFormatted) setHwid(r.hwidFormatted)
      }).catch(() => {})
    } else {
      setVersion('1.0.0-dev')
    }
  }, [])

  return (
    <div className="px-6 py-5">

      {}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#0d2b1a] via-[#0a1a0f] to-[#050d07] p-6 mb-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(167,139,250,0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(167,139,250,0.4) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400/20 to-violet-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <VXCLogo size={32} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Dino Isekai</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-md border border-violet-500/20">
                v{version || '...'}
              </span>
              <span className="text-xs text-white/30">by FoxStudio</span>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-white/40 mb-2 px-1">{t('settings.about.techInfo')}</p>
        <div className="rounded-xl border border-white/5 bg-white/2 px-4">
          <InfoRow label={t('settings.about.developer')} value="FoxStudio" />
          <InfoRow label="Engine"                        value="Electron + React" />
          <InfoRow label={t('settings.about.renderer')} value="Vite 8" />
          <InfoRow label={t('settings.about.license')}  value="MIT" mono />
          <InfoRow label={t('settings.about.version')}  value={version || '...'} mono />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-white/40 mb-2 px-1">{t('settings.about.links')}</p>
        <div className="flex flex-col gap-2">
          <LinkButton
            href="#"
            label="GitHub"
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            }
          />
          <LinkButton
            href="https://join.foxstudio.site"
            label="Discord"
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            }
          />
          <LinkButton
            href="https://voxelx.io.vn"
            label="Website"
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            }
          />
        </div>
      </div>

      {}
      <div className="text-center py-4 border-t border-white/5">
        <p className="text-[11px] text-white/20">© 2026 FoxStudio. All rights reserved.</p>
        <p className="text-[10px] text-white/12 mt-1">Released under the MIT License</p>
      </div>
    </div>
  )
}

