import { useState, useEffect, createContext, useContext } from 'react'
import { loadAppSettings, saveAppSettings } from '../utils/appSettings'
import vi from '../locales/vi.json'
import en from '../locales/en.json'
import langList from '../locales/index.json'

export const LangContext = createContext(null)

const builtin = { vi, en }
const cache = { ...builtin }

function fetchLang(code) {
  if (cache[code]) return cache[code]
  return null
}

function fetchLangList() {
  return langList.languages || [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
  ]
}

function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((acc, k) => acc?.[k], obj)
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState('vi')
  const [translations, setTranslations] = useState({})
  const [langs, setLangs] = useState([])
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLangs(fetchLangList())
    loadAppSettings().then(s => {
      const code = s?.language || 'vi'
      setLangState(code)
      const data = fetchLang(code)
      if (data) { setTranslations(data); setReady(true) }
      else { console.warn(`[LangProvider] Không có translations cho: ${code}`); setReady(true) }
    }).catch(() => setReady(true))
  }, [])

  async function setLang(code, { persist = true } = {}) {
    setLoading(true)
    try {
      const data = await fetchLang(code)
      if (data) {
        setTranslations(data)
        setLangState(code)
        if (persist) saveAppSettings({ language: code })
        window.dispatchEvent(new CustomEvent('vxc-lang-change', { detail: code }))
      }
    } catch {}
    setLoading(false)
  }

  function t(key, vars = {}) {
    let str = getNestedValue(translations, key) || key
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`{{${k}}}`, 'g'), v)
    })
    return str
  }

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-[#0f0f0f] flex items-center justify-center z-[99999]">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8 text-violet-400/60" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t, langs, loading, translations }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}
