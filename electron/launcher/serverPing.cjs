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

const net = require('net')
const dns = require('dns')

function writeVarInt(buf, offset, value) {
  while (true) {
    if ((value & ~0x7f) === 0) { buf[offset++] = value; return offset }
    buf[offset++] = (value & 0x7f) | 0x80
    value >>>= 7
  }
}

function varIntLength(value) {
  let len = 0
  while (true) { len++; if ((value & ~0x7f) === 0) return len; value >>>= 7 }
}

function readVarInt(buf, offset) {
  let result = 0, shift = 0
  while (offset < buf.length) {
    const b = buf[offset++]
    result |= (b & 0x7f) << shift
    if ((b & 0x80) === 0) return { value: result, offset }
    shift += 7
    if (shift > 35) return { value: -1, offset }
  }
  return null
}

function encodePacket(payload) {
  const lenBuf = Buffer.alloc(5)
  const lenEnd = writeVarInt(lenBuf, 0, payload.length)
  return Buffer.concat([lenBuf.subarray(0, lenEnd), payload])
}

function parseDescription(desc) {
  if (typeof desc === 'string') return desc
  if (desc?.text) return desc.text
  if (desc?.extra) return desc.extra.map(e => e.text || '').join('')
  if (Array.isArray(desc)) return desc.map(e => parseDescription(e)).join('')
  return ''
}

function formatStatus(data) {
  return {
    motd: parseDescription(data.description) || '',
    players: data.players?.online ?? 0,
    maxPlayers: data.players?.max ?? 0,
    version: data.version?.name || '',
    protocol: data.version?.protocol ?? 0,
    icon: data.favicon || null,
  }
}




function resolveAddress(host, port) {
  return new Promise((resolve) => {
    
    dns.resolveSrv(`_minecraft._tcp.${host}`, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        const srv = addresses[0]
        dns.lookup(srv.name, (err2, ip) => {
          if (!err2 && ip) {
            resolve({ host: srv.name, port: srv.port, ip })
          } else {
            resolve({ host, port, ip: null })
          }
        })
      } else {
        dns.lookup(host, (err2, ip) => {
          resolve({ host, port, ip: err2 ? null : ip })
        })
      }
    })
  })
}

async function pingServer(host, port, timeoutMs = 5000) {
  const resolved = await resolveAddress(host, port || 25565)
  const targetHost = resolved.host
  const targetPort = resolved.port

  return new Promise((resolve) => {
    const socket = new net.Socket()
    let resolved_ = false
    let buf = Buffer.alloc(0)
    let statusJson = null
    let pingSentTime = 0
    let stage = 0

    const timer = setTimeout(() => {
      if (!resolved_) { resolved_ = true; socket.destroy(); resolve({ error: 'timeout' }) }
    }, timeoutMs)

    function finish(err, result) {
      if (resolved_) return
      resolved_ = true
      clearTimeout(timer)
      socket.destroy()
      if (err) resolve({ error: err })
      else resolve(result)
    }

    function tryParse() {
      while (buf.length > 0 && !resolved_) {
        const lenR = readVarInt(buf, 0)
        if (!lenR) return
        const packetLen = lenR.value
        const totalLen = lenR.offset + packetLen
        if (buf.length < totalLen) return

        const idR = readVarInt(buf, lenR.offset)
        if (!idR) return
        const packetId = idR.value
        let consumed = idR.offset

        if (packetId === 0x00 && stage === 0) {
          const jsonR = readVarInt(buf, consumed)
          if (!jsonR) return
          consumed = jsonR.offset
          if (consumed + jsonR.value > buf.length) return
          statusJson = buf.toString('utf8', consumed, consumed + jsonR.value)
          buf = buf.subarray(totalLen)

          stage = 1
          pingSentTime = Date.now()
          const pingPayload = Buffer.alloc(8)
          pingPayload.writeBigInt64BE(BigInt(pingSentTime), 0)
          const pingInner = Buffer.alloc(1)
          writeVarInt(pingInner, 0, 0x01)
          socket.write(encodePacket(Buffer.concat([pingInner, pingPayload])))
          continue 
        }

        if (packetId === 0x01 && stage === 1) {
          buf = buf.subarray(totalLen)
          const latency = Date.now() - pingSentTime
          try {
            const data = JSON.parse(statusJson)
            finish(null, { ping: latency, ...formatStatus(data) })
          } catch { finish('parse_error') }
          return
        }

        buf = buf.subarray(totalLen)
      }
    }

    socket.connect(targetPort, targetHost, () => {
      const hostStr = targetHost
      const hostLen = Buffer.byteLength(hostStr, 'utf8')
      const hBuf = Buffer.alloc(1 + varIntLength(-1) + varIntLength(hostLen) + hostLen + 2 + 1)
      let off = 0
      off = writeVarInt(hBuf, off, 0x00)
      off = writeVarInt(hBuf, off, -1)          
      off = writeVarInt(hBuf, off, hostLen)
      hBuf.write(hostStr, off, 'utf8'); off += hostLen
      hBuf.writeUInt16BE(targetPort, off); off += 2
      off = writeVarInt(hBuf, off, 1)          
      socket.write(encodePacket(hBuf.subarray(0, off)))

      const req = Buffer.alloc(1)
      writeVarInt(req, 0, 0x00)
      socket.write(encodePacket(req))
    })

    socket.on('data', (data) => {
      buf = Buffer.concat([buf, data])
      tryParse()
    })

    socket.on('error', (err) => finish(err.code || err.message))
    socket.on('close', () => { if (!resolved_) finish('closed') })
  })
}

module.exports = { pingServer }
