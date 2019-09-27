const sendMessage = require('./sendMessage')
const { ChildProcess } = require('child_process')

it('rejects if process.send returns false', () => {
  const failingChildProcess = Object.assign(Object.create(ChildProcess.prototype), {
    send: () => false,
    pid: 'mockPid'
  })
  return expect(sendMessage(failingChildProcess, 'mockMsg', 'mockMessageType')).rejects
    .toMatchInlineSnapshot(`
[Error: Cannot send IPC mockMessageType from pid ${process.pid} to pid mockPid.
'.send' method returned false!
The mockMessageType is:
'mockMsg']
`)
})

it('rejects if process.send callback is called with error', () => {
  const mockError = new Error('mockError message')
  const failingProcess = {
    send: (msg, cb) => {
      setTimeout(() => cb(mockError))
      return true
    }
  }
  return expect(sendMessage(failingProcess, 'mockMsg')).rejects.toMatchInlineSnapshot(`
[Error: Cannot send IPC message from pid ${process.pid} to pid ${process.ppid}.
mockError message
The message is:
'mockMsg']
`)
})
