const EventEmitter = require('events')

const mockMessagerProcessees = () => {
  const p1 = new EventEmitter()
  const p2 = new EventEmitter()
  p1.send = (msg, cb = () => {}) => {
    setTimeout(() => {
      p2.emit('message', msg)
      cb()
    })
    return true
  }
  p2.send = (msg, cb = () => {}) => {
    setTimeout(() => {
      p1.emit('message', msg)
      cb()
    })
    return true
  }
  return [ p1, p2 ]
}

it('can send message and receive response', () => {
  expect.assertions(2)

  const [ mockServerProcess, mockClientProcess ] = mockMessagerProcessees()
  const setupIpcSession = require('./index')
  const mockRequestMessage = Symbol('mockRequestMessage')
  const mockResponseMessage = Symbol('mockResponseMessage')
  const serverPromise = setupIpcSession(mockServerProcess, {
    ipcRequestListener: (requestMsg, sendResponse) => {
      expect(requestMsg).toBe(mockRequestMessage)
      sendResponse(mockResponseMessage)
    }
  })
  const clientPromise = setupIpcSession(mockClientProcess)
  return Promise.all([ clientPromise, serverPromise ]).then(([ sendRequest ]) => {
    return sendRequest(mockRequestMessage).then((responseMsg) => {
      expect(responseMsg).toBe(mockResponseMessage)
    })
  })
})

it('sendResponse returns false on consequent calls because cannot send several responses', () => {
  expect.assertions(4)

  const [ mockServerProcess, mockClientProcess ] = mockMessagerProcessees()
  const setupIpcSession = require('./index')
  const mockRequestMessage = Symbol('mockRequestMessage')
  const mockResponseMessage = Symbol('mockResponseMessage')
  const serverTestsPromise = new Promise((resolve, reject) => {
    setupIpcSession(mockServerProcess, {
      ipcRequestListener: (requestMsg, sendResponse) => {
        expect(requestMsg).toBe(mockRequestMessage)
        sendResponse(mockResponseMessage)
          .then((successfulResponseResult) => {
            expect(successfulResponseResult).toBe(true)
            return Promise.all([ sendResponse(), sendResponse(), sendResponse() ])
          })
          .then((failedResponseResults) => {
            expect(failedResponseResults).toEqual([ false, false, false ])
            resolve()
          })
          .catch(reject)
      }
    }).catch(reject)
  })
  const clientTestsPromise = setupIpcSession(mockClientProcess).then((sendRequest) => {
    return sendRequest(mockRequestMessage).then((responseMsg) => {
      expect(responseMsg).toBe(mockResponseMessage)
    })
  })
  return Promise.all([ serverTestsPromise, clientTestsPromise ])
})

it('elseMessageListener receives only non-ipc messages', () => {
  expect.assertions(3)

  const [ mockServerProcess, mockClientProcess ] = mockMessagerProcessees()
  const setupIpcSession = require('./index')
  const mockRequestMessage = Symbol('mockRequestMessage')
  const mockResponseMessage = Symbol('mockResponseMessage')
  const mockRandomMessage = Symbol('mockRandomMessage')
  const serverTestsPromise = new Promise((resolve, reject) => {
    setupIpcSession(mockServerProcess, {
      ipcRequestListener: (requestMsg, sendResponse) => {
        expect(requestMsg).toBe(mockRequestMessage)
        sendResponse(mockResponseMessage).catch(reject)
      },
      elseMessageListener: (message) => {
        expect(message).toBe(mockRandomMessage)
        resolve()
      }
    })
  })
  const clientTestsPromise = setupIpcSession(mockClientProcess).then((sendRequest) => {
    mockClientProcess.send(mockRandomMessage)
    return sendRequest(mockRequestMessage).then((responseMsg) => {
      expect(responseMsg).toBe(mockResponseMessage)
    })
  })
  return Promise.all([ serverTestsPromise, clientTestsPromise ])
})

it('overlapping requests work: req1 req2 res2 res1', () => {
  expect.assertions(2)

  const [ mockServerProcess, mockClientProcess ] = mockMessagerProcessees()
  const setupIpcSession = require('./index')
  const mockRequestMessage1 = Symbol('mockRequestMessage1')
  const mockResponseMessage1 = Symbol('mockResponseMessage1')
  const mockRequestMessage2 = Symbol('mockRequestMessage2')
  const mockResponseMessage2 = Symbol('mockResponseMessage2')
  let sendResponse1
  const serverPromise = setupIpcSession(mockServerProcess, {
    ipcRequestListener: (requestMsg, sendResponse) => {
      if (requestMsg === mockRequestMessage1) {
        sendResponse1 = sendResponse
      }
      if (requestMsg === mockRequestMessage2) {
        sendResponse(mockResponseMessage2).then(() => sendResponse1(mockResponseMessage1))
      }
    }
  })
  const clientPromise = setupIpcSession(mockClientProcess)
  return Promise.all([ clientPromise, serverPromise ]).then(([ sendRequest ]) => {
    const responsePromise1 = sendRequest(mockRequestMessage1)
    const responsePromise2 = sendRequest(mockRequestMessage2)
    const raceTestPromise = Promise.race([ responsePromise1, responsePromise2 ]).then(
      (responseMsg) => {
        expect(responseMsg).toBe(mockResponseMessage2)
      }
    )
    const response1TestPromise = responsePromise1.then((responseMsg) => {
      expect(responseMsg).toBe(mockResponseMessage1)
    })
    return Promise.all([ raceTestPromise, response1TestPromise ])
  })
})
