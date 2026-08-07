'use strict'

// Điều khiển tạm dừng / hủy tải cho các tiến trình tải dữ liệu
const controllers = new Map()

function startOp(name) {
  controllers.delete(name)
  controllers.set(name, new AbortController())
}
function endOp(name) {
  controllers.delete(name)
}
function abortOp(name) {
  const c = controllers.get(name)
  if (c) c.abort()
}
function getSignal(name) {
  return controllers.get(name)?.signal || null
}
function isAborted(name) {
  const c = controllers.get(name)
  return c ? c.signal.aborted : false
}

module.exports = { startOp, endOp, abortOp, getSignal, isAborted }
