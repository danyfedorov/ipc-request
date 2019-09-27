# `I P C - R E Q U E S T`

Implements request-response communication pattern with an IPC channel provided by Node when [child_process.fork](https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options)ing.

- [Example](#example)
- [Handshake procedure](#handshake-procedure)

## Example

Consider

```js
// parent.js

const setupIpcSession = require('ipc-request')
const { fork } = require('child_process')

setupIpcSession(fork('./child.js')).then((sendRequest) => {
  console.log('[parent] Hands shook! Now I know that the child process listens to my requests')
  const requestData = '(REQUEST FROM parent.js)'
  console.log('[parent] Sending request: ', requestData)
  return sendRequest(requestData).then((responseData) => {
    console.log('[parent] Got response:    ', responseData)
    process.exit(0)
  })
})
```

```js
// child.js

const setupIpcSession = require('ipc-request')

setupIpcSession(process, (data, sendResponse) => {
  console.log('[child]  Got request:     ', data)
  const responseData = `(RESPONSE FROM child.js TO ${data})`
  console.log('[child]  Sending response:', responseData)
  return sendResponse(responseData).then(() => {
    console.log('[child]  Response sent:   ', responseData)
  })
})
```

Now if you run the parent with

```
$ node parent.js
```

you must see a log similar to this

```
[parent] Hands shook! Now I know that the child process listens to my requests
[parent] Sending request:  (REQUEST FROM parent.js)
[child]  Got request:      (REQUEST FROM parent.js)
[child]  Sending response: (RESPONSE FROM child.js TO (REQUEST FROM parent.js))
[parent] Got response:     (RESPONSE FROM child.js TO (REQUEST FROM parent.js))
[child]  Response sent:    (RESPONSE FROM child.js TO (REQUEST FROM parent.js))
```

In this example, `parent.js` sends requests (a "client") and `child.js` accepts requests and responds (a "server").
But the "client-server" configuration of this example is not mandatory.  
Both child and parent processes can be either "client" or a "server" or a "client" and a "server" at the same time.

## Handshake procedure

I call this handshake procedure a **2-way duplex handshake**.  
It is **2-way** because it involves a _handshake request_ and a _handshake response_. An analogy is the TCP 3-way handshake.  
It is **duplex** because it establishes a session in which both processes can _send_ requests, and at
the same time _receive_ requests and respond to them.

### Handshake step by step

```
------------------------------------------------------------------------------------------> time

  Parent Process
==========================================================================================
> Run   | Setup Session |                       | Resolve     | (Can send
> Child | In Parent (2) |                       | Promise And |  requests
> (1)   |               |~~~~~~~~~~~~~~~~~~~~~~~| Respond (5) |  now)
========|===============|=======================^=============|===========================
        |               |                       |             |
        |               |                       |             |
        | Child Process |                       |             |
        v===============v=======================|=============v===========================
        >         Ignored (3)     Setup Session |             | Resolve   | (Can send
        >                         In Child (4)  |             | Promise   |  requests
        >                                       |.............| (6)       |  now)
        ==================================================================================
```

#### (1) Run Child

The Parent Process runs the Child Process.

#### (2) Setup Session In Parent

The Parent Process initiates a handshake by a call to the `setupIpcSession` function.

2.1. Sets up a _user listener_ for incoming _user requests_ from the Child Process. A _user_ here means a user of the library, a developer.  
2.2. Sends _handshake request_ and listens to _handshake response_.  
2.3. Sets _handshake request_ listener. The time period during which the _handshake request_ listener exists
is shown by the line of tildes: `~~~~~~~~~~~~~`.

#### (3) Ignored

The _handshake request_ from step 2.2 is in vain because the Child Process
didn't call `setupIpcSession` function yet and nothing in the Child Process listens
to _handshake request_.

#### (4) Setup Session In Child

The Child Process initiates a handshake the same way as the Parent Process in step (2).

Most importantly, the Child Process sends a _handshake request_ and listens to a _handshake response_.
Listening to a _handshake response_ is shown by the line of dots: `.............`.

#### (5) Resolve Promise And Respond

The Parent Process listens to _handshake requests_ (`~~~~~~~~~~~~~`) and
once it receives such a request, it knows that the Child Process
has request listener for _user requests_ set up. A promise returned from a `setupIpcSession` call resolves
with `sendRequest` function.

#### (6) Resolve Promise

The Child Process listens to _handshake response_ (`.............`) and
once it receives this response, it knows that the Parent Process
has request listener for _user requests_ set up. A promise returned from a `setupIpcSession` call resolves
with `sendRequest` function.
