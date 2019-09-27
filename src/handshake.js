const nanoid = require('nanoid')
const {
  makeHandshakeRequest,
  makeHandshakeResponseTo,
  isHandshakeRequest,
  isHandshakeResponseTo
} = require('./ipcMessagingUtils')
const sendMessage = require('./sendMessage')

/**
 * 2-way duplex handshake
 *
 * See the `Handshake Procedure` paragraph in the `README.md`
 * @param {ChildProcess|global.process} messangerProcess
 */
const handshake = (messangerProcess) => {
  let handshakeRequestListener, handshakeResponseListener

  const sendHandshakeRequestAndGetResponse = () => {
    const handshakeUID = nanoid()
    return new Promise((resolve, reject) => {
      handshakeResponseListener = (message) => {
        if (isHandshakeResponseTo(message, handshakeUID)) {
          return resolve('The SEND/GET handshake sequence succeed')
        }
      }
      messangerProcess.on('message', handshakeResponseListener)
      sendMessage(messangerProcess, makeHandshakeRequest(handshakeUID), 'handshake request').catch(
        reject
      )
    })
  }

  const getHandshakeRequestAndSendResponse = () =>
    new Promise((resolve, reject) => {
      handshakeRequestListener = (message) => {
        if (isHandshakeRequest(message)) {
          return sendMessage(
            messangerProcess,
            makeHandshakeResponseTo(message),
            'handshake response'
          )
            .then(() => resolve('The GET/SEND handshake sequence succeed'))
            .catch(reject)
        }
      }
      messangerProcess.on('message', handshakeRequestListener)
    })

  return Promise.race([
    sendHandshakeRequestAndGetResponse(),
    getHandshakeRequestAndSendResponse()
  ]).then((handshakeResolutionMsg) => {
    messangerProcess.removeListener('message', handshakeResponseListener)
    messangerProcess.removeListener('message', handshakeRequestListener)
    return handshakeResolutionMsg
  })
}

module.exports = handshake
