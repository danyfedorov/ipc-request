const {
  UID_PROPNAME,
  PAYLOAD_PROPNAME,
  MSG_TYPE_PROPNAME,
  REQUEST_MSG,
  RESPONSE_MSG,
  HANDSHAKE_UID_PROPNAME,
  HANDSHAKE_MSG_TYPE_PROPNAME,
  HANDSHAKE_REQUEST_MSG,
  HANDSHAKE_RESPONSE_MSG
} = require('./constants')
const { isPlainObject } = require('lodash')

const makeIpcRequest = (ipcRequestUID, requestData) => ({
  [MSG_TYPE_PROPNAME]: REQUEST_MSG,
  [UID_PROPNAME]: ipcRequestUID,
  [PAYLOAD_PROPNAME]: requestData
})

const makeIpcResponseTo = (ipcRequestMsg, responseData) => ({
  [MSG_TYPE_PROPNAME]: RESPONSE_MSG,
  [UID_PROPNAME]: ipcRequestMsg[UID_PROPNAME],
  [PAYLOAD_PROPNAME]: responseData
})

const isIpcRequestOrResponse = (message) =>
  isPlainObject(message) &&
  message.hasOwnProperty(MSG_TYPE_PROPNAME) &&
  message.hasOwnProperty(UID_PROPNAME) &&
  message.hasOwnProperty(PAYLOAD_PROPNAME)

const isIpcRequest = (message) =>
  isIpcRequestOrResponse(message) && message[MSG_TYPE_PROPNAME] === REQUEST_MSG

const isIpcResponse = (message) =>
  isIpcRequestOrResponse(message) && message[MSG_TYPE_PROPNAME] === RESPONSE_MSG

const isIpcResponseTo = (ipcRequestUID, ipcResponseMsg) =>
  isIpcResponse(ipcResponseMsg) && ipcResponseMsg[UID_PROPNAME] === ipcRequestUID

const isHandshakeMessage = (message) =>
  isPlainObject(message) &&
  message.hasOwnProperty(HANDSHAKE_UID_PROPNAME) &&
  message.hasOwnProperty(HANDSHAKE_MSG_TYPE_PROPNAME)

const isHandshakeRequest = (message) =>
  isHandshakeMessage(message) && message[HANDSHAKE_MSG_TYPE_PROPNAME] === HANDSHAKE_REQUEST_MSG

const isHandshakeResponse = (message) =>
  isHandshakeMessage(message) && message[HANDSHAKE_MSG_TYPE_PROPNAME] === HANDSHAKE_RESPONSE_MSG

const isHandshakeResponseTo = (message, expectedHandshakeUID) =>
  isHandshakeResponse(message) && message[HANDSHAKE_UID_PROPNAME] === expectedHandshakeUID

const makeHandshakeRequest = (handshakeUID) => ({
  [HANDSHAKE_UID_PROPNAME]: handshakeUID,
  [HANDSHAKE_MSG_TYPE_PROPNAME]: HANDSHAKE_REQUEST_MSG
})

const makeHandshakeResponseTo = (handshakeRequest) => ({
  [HANDSHAKE_UID_PROPNAME]: handshakeRequest[HANDSHAKE_UID_PROPNAME],
  [HANDSHAKE_MSG_TYPE_PROPNAME]: HANDSHAKE_RESPONSE_MSG
})

module.exports = {
  makeIpcRequest,
  makeIpcResponseTo,
  isIpcRequest,
  isIpcResponse,
  isIpcResponseTo,
  makeHandshakeRequest,
  makeHandshakeResponseTo,
  isHandshakeRequest,
  isHandshakeResponse,
  isHandshakeResponseTo
}
