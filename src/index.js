const nanoid = require('nanoid')
const { PAYLOAD_PROPNAME } = require('./constants')
const {
  makeIpcRequest,
  makeIpcResponseTo,
  isIpcRequest,
  isIpcResponse,
  isIpcResponseTo,
  isHandshakeRequest,
  isHandshakeResponse
} = require('./ipcMessagingUtils')
const sendMessage = require('./sendMessage')
const handshake = require('./handshake')

const createSendRequest = (messangerProcess) => {
  return (requestData) =>
    new Promise((resolve, reject) => {
      const ipcRequestUID = nanoid()

      const ipcResponseListener = (ipcResponseMsg) => {
        if (isIpcResponseTo(ipcRequestUID, ipcResponseMsg)) {
          messangerProcess.removeListener('message', ipcResponseListener)
          return resolve(ipcResponseMsg[PAYLOAD_PROPNAME])
        }
      }
      messangerProcess.on('message', ipcResponseListener)

      sendMessage(messangerProcess, makeIpcRequest(ipcRequestUID, requestData), 'request').catch(
        reject
      )
    })
}

/**
 * Sends `responseData` on the first call. Does nothing on consequent calls.
 * @typedef {function} SendResponseFn
 * @param {any} responseData
 * The data to respond with
 * @returns {Promise<Boolean>}
 * Resolves with `true` when the data is sent. Which does not mean it is received the other end.
 * Resolves with `false` on consequent calls to the function.
 * It means that response was not sent this time because it was sent before.
 */
/**
 * @typedef {function} CustomIpcRequestListenerFn
 * @param {any} requestData
 * The data from incoming request
 * @param {SendResponseFn} sendResponse
 * Use this function to send response
 * @returns {any}
 */
/**
 * @typedef {function} SendRequestFn
 * @param {any} requestData
 * The data to send with the request
 * @returns {Promise<any>}
 * Resolves with response to the request
 */
/**
 * @param {ChildProcess|global.process} messangerProcess
 * Either a child process created by the current script
 * or a process object if current script is the one that is created.
 * @param {Object} options
 * @param {CustomIpcRequestListenerFn} options.ipcRequestListener
 * @param {function} options.elseMessageListener
 * Is called on messages that do not conform to `ipc-request` protocol
 * @returns {Promise<SendRequestFn>}
 * Resolves when the child process or the parent process is ready to accept requests.
 */
const setupIpcSession = (
  messangerProcess,
  {
    ipcRequestListener: customIpcRequestListener,
    elseMessageListener: customElseMessageListener
  } = {}
) => {
  if (customIpcRequestListener !== undefined) {
    const ipcRequestListener = (message) => {
      if (isIpcRequest(message)) {
        let responseWasSent = false
        const sendResponse = (responseData) => {
          if (responseWasSent) {
            return Promise.resolve(false)
          }
          return sendMessage(
            messangerProcess,
            makeIpcResponseTo(message, responseData),
            'response'
          ).then(() => {
            responseWasSent = true
            return true
          })
        }
        customIpcRequestListener(message[PAYLOAD_PROPNAME], sendResponse)
      }
    }
    messangerProcess.on('message', ipcRequestListener)
  }

  if (customElseMessageListener !== undefined) {
    const elseMessageListener = (message) => {
      if (
        !(
          isIpcRequest(message) ||
          isIpcResponse(message) ||
          isHandshakeRequest(message) ||
          isHandshakeResponse(message)
        )
      ) {
        customElseMessageListener(message)
      }
    }
    messangerProcess.on('message', elseMessageListener)
  }

  return handshake(messangerProcess).then(() => createSendRequest(messangerProcess))
}

module.exports = setupIpcSession
