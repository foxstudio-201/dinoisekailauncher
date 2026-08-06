'use strict'

// Tạo electron/build-env.cjs (bị gitignore) chứa token GitHub để app dùng khi tải dữ liệu
// — tránh rate-limit của GitHub API mà NGƯỜI DÙNG không cần nhập gì.
// Chạy từ workflow:  GH_TOKEN=${{ secrets.GH_TOKEN }} node scripts/gen-build-env.cjs

const fs = require('fs')
const path = require('path')

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''
const out = path.join(__dirname, '..', 'electron', 'build-env.cjs')

fs.writeFileSync(
  out,
  `'use strict'\n// Auto-generated at build time (do not edit)\nmodule.exports = ${JSON.stringify({ GITHUB_TOKEN: token }, null, 2)}\n`,
  'utf8'
)

console.log(`[build-env] wrote ${out} (token ${token ? 'embedded' : 'EMPTY — dùng ẩn danh'})`)
