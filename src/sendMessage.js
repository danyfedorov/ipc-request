const { ChildProcess } = require('child_process')
const { inspect } = require('util')

class CannotSendError extends Error {
  constructor ({ messangerProcess, messageType, messageToSend, customMessage }) {
    super()
    const fromPid = process.pid
    const toPid = messangerProcess instanceof ChildProcess ? messangerProcess.pid : process.ppid
    const effectiveMessageType = messageType !== undefined ? messageType : 'message'

    this.message = `Cannot send IPC ${effectiveMessageType} from pid ${fromPid} to pid ${toPid}.
${customMessage}
The ${effectiveMessageType} is:
${inspect(messageToSend)}`
  }
}

const sendMessage = (messangerProcess, messageToSend, messageType) =>
  new Promise((resolve, reject) => {
    const isSent = messangerProcess.send(messageToSend, (error) => {
      if (error) {
        return reject(
          new CannotSendError({
            messangerProcess,
            messageToSend,
            messageType,
            customMessage: error.message
          })
        )
      }
      return resolve()
    })
    if (!isSent) {
      return reject(
        new CannotSendError({
          messangerProcess,
          messageToSend,
          messageType,
          customMessage: `'.send' method returned ${isSent}!`
        })
      )
    }
  })

module.exports = sendMessage
