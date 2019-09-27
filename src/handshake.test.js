const { EventEmitter } = require('events')
const {
  isHandshakeRequest,
  isHandshakeResponseTo,
  makeHandshakeResponseTo,
  makeHandshakeRequest
} = require('./ipcMessagingUtils')
const nanoid = require('nanoid')

jest.mock('./sendMessage')

it('sends handshake request and waits for response', () => {
  expect.assertions(5)

  const mockMessangerProcess = new EventEmitter()
  let handshakeRequest
  const handshakeRequestSentPromise = new Promise((resolve) => {
    require('./sendMessage').mockImplementationOnce((process, message, messageType) => {
      expect(process).toBe(mockMessangerProcess)
      expect(isHandshakeRequest(message)).toBe(true)
      expect(messageType).toBe('handshake request')
      handshakeRequest = message
      resolve()
      return Promise.resolve()
    })
  })

  const handshake = require('./handshake')
  const handshakePromise = handshake(mockMessangerProcess)
  return handshakeRequestSentPromise.then(() => {
    mockMessangerProcess.emit('message', makeHandshakeResponseTo(handshakeRequest))
    return handshakePromise.then((handshakeResolutionMsg) => {
      expect(mockMessangerProcess.listenerCount()).toBe(0)
      expect(handshakeResolutionMsg).toBe('The SEND/GET handshake sequence succeed')
    })
  })
})

it('waits for handshake request and sends response', () => {
  expect.assertions(8)

  const mockMessangerProcess = new EventEmitter()
  const handshakeUID = nanoid()
  const handshakeResponseSentPromise = new Promise((resolve) => {
    require('./sendMessage')
      .mockImplementationOnce((process, message, messageType) => {
        expect(process).toBe(mockMessangerProcess)
        expect(isHandshakeRequest(message)).toBe(true)
        expect(messageType).toBe('handshake request')
        return Promise.resolve()
      })
      .mockImplementationOnce((process, message, messageType) => {
        expect(process).toBe(mockMessangerProcess)
        expect(isHandshakeResponseTo(message, handshakeUID)).toBe(true)
        expect(messageType).toBe('handshake response')
        resolve()
        return Promise.resolve()
      })
  })

  const handshake = require('./handshake')
  const handshakePromise = handshake(mockMessangerProcess)
  mockMessangerProcess.emit('message', makeHandshakeRequest(handshakeUID))
  return handshakeResponseSentPromise.then(() => {
    return handshakePromise.then((handshakeResolutionMsg) => {
      expect(mockMessangerProcess.listenerCount()).toBe(0)
      expect(handshakeResolutionMsg).toBe('The GET/SEND handshake sequence succeed')
    })
  })
})

it('resolves and deletes listeners if both handshake sequences execute', () => {
  expect.assertions(4)

  const mockMessangerProcess = new EventEmitter()
  const handshakeUID = nanoid()
  let handshakeRequest
  let handshakeResponseSentPromise
  // eslint-disable-next-line promise/param-names
  const handshakeRequestSentPromise = new Promise((resolveRequestSent) => {
    // eslint-disable-next-line promise/param-names
    handshakeResponseSentPromise = new Promise((resolveResponseSent) => {
      require('./sendMessage')
        .mockImplementationOnce((process, message) => {
          handshakeRequest = message
          expect(isHandshakeRequest(message)).toBe(true)
          resolveRequestSent()
          return Promise.resolve()
        })
        .mockImplementationOnce((process, message) => {
          resolveResponseSent()
          expect(isHandshakeResponseTo(message, handshakeUID)).toBe(true)
          return Promise.resolve()
        })
    })
  })
  const handshake = require('./handshake')
  const handshakePromise = handshake(mockMessangerProcess)
  mockMessangerProcess.emit('message', makeHandshakeRequest(handshakeUID))
  handshakeRequestSentPromise.then(() => {
    mockMessangerProcess.emit('message', makeHandshakeResponseTo(handshakeRequest))
  })
  return handshakeResponseSentPromise.then(() => {
    handshakePromise.then((handshakeResolutionMsg) => {
      expect(mockMessangerProcess.listenerCount()).toBe(0)
      expect([
        'The GET/SEND handshake sequence succeed',
        'The SEND/GET handshake sequence succeed'
      ]).toEqual(expect.arrayContaining([ handshakeResolutionMsg ]))
    })
  })
})

it('handshake rejects if sendMessage rejects', () => {
  const mockError = new Error()
  require('./sendMessage').mockImplementationOnce(() => {
    throw mockError
  })
  const handshake = require('./handshake')
  return expect(handshake(new EventEmitter())).rejects.toBe(mockError)
})
