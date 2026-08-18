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







const { rcedit } = require('rcedit')
const path   = require('path')
const fs     = require('fs')

const electronExe = path.join(__dirname, '../node_modules/electron/dist/electron.exe')
const iconFile    = path.join(__dirname, '../public/icon.ico')

if (!fs.existsSync(electronExe)) {
  console.error('❌  electron.exe not found:', electronExe)
  process.exit(1)
}
if (!fs.existsSync(iconFile)) {
  console.error('❌  icon.ico not found:', iconFile)
  process.exit(1)
}

console.log('🔧  Patching electron.exe with Dino Isekai icon...')

rcedit(electronExe, {
  icon: iconFile,
  'version-string': {
    ProductName:     'Dino Isekai',
    FileDescription: 'Dino Isekai',
    CompanyName:     'Dino Isekai',
    LegalCopyright:  '© 2026 Dino Isekai',
    InternalName:    'Dino Isekai',
    OriginalFilename: 'Dino Isekai.exe',
  },
  'file-version':    '1.0.0.0',
  'product-version': '1.0.0.0',
}, (err) => {
  if (err) {
    console.error('❌  Failed to patch:', err.message)
    process.exit(1)
  }
  console.log('✅  electron.exe patched successfully!')
  console.log('    Restart the app to see the new icon in Task Manager.')
})
