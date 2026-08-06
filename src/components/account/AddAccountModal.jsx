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

import { useState } from 'react'
import PlayerHead from '../ui/PlayerHead'
import { offlineUUID } from '../../utils/offlineUUID'
import { useLang } from '../../i18n/LangProvider'
import GamingModalWrapper, { useModalClose } from '../ui/GamingModalWrapper'

function validatePlayerName(name) {
  const trimmed = name.trim()
  if (!trimmed) return 'account.addModal.usernameError'
  if (trimmed.length < 3 || trimmed.length > 16) return 'account.addModal.usernameLengthError'
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return 'account.addModal.usernameCharError'
  return null
}

export default function AddAccountModal({ onClose: onCloseProp, onAdd }) {
  const { t } = useLang()
  const onClose = useModalClose(onCloseProp)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const name = username.trim()
    const validationError = validatePlayerName(name)
    if (validationError) {
      setError(t(validationError))
      setLoading(false)
      return
    }

    const result = await onAdd({ type: 'offline', username: name })
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    onClose()
  }

  const previewUuid = username.trim().length >= 3 ? offlineUUID(username.trim()) : null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <GamingModalWrapper onClose={onClose} className="w-[460px] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'rgba(14,14,14,0.98)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-base font-bold text-white">{t('account.addModal.title')}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <TextField
            label={t('account.addModal.usernameLabel')}
            value={username}
            onChange={setUsername}
            placeholder={t('account.addModal.usernamePlaceholder')}
            autoFocus
          />
          <p className="text-[11px] text-white/25 -mt-2">
            {t('account.addModal.offlineHint')}
          </p>

          <AccountPreview
            type="offline"
            uuid={previewUuid}
            username={username.trim() || t('account.addModal.noNameYet')}
            subtitle={`Offline \u00b7 ${previewUuid || '\u2014'}`}
          />

          {error && <ErrorBanner message={error} />}

          <div className="flex gap-2 pt-1">
            <SecondaryButton type="button" onClick={onClose}>{t('account.addModal.cancel')}</SecondaryButton>
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? t('account.addModal.processing') : t('account.addModal.addBtn')}
            </PrimaryButton>
          </div>
        </form>
      </GamingModalWrapper>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, autoFocus = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={16}
        autoFocus={autoFocus}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
      />
    </div>
  )
}

function AccountPreview({ uuid, username, subtitle, type = 'offline' }) {
  const badge = {
    offline: {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
        </svg>
      ),
      color: 'text-white/50 bg-white/10 border-white/15',
      label: 'Offline',
    },
  }[type] ?? {
    icon: null,
    color: 'text-white/50 bg-white/10 border-white/15',
    label: type,
  }

  return (
    <div className="flex items-center gap-3 bg-white/3 rounded-xl p-3 border border-white/5">
      <div className="rounded-lg overflow-hidden flex-shrink-0">
        <PlayerHead uuid={uuid} username={username} size={40} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white/80 truncate">{username}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${badge.color}`}>
            {badge.icon}
            {badge.label}
          </span>
          <span className="text-[11px] text-white/25 truncate">{subtitle.replace(/^[^·]*·\s*/, '')}</span>
        </div>
      </div>
    </div>
  )
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-violet-500 hover:bg-violet-400 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all border border-white/5"
    >
      {children}
    </button>
  )
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
      <span className="text-xs text-red-400 leading-relaxed">{message}</span>
    </div>
  )
}