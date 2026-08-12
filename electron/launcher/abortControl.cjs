'use strict'

const controllers = new Map()
const actions = new Map()

function startOp(name) {
  controllers.delete(name)
  actions.delete(name)
  controllers.set(name, new AbortController())
}
function endOp(name) {
  controllers.delete(name)
  actions.delete(name)
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
// action: 'pause' | 'cancel'
function setAction(name, action) {
  if (action) actions.set(name, action)
}
function getAction(name) {
  return actions.get(name) || 'pause'
}

module.exports = { startOp, endOp, abortOp, getSignal, isAborted, setAction, getAction }
