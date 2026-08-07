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

const DiscordRPC = require('discord-rpc')

const CLIENT_ID = '1535198335470936184'

let client    = null
let connected = false
let retryTimer = null
let intentionalDisconnect = false

const DEFAULT_ACTIVITY = {
  details:      'Dino Isekai',
  state:        'Đang ở menu chính',
  largeImageKey:  'icon.png',
  largeImageText: 'Dino Isekai',
  instance: false,
}

let currentActivity = { ...DEFAULT_ACTIVITY }

async function connect() {
  if (CLIENT_ID === 'YOUR_DISCORD_CLIENT_ID') {
    console.log('[Discord RPC] CLIENT_ID not configured — skipping')
    return
  }

  try {
    DiscordRPC.register(CLIENT_ID)
    client = new DiscordRPC.Client({ transport: 'ipc' })

    client.on('ready', () => {
      connected = true
      console.log('[Discord RPC] Connected as', client.user?.username)
      setActivity(currentActivity)
    })

    client.on('disconnected', () => {
      connected = false
      console.log('[Discord RPC] Disconnected')
      if (!intentionalDisconnect) scheduleRetry()
    })

    await client.login({ clientId: CLIENT_ID })
  } catch (err) {
    console.warn('[Discord RPC] Connect failed:', err.message)
    connected = false
    scheduleRetry()
  }
}

function scheduleRetry() {
  if (retryTimer) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    connect()
  }, 15000)
}

function setActivity(activity = {}) {
  currentActivity = {
    ...DEFAULT_ACTIVITY,
    ...activity,
    startTimestamp: currentActivity.startTimestamp ?? Date.now(),
  }

  if (!connected || !client) return

  client.setActivity(currentActivity).catch(err => {
    console.warn('[Discord RPC] setActivity failed:', err.message)
  })
}

function disconnect() {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  if (client) {
    try { client.destroy() } catch {}
    client    = null
    connected = false
  }
}

const PRESETS = {
  menu: () => setActivity({
    details: 'Dino Isekai',
    state:   'Đang ở menu chính',
  }),
  browsing: (page) => setActivity({
    details: 'Dino Isekai',
    state:   `Đang xem: ${page}`,
  }),
  launching: (version) => setActivity({
    details: `Đang khởi chạy Minecraft ${version}`,
    state:   'Chuẩn bị vào game...',
  }),
  playing: (version, profileName, username) => setActivity({
    details: `Đang chơi Minecraft ${version}`,
    state:   profileName ? `${profileName} · ${username}` : (username || 'Đang chơi'),
    largeImageKey: 'icon.png',
    largeImageText: profileName || 'Dino Isekai',
  }),
}

module.exports = { connect, disconnect, setActivity, PRESETS }

