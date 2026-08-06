/**
 * Patch icon vào electron.exe trong node_modules để hiện đúng icon
 * trong Task Manager và taskbar khi chạy dev mode.
 *
 * Chạy: node scripts/patch-electron-icon.cjs
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
