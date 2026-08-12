'use strict'

const fs = require('fs')

function readStringTags(buf, tagName) {
  const results = []
  const nameBytes = Buffer.from(tagName, 'utf8')
  for (let i = 0; i + 7 < buf.length; i++) {
    // pattern: TAG_String (0x08) + name: u16 len + bytes + value: u16 len + string
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
