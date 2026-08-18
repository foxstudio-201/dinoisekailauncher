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
import { useState, useCallback, useEffect, useRef } from 'react'
import { Monitor, SpeakerHigh, ChatCircle, GameController, GearSix } from '@phosphor-icons/react'

const isElectron = typeof window !== 'undefined' && window.electronAPI

const rng = (key, label, min, max, step = 1) => ({ key, type: 'range', label, min, max, step })
const tog = (key, label) => ({ key, type: 'toggle', label })
const sel = (key, label, options) => ({ key, type: 'select', label, options })

const TABS = [
  {
    id: 'video', label: 'Video', Icon: Monitor,
    items: [
      sel('graphicsMode', 'Đồ họa', [['0', 'Nhanh (Fast)'], ['1', 'Đẹp (Fancy)'], ['2', 'Tối ưu (Fabulous)']]),
      rng('renderDistance', 'Render Distance', 2, 64),
      rng('simulationDistance', 'Simulation Distance', 2, 32),
      rng('maxFps', 'Max FPS', 30, 400, 10),
      rng('gamma', 'Độ sáng (Gamma)', 0, 1, 0.05),
      rng('fov', 'FOV', 0, 2, 0.05),
      rng('fovEffectScale', 'FOV Effect Scale', 0, 1, 0.01),
      rng('screenEffectScale', 'Screen Effect Scale', 0, 1, 0.01),
      rng('darknessEffectScale', 'Darkness Effect Scale', 0, 1, 0.01),
      rng('damageTiltStrength', 'Damage Tilt', 0, 1, 0.05),
      rng('glintSpeed', 'Glint Speed', 0, 1, 0.05),
      rng('glintStrength', 'Glint Strength', 0, 1, 0.01),
      rng('guiScale', 'GUI Scale', 0, 4),
      sel('particles', 'Particles', [['0', 'Tất cả'], ['1', 'Giảm'], ['2', 'Tối thiểu']]),
      rng('mipmapLevels', 'Mipmap Levels', 0, 4),
      rng('biomeBlendRadius', 'Biome Blend Radius', 0, 7),
      sel('prioritizeChunkUpdates', 'Ưu tiên chunk update', [['0', 'Level 0'], ['1', 'Level 1'], ['2', 'Level 2']]),
      rng('entityDistanceScaling', 'Entity Distance Scaling', 0.5, 5, 0.1),
      tog('enableVsync', 'VSync'),
      tog('entityShadows', 'Entity Shadows'),
      tog('ao', 'Ambient Occlusion'),
      tog('fullscreen', 'Toàn màn hình'),
      tog('bobView', 'Bob View'),
      sel('renderClouds', 'Render Clouds', [['false', 'Tắt'], ['true', 'Bật'], ['"fast"', 'Nhanh']]),
      rng('overrideWidth', 'Độ phân giải - Rộng', 640, 3840, 10),
      rng('overrideHeight', 'Độ phân giải - Cao', 480, 2160, 10),
    ]
  },
  {
    id: 'audio', label: 'Âm thanh', Icon: SpeakerHigh,
    items: [
      rng('soundCategory_master', 'Âm lượng chính', 0, 1, 0.05),
      rng('soundCategory_music', 'Nhạc', 0, 1, 0.05),
      rng('soundCategory_record', 'Record', 0, 1, 0.05),
      rng('soundCategory_weather', 'Thời tiết', 0, 1, 0.05),
      rng('soundCategory_block', 'Khối', 0, 1, 0.05),
      rng('soundCategory_hostile', 'Quái thù địch', 0, 1, 0.05),
      rng('soundCategory_neutral', 'Sinh vật trung lập', 0, 1, 0.05),
      rng('soundCategory_player', 'Người chơi', 0, 1, 0.05),
      rng('soundCategory_ambient', 'Môi trường xung quanh', 0, 1, 0.05),
      rng('soundCategory_voice', 'Voice chat', 0, 1, 0.05),
      rng('soundCategory_birds', 'Chim', 0, 1, 0.05),
      tog('directionalAudio', 'Âm thanh định hướng'),
      tog('showSubtitles', 'Phụ đề'),
    ]
  },
  {
    id: 'chatui', label: 'Chat & UI', Icon: ChatCircle,
    items: [
      sel('chatVisibility', 'Chế độ chat', [['0', 'Hiện toàn bộ'], ['1', 'Chỉ lệnh'], ['2', 'Ẩn']]),
      tog('chatColors', 'Màu chat'),
      tog('chatLinks', 'Liên kết click'),
      tog('chatLinksPrompt', 'Xác nhận mở liên kết'),
      tog('backgroundForChatOnly', 'Nền chỉ cho chat'),
      tog('hideServerAddress', 'Ẩn địa chỉ server'),
      rng('chatOpacity', 'Độ mờ chat', 0, 1, 0.05),
      rng('chatLineSpacing', 'Khoảng cách dòng chat', 0, 1, 0.05),
      rng('textBackgroundOpacity', 'Độ mờ nền chữ', 0, 1, 0.05),
      rng('chatHeightFocused', 'Chiều cao chat (focus)', 0.2, 1, 0.05),
      rng('chatHeightUnfocused', 'Chiều cao chat (unfocus)', 0.2, 1, 0.05),
      rng('chatScale', 'Tỉ lệ chat', 0, 1, 0.05),
      rng('chatWidth', 'Chiều rộng chat', 0, 1, 0.05),
      rng('chatDelay', 'Delay chat', 0, 1, 0.05),
      rng('notificationDisplayTime', 'Thời gian thông báo', 0, 5, 0.1),
      tog('reducedDebugInfo', 'Giảm debug info'),
      tog('advancedItemTooltips', 'Advanced item tooltips'),
      tog('forceUnicodeFont', 'Font Unicode'),
      tog('highContrast', 'Tương phản cao'),
    ]
  },
  {
    id: 'controls', label: 'Điều khiển', Icon: GameController,
    items: [
      rng('mouseSensitivity', 'Độ nhạy chuột', 0, 1, 0.05),
      rng('mouseWheelSensitivity', 'Độ nhạy lăn chuột', 0, 2, 0.05),
      tog('rawMouseInput', 'Raw mouse input'),
      tog('invertYMouse', 'Đảo Y chuột'),
      tog('discrete_mouse_scroll', 'Discrete mouse scroll'),
      tog('autoJump', 'Tự nhảy'),
      tog('toggleCrouch', 'Giữ để ngồi (toggle)'),
      tog('toggleSprint', 'Giữ để chạy (toggle)'),
      tog('touchscreen', 'Chế độ màn hình cảm ứng'),
      sel('mainHand', 'Tay thuận', [['"right"', 'Phải'], ['"left"', 'Trái']]),
      sel('attackIndicator', 'Chỉ báo tấn công', [['0', 'Tắt'], ['1', 'Crosshair'], ['2', 'Thanh máu']]),
    ]
  },
  {
    id: 'advanced', label: 'Nâng cao', Icon: GearSix,
    items: [
      tog('pauseOnLostFocus', 'Tạm dừng khi mất focus'),
      tog('autoSuggestions', 'Gợi ý lệnh'),
      tog('realmsNotifications', 'Thông báo Realms'),
      tog('skipMultiplayerWarning', 'Bỏ cảnh báo multiplayer'),
      tog('skipRealms32bitWarning', 'Bỏ cảnh báo Realms 32-bit'),
      tog('hideMatchedNames', 'Ẩn tên trùng'),
      tog('joinedFirstServer', 'Đã vào server đầu tiên'),
      tog('hideBundleTutorial', 'Ẩn hướng dẫn bundle'),
      tog('syncChunkWrites', 'Đồng bộ ghi chunk'),
      tog('showAutosaveIndicator', 'Hiện chỉ báo autosave'),
      tog('allowServerListing', 'Cho phép hiển thị trong danh sách server'),
      tog('onlyShowSecureChat', 'Chỉ hiện chat bảo mật'),
      tog('useNativeTransport', 'Native transport'),
      rng('panoramaScrollSpeed', 'Tốc độ scroll panorama', 0, 2, 0.05),
      tog('telemetryOptInExtra', 'Telemetry'),
      tog('onboardAccessibility', 'Onboard accessibility'),
      tog('darkMojangStudiosBackground', 'Nền tối Mojang Studios'),
      tog('hideLightningFlashes', 'Ẩn chớp sét'),
      sel('lang', 'Ngôn ngữ', [['vi_vn', 'Tiếng Việt'], ['en_us', 'English'], ['ja_jp', '日本語'], ['ko_kr', '한국어']]),
    ]
  },
]

const toNum = (v, def = 0) => { const n = parseFloat(String(v).replace(/"/g, '')); return isNaN(n) ? def : n }
const clean = (v) => String(v).replace(/^"|"$/g, '')

function SelectField({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const cur = options.find(o => o[0] === value) || options[0]
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
          open ? 'bg-blue-500/15 border-blue-500/40 text-blue-200' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
        }`}
      >
        <span className="truncate">{cur ? cur[1] : value}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-blue-500/25 bg-gradient-to-b from-[#0f1a30] to-[#05070d] shadow-2xl shadow-black/60 overflow-hidden z-[9999] origin-top-left animate-[page-in-f_.15s_ease_both]">
            {options.map(o => (
              <button
                key={o[0]}
                onClick={() => { onChange(o[0]); setOpen(false) }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                  o[0] === value ? 'bg-blue-500/20 text-blue-300' : 'text-white/75 hover:bg-white/5'
                }`}
              >
                <span>{o[1]}</span>
                {o[0] === value && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 text-blue-300"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function OptionsModal({ profile, onClose }) {
  const [tab, setTab] = useState('video')
  const [options, setOptions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [backupInfo, setBackupInfo] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3500)
  }

  const load = useCallback(async () => {
    if (!isElectron || !profile?.id) return
    setLoading(true)
    try {
      const r = await window.electronAPI.profileReadOptions(profile.id)
      setOptions(r?.ok ? (r.options || {}) : {})
    } finally { setLoading(false) }
  }, [profile?.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!isElectron || !window.electronAPI.optionsBackupInfo) return
    window.electronAPI.optionsBackupInfo().then(r => {
      if (r?.ok) setBackupInfo(r)
    }).catch(() => {})
  }, [profile?.id])

  async function updateBackup() {
    if (!isElectron || !window.electronAPI.optionsBackup) return
    setBackingUp(true)
    try {
      const r = await window.electronAPI.optionsBackup()
      if (r?.ok) {
        setBackupInfo(b => ({ ...(b || {}), backupExists: true }))
        showToast(r.message || 'Đã cập nhật bản sao lưu options.txt')
      } else {
        showToast('Sao lưu thất bại: ' + (r?.error === 'no_options' ? 'chưa có options.txt' : (r?.error || '')))
      }
    } catch (e) { showToast('Sao lưu thất bại: ' + e.message) }
    setBackingUp(false)
  }

  const set = (key, val) => setOptions(o => {
    const next = { ...(o || {}) }
    next[key] = String(val)
    return next
  })

  async function save() {
    if (!options) return
    setSaving(true)
    try {
      const r = await window.electronAPI.profileWriteOptions(profile.id, options)
      showToast(r?.ok ? 'Đã lưu cài đặt. Khởi động lại game để áp dụng.' : ('Lưu thất bại: ' + (r?.error || '')))
    } catch (e) { showToast('Lưu thất bại: ' + e.message) }
    setSaving(false)
  }

  const activeTab = TABS.find(t => t.id === tab)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="border border-blue-500/15 rounded-2xl w-full max-w-3xl flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #0c1526 0%, #05070d 55%, #03040a 100%)', maxHeight: '88vh' }}
      >
        {}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-300"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.484.484 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white/90">Cài đặt game</h3>
            <p className="text-[11px] text-white/40 mt-0.5">{profile?.name} · options.txt</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={updateBackup}
              disabled={backingUp}
              data-tip={backupInfo?.backupExists ? 'Cập nhật bản sao lưu options.txt theo cài đặt hiện tại' : 'Tạo bản sao lưu options.txt — dùng cho mọi lần cập nhật sau'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                backingUp ? 'bg-white/10 text-white/40 cursor-wait' : backupInfo?.backupExists ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25' : 'bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
              {backingUp ? 'Đang sao lưu...' : backupInfo?.backupExists ? 'Cập nhật sao lưu' : 'Tạo sao lưu options'}
            </button>
            <button
              onClick={save}
              disabled={saving || !options}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                saving ? 'bg-white/10 text-white/40 cursor-wait' : 'bg-blue-500/80 text-white hover:bg-blue-500'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-all">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        </div>

        {}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-white/5 flex-shrink-0 overflow-x-auto">
          {TABS.map(t => {
            const IconComp = t.Icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                  tab === t.id ? 'bg-blue-500/20 text-blue-300' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <IconComp size={14} weight="duotone" />
                {t.label}
              </button>
            )
          })}
        </div>

        {}
        <div className="flex-1 min-h-0 overflow-y-auto p-5" style={{ scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-white/30 text-xs">Đang tải...</div>
          ) : !options ? (
            <div className="text-center text-white/40 text-xs py-10">Không tìm thấy options.txt</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {activeTab.items.filter(i => i.key !== '').map(item => {
                const raw = options[item.key]
                const val = item.type === 'range' ? toNum(raw, item.min) : clean(raw)
                return (
                  <div key={item.key} className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-white/70">{item.label}</label>
                    {item.type === 'toggle' ? (
                      <button
                        onClick={() => set(item.key, val === 'true' ? 'false' : 'true')}
                        className={`self-start w-9 h-5 rounded-full transition-colors relative ${val === 'true' ? 'bg-blue-500' : 'bg-white/15'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${val === 'true' ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    ) : item.type === 'select' ? (
                      <SelectField value={val} options={item.options} onChange={v => set(item.key, v)} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={item.min}
                          max={item.max}
                          step={item.step}
                          value={val}
                          onChange={e => set(item.key, e.target.value)}
                          className="flex-1 accent-blue-500"
                        />
                        <span className="text-[11px] font-mono text-white/70 w-10 text-right">{val}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {}
        <div className="px-5 py-2 border-t border-white/5 text-[11px] text-center text-white/25 flex-shrink-0">
          {backupInfo?.backupExists ? (
            <span>
              <span className="text-emerald-400/80 font-semibold">Đã có bản sao lưu options.txt</span> — tự khôi phục sau mỗi lần cập nhật dữ liệu. Bấm "Cập nhật sao lưu" để lưu cài đặt hiện tại làm bản sao mới.
            </span>
          ) : (
            <span>
              Chưa có bản sao lưu — lần cập nhật dữ liệu đầu tiên sẽ tự sao lưu options.txt để giữ cài đặt của bạn.
            </span>
          )}
        </div>
        {toast && (
          <div className="px-5 py-2 text-[11px] text-center bg-emerald-500/15 text-emerald-300 border-t border-white/5 flex-shrink-0">{toast}</div>
        )}
      </div>
    </div>
  )
}