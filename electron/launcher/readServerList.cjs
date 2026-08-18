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
'use strict'

const fs = require('fs')

function readStringTags(buf, tagName) {
  const results = []
  const nameBytes = Buffer.from(tagName, 'utf8')
  for (let i = 0; i + 7 < buf.length; i++) {
    
    if (buf[i] === 0x08 && buf.readUInt16BE(i + 1) === nameBytes.length) {
      let match = true
      for (let j = 0; j < nameBytes.length; j++) {
        if (buf[i + 3 + j] !== nameBytes[j]) { match = false; break }
      }
      if (match) {
        const valOff = i + 3 + nameBytes.length
        if (valOff + 2 <= buf.length) {
          const len = buf.readUInt16BE(valOff)
          if (len > 0 && len < 512 && valOff + 2 + len <= buf.length) {
            results.push(buf.toString('utf8', valOff + 2, valOff + 2 + len))
          }
        }
      }
    }
  }
  return results
}

function readServerList(filePath) {
  const buf = fs.readFileSync(filePath)
  const ips = readStringTags(buf, 'ip')
  return ips.map(ip => ({ name: '', ip }))
}

module.exports = { readServerList }
