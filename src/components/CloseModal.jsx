import { useState } from 'react'
import { useLang } from '../i18n/LangProvider'

const isElectron = typeof window !== 'undefined' && window.electronAPI

export default function CloseModal({ onClose }) {
  const { t } = useLang()
  const [remember, setRemember] = useState(false)

  function saveBehavior(behavior) {
    if (remember && isElectron) {
      window.electronAPI.saveSettings({ closeBehavior: behavior })
    }
  }

  function handleQuit() {
    saveBehavior('quit')
    if (isElectron) window.electronAPI.quitApp()
  }

  function handleTray() {
    saveBehavior('tray')
    if (isElectron) window.electronAPI.closeWindow()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'rgba(14,14,14,0.98)' }}
      >
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-bold text-white">{t('dialog.close.title')}</h3>
          <p className="text-xs text-white/50 mt-1">{t('dialog.close.ask')}</p>
        </div>

        <div className="px-5 py-3 flex flex-col gap-2">
          <button
            onClick={handleQuit}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 bg-red-500/80 hover:bg-red-500 text-white"
          >
            {t('dialog.close.quit')}
          </button>
          <button
            onClick={handleTray}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
          >
            {t('dialog.close.tray')}
          </button>
        </div>

        <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                remember ? 'bg-violet-500 border-violet-500' : 'border-white/20'
              }`}
              onClick={() => setRemember(!remember)}
            >
              {remember && (
                <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </div>
            <span className="text-xs text-white/50">{t('dialog.close.remember')}</span>
          </label>
        </div>
      </div>
    </div>
  )
}
