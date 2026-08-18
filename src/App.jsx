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














 
















import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import TitleBar from './components/TitleBar'
import CloseModal from './components/CloseModal'
import NavBar from './components/NavBar'
import HomePage from './components/HomePage'
import MinecraftPage from './components/MinecraftPage'
import NightfallPage from './components/NightfallPage'
import InitialSetup from './components/InitialSetup'
import CursorTrail from './components/CursorTrail'
import TooltipProvider from './components/ui/TooltipProvider'
import UpdateModal from './components/UpdateModal'
import { AccountsProvider } from './hooks/useAccounts'
import { loadAppSettings, applyAppSettings, isInitialSetupRequired } from './utils/appSettings'
import { LangProvider, useLang } from './i18n/LangProvider'

import vanillaBg from './assets/vanilla-mc.png'

const SettingsPage = lazy(() => import('./components/settings/SettingsPage'))
const CrashAnalyzerModal = lazy(() => import('./components/crash/CrashAnalyzerModal'))

const isElectron = typeof window !== 'undefined' && window.electronAPI

function PlaceholderPage({ title }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 opacity-10"></div>
        <h2 className="text-xl font-bold text-white/30">{title}</h2>
        <p className="text-sm text-white/20 mt-1">Coming soon</p>
      </div>
    </div>
  )
}

function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
    </div>
  )
}

const PAGE_ORDER = ['home', 'minecraft', 'nightfall']

function AppInner() {
  const { t } = useLang()
  const [activePage, setActivePage] = useState('home')
  const [outgoingPage, setOutgoingPage] = useState(null)
  const [direction, setDirection] = useState('forward')
  const [settingsOpen, setSettingsOpen] = useState(false)

  
  useEffect(() => {
    const img = new Image()
    img.src = vanillaBg
  }, [])

  const handleNavigate = useCallback((page) => {
    if (page === activePage) return
    setDirection(PAGE_ORDER.indexOf(page) > PAGE_ORDER.indexOf(activePage) ? 'forward' : 'backward')
    setOutgoingPage(activePage)
    setActivePage(page)
    setTimeout(() => setOutgoingPage(null), 480)
  }, [activePage])
  const [logPanelOpen, setLogPanelOpen] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)

  const [instances, setInstances] = useState(new Map())
  
  const instancesRef = useRef(new Map())

  const [launchState, setLaunchState] = useState('idle')
  const [progress, setProgress]       = useState(null)
  const [launchError, setLaunchError] = useState(null)
  const [activeKey, setActiveKey]     = useState(null)
  const [crashData, setCrashData]     = useState(null)

  const cleanupRef = useRef([])

  const updateInstance = useCallback((key, patch) => {
    setInstances(prev => {
      const next = new Map(prev)
      const cur  = next.get(key) || {}
      const updated = { ...cur, ...patch }
      next.set(key, updated)
      instancesRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    if (!isElectron) return

    cleanupRef.current.forEach(fn => fn?.())
    cleanupRef.current = []

    const unsubProgress = window.electronAPI.onLaunchProgress((data) => {
      setProgress(data)
      if (data.phase === 'running') {
        setLaunchState('running')
        
        window.electronAPI.lanStartScan?.().catch?.(() => {})
      }
      if (data.phase === 'error') {
        setLaunchState('error')
        setLaunchError(data.error || data.log)
      }

      setActiveKey(currentKey => {
        if (currentKey) {
          setInstances(prev => {
            const next = new Map(prev)
            const cur  = next.get(currentKey)
            if (cur) {
              const newState = data.phase === 'error'   ? 'error'       :
                               data.phase === 'running'  ? 'running'     : 'downloading'

              const extraLog = (data.phase === 'error' && (data.error || data.log))
                ? [`[ERR] ${data.error || data.log}`]
                : []
              next.set(currentKey, {
                ...cur,
                progress: data,
                state: newState,
                logs: extraLog.length > 0
                  ? [...(cur.logs || []).slice(-499), ...extraLog]
                  : cur.logs,
              })
            }
            instancesRef.current = next
            return next
          })
        }
        return currentKey
      })
    })

    const unsubLog = window.electronAPI.onLaunchLog((data) => {
      setActiveKey(currentKey => {
        if (currentKey) {
          setInstances(prev => {
            const next = new Map(prev)
            const cur  = next.get(currentKey)
            if (cur) {
              const newLog = data.line
              const newLogs = [...(cur.logs || []).slice(-1999), newLog]
              const newLauncherLogs = newLog.startsWith('[Launcher]')
                ? [...(cur.launcherLogs || []).slice(-1999), newLog]
                : (cur.launcherLogs || [])
              next.set(currentKey, { ...cur, logs: newLogs, launcherLogs: newLauncherLogs })
            }
            instancesRef.current = next
            return next
          })
        }
        return currentKey
      })
    })

    const unsubLogUpdate = window.electronAPI.onLaunchLogUpdate?.((data) => {
      setActiveKey(currentKey => {
        if (currentKey) {
          setInstances(prev => {
            const next = new Map(prev)
            const cur  = next.get(currentKey)
            if (cur) {
              const logs = cur.logs || []
              const updated = logs.length > 0
                ? [...logs.slice(0, -1), data.line]
                : [data.line]
              next.set(currentKey, { ...cur, logs: updated })
            }
            instancesRef.current = next
            return next
          })
        }
        return currentKey
      })
    })

    const unsubStop = window.electronAPI.onGameStopped((data) => {
      const realKey = data?.profileId && data?.accountId
        ? `${data.profileId}::${data.accountId}`
        : null

      
      window.electronAPI.lanStopScan?.().catch?.(() => {})

      
      
      const exitCode = data?.code ?? 0
      if (exitCode !== 0 && isElectron) {
        const currentInstances = instancesRef.current

        
        let inst = realKey ? currentInstances.get(realKey) : null
        if (!inst && data?.profileId) {
          inst = currentInstances.get(`${data.profileId}::`)
        }
        if (!inst && data?.profileId) {
          
          inst = [...currentInstances.values()].find(i => i.profileId === data.profileId)
        }

        const logs = inst?.logs || []

        
        window.electronAPI.getProfiles().then(profilesData => {
          const profile = profilesData?.profiles?.find(p => p.id === data.profileId)
          setCrashData({
            logs,
            profileId: data.profileId,
            accountId: data.accountId || null,
            instancePath: profile?.instancePath || null,
            gameVersion: profile?.gameVersion || null,
            loader: profile?.loader || null,
            profileName: inst?.profileName || profile?.name || '',
            exitCode,
          })
        }).catch(() => {
          setCrashData({
            logs,
            profileId: data.profileId,
            accountId: data.accountId || null,
            instancePath: null,
            gameVersion: null,
            loader: null,
            profileName: inst?.profileName || '',
            exitCode,
          })
        })
      }

      setInstances(prev => {
        const next = new Map(prev)

        if (realKey && next.has(realKey)) {
          next.set(realKey, { ...next.get(realKey), state: 'stopped' })
          setTimeout(() => setInstances(p => { const n = new Map(p); n.delete(realKey); instancesRef.current = n; return n }), 3000)
          instancesRef.current = next
          return next
        }

        if (data?.profileId) {
          for (const [k, inst] of next) {
            if (inst.profileId === data.profileId) {
              next.set(k, { ...inst, state: 'stopped' })
              setTimeout(() => setInstances(p => { const n = new Map(p); n.delete(k); instancesRef.current = n; return n }), 3000)
              break
            }
          }
        }
        instancesRef.current = next
        return next
      })

      setLaunchState('idle')
      setProgress(null)
      setLaunchError(null)
      setActiveKey(null)
    })

    cleanupRef.current = [unsubProgress, unsubLog, unsubLogUpdate, unsubStop]
    return () => { cleanupRef.current.forEach(fn => fn?.()) }
  }, [])

  const handleLaunch = useCallback(async (profileId, ramMb, profileName, accountName, serverAddress, accountId) => {
    if (!isElectron) return
    setLaunchState('downloading')
    setLaunchError(null)
    setProgress({ phase: 'starting', log: 'Preparing...', percent: 0 })

    const aid = accountId || ''
    const tempKey = `${profileId}::${aid}`
    setActiveKey(tempKey)
    setInstances(prev => {
      const next = new Map(prev)
      next.set(tempKey, {
        key: tempKey, profileId, accountId: aid,
        profileName: profileName || profileId,
        accountName: accountName || '',
        state: 'downloading', progress: null, logs: [],
      })
      instancesRef.current = next
      return next
    })

    const result = await window.electronAPI.launchGame({ profileId, ramMb, serverAddress, accountId: aid })
    if (result?.error) {
      setLaunchError(result.error)
      setLaunchState('error')
      setProgress({ phase: 'error', log: result.error, percent: 0 })
      updateInstance(tempKey, {
        state: 'error',
        logs: [`[ERR] ${result.error}`],
      })
    }
  }, [updateInstance])

  const handleLaunchReset = useCallback(() => {
    setLaunchState('idle')
    setLaunchError(null)
    setProgress(null)
    if (activeKey) {
      setInstances(prev => { const next = new Map(prev); next.delete(activeKey); return next })
      setActiveKey(null)
    }
  }, [activeKey])

  const handleKillInstance = useCallback((key) => {
    if (!isElectron) return
    const inst = instances.get(key)
    if (!inst) return
    window.electronAPI.stopGame({ profileId: inst.profileId, accountId: inst.accountId })
  }, [instances])

  const handleCloseRequest = useCallback(async () => {
    if (!isElectron) return
    const settings = await window.electronAPI.getSettings()
    if (settings.closeBehavior === 'quit') { window.electronAPI.quitApp(); return }
    if (settings.closeBehavior === 'tray') { window.electronAPI.closeWindow(); return }
    setShowCloseModal(true)
  }, [])

  const instanceList = Array.from(instances.values())

  function renderPage() {
    const isForward = direction === 'forward'

    let homeCls = 'page-hidden'
    if (activePage === 'home') homeCls = isForward ? 'page-enter-f' : 'page-enter-b'
    else if (outgoingPage === 'home') homeCls = isForward ? 'page-exit-f' : 'page-exit-b'

    let mcCls = 'page-hidden'
    if (activePage === 'minecraft') mcCls = isForward ? 'page-enter-f' : 'page-enter-b'
    else if (outgoingPage === 'minecraft') mcCls = isForward ? 'page-exit-f' : 'page-exit-b'

    let nfCls = 'page-hidden'
    if (activePage === 'nightfall') nfCls = isForward ? 'page-enter-f' : 'page-enter-b'
    else if (outgoingPage === 'nightfall') nfCls = isForward ? 'page-exit-f' : 'page-exit-b'

    return (
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div key="home-page" className={`absolute inset-0 ${homeCls}`}>
          <HomePage
            onNavigate={handleNavigate}
            launchState={launchState}
            progress={progress}
            launchError={launchError}
            onLaunch={handleLaunch}
            onLaunchReset={handleLaunchReset}
            instances={instanceList}
            onKillInstance={handleKillInstance}
            activePage={activePage}
            onOpenSettings={() => setSettingsOpen(true)}
            onLogPanelOpen={setLogPanelOpen}
          />
        </div>
        <div key="mc-page" className={`absolute inset-0 ${mcCls}`}>
          <MinecraftPage />
        </div>
        <div key="nf-page" className={`absolute inset-0 ${nfCls}`}>
          <NightfallPage
            onLaunch={handleLaunch}
            onLaunchReset={handleLaunchReset}
            instances={instanceList}
            onKillInstance={handleKillInstance}
            onLogPanelOpen={setLogPanelOpen}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden relative z-10" style={{ background: 'transparent' }}>
      <TitleBar instances={instanceList} onKillInstance={handleKillInstance} onCloseRequest={handleCloseRequest} />
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
          <NavBar
            activePage={activePage}
            onNavigate={handleNavigate}
            onOpenSettings={() => setSettingsOpen(true)}
            hidden={logPanelOpen}
          />
          {renderPage()}
        </main>
      </div>
      {crashData && (
        <Suspense fallback={null}>
          <CrashAnalyzerModal
            crashData={crashData}
            onClose={() => setCrashData(null)}
          />
        </Suspense>
      )}

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsPage onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}

      {showCloseModal && (
        <CloseModal onClose={() => setShowCloseModal(false)} />
      )}
      <UpdateModal />
      <CursorTrail />
      <TooltipProvider />
    </div>
  )
}

export default function App() {
  const [initialSettings, setInitialSettings] = useState(null)
  const [initialSetupOpen, setInitialSetupOpen] = useState(false)
  const [initialSetupChecked, setInitialSetupChecked] = useState(false)

  useEffect(() => {
    loadAppSettings().then(s => {
      setInitialSettings(s)
      applyAppSettings(s)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    isInitialSetupRequired().then(required => {
      setInitialSetupOpen(required)
      setInitialSetupChecked(true)
    }).catch(() => setInitialSetupChecked(true))
  }, [])

  return (
    <LangProvider>
      <AccountsProvider>
          <AppInner />
          {initialSetupChecked && initialSetupOpen && (
            <InitialSetup
              initialSettings={initialSettings || {}}
              onComplete={(settings) => {
                setInitialSettings(settings)
                setInitialSetupOpen(false)
              }}
            />
          )}
      </AccountsProvider>
    </LangProvider>
  )
}

