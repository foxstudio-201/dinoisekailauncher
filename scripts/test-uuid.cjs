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

const { createHash } = require('crypto')


function md5(input) {
  const msgLen = input.length
  const bitLen = msgLen * 8
  const padLen = ((msgLen % 64) < 56 ? 56 : 120) - (msgLen % 64)
  const padded = Buffer.alloc(msgLen + padLen + 8)
  input.copy(padded)
  padded[msgLen] = 0x80
  padded.writeUInt32LE(bitLen >>> 0,              msgLen + padLen)
  padded.writeUInt32LE(Math.floor(bitLen / 2**32), msgLen + padLen + 4)

  const T = new Uint32Array(64)
  for (let i = 0; i < 64; i++) T[i] = (Math.abs(Math.sin(i + 1)) * 2**32) >>> 0

  const S = [
    7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
    5, 9,14,20, 5, 9,14,20, 5, 9,14,20, 5, 9,14,20,
    4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
    6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21,
  ]

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476

  for (let i = 0; i < padded.length; i += 64) {
    const M = new Uint32Array(16)
    for (let j = 0; j < 16; j++) M[j] = padded.readUInt32LE(i + j * 4)

    let A = a0, B = b0, C = c0, D = d0
    for (let j = 0; j < 64; j++) {
      let F, g
      if      (j < 16) { F = (B & C) | (~B & D); g = j }
      else if (j < 32) { F = (D & B) | (~D & C); g = (5*j+1)%16 }
      else if (j < 48) { F = B ^ C ^ D;           g = (3*j+5)%16 }
      else             { F = C ^ (B | ~D);         g = (7*j)%16 }
      F = (F + A + T[j] + M[g]) >>> 0
      A = D; D = C; C = B
      B = (B + ((F << S[j]) | (F >>> (32 - S[j])))) >>> 0
    }
    a0=(a0+A)>>>0; b0=(b0+B)>>>0; c0=(c0+C)>>>0; d0=(d0+D)>>>0
  }

  const out = Buffer.alloc(16)
  out.writeUInt32LE(a0, 0); out.writeUInt32LE(b0, 4)
  out.writeUInt32LE(c0, 8); out.writeUInt32LE(d0, 12)
  return out
}

function offlineUUID_purejs(username) {
  const input = Buffer.from('OfflinePlayer:' + username, 'utf8')
  const hash  = md5(input)
  hash[6] = (hash[6] & 0x0f) | 0x30
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = hash.toString('hex')
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20,32)].join('-')
}

function offlineUUID_node(username) {
  const input = Buffer.from('OfflinePlayer:' + username, 'utf8')
  const hash  = createHash('md5').update(input).digest()
  hash[6] = (hash[6] & 0x0f) | 0x30
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = hash.toString('hex')
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20,32)].join('-')
}

const names = ['Steve', 'Alex', 'Notch', 'Dino Isekai', 'Player123']
let allPass = true
for (const name of names) {
  const a = offlineUUID_purejs(name)
  const b = offlineUUID_node(name)
  const ok = a === b
  if (!ok) allPass = false
  console.log(`${ok ? '✅' : '❌'} ${name.padEnd(14)} pure-js: ${a}  node: ${b}`)
}
console.log(allPass ? '\n✅ All match — pure-JS MD5 is correct!' : '\n❌ Mismatch detected!')
