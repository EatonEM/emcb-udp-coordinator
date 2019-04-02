# Table of Contents

- [Class: EmcbUDPbroadcastMaster](#emcbudpbroadcastmaster)
  - [Class Properties](#emcbudpbroadcastmaster-properties)
  - [new EmcbUDPbroadcastMaster(args)](#new-emcbudpbroadcastmasterargs)
  - [updateBroadcastUDPkey(key)](#updatebroadcastudpkeykey)
  - [updateUnicastUDPkey(key)](#updateunicastudpkeyiddevice-key)
  - [getDevice(ipAddressOrIdDevice)](#getDeviceipaddressoriddevice)
  - [discoverDevices([nonce])](#discoverdevicesnonce)
  - [syncDeviceSequenceNumbers()](#syncdevicesequencenumbers)
  - [getNextSequenceNumber([nonce])](#getnextsequencenumbernonce)
  - [getBreakerRemoteHandlePosition()](#getbreakerremotehandleposition)
  - [getMeterData()](#getmeterdata)
  - [getDeviceStatus()](#getdevicestatus)
  - [setNextSequenceNumber(desiredNextSequenceNumber)](#setnextsequencenumberdesirednextsequencenumber)
  - [setBreakerState(desiredState[, maxAttempts])](#setbreakerstatedesiredstate-maxattempts)
  - [setBargraphLEDToUserDefinedColor(enabled[, colorObj, blinking])](#setbargraphledtouserdefinedcolorenabled-colorobj-blinking)
  - [setBargraphLEDToUserDefinedColorName(colorName[, duration, blinking])](#setbargraphledtouserdefinedcolornamecolorname-duration-blinking)
- [Class: EmcbUDPdeviceMaster](#emcbudpdevicemaster)
  - [Class Properties](#emcbudpdevicemaster-properties)
- [EventEmitter Cheat Sheet](#eventemitter-cheat-sheet)
- [Class: logger](#logger)
- [Constants](#constants)
  - [Network Configuration](#network-configuration)
    - [EMCB_UDP_BROADCAST_ADDRESS](#EMCB_UDP_BROADCAST_ADDRESS)
    - [EMCB_UDP_PORT](#EMCB_UDP_PORT)
  - [EMCB UDP Application Layer](#emcb-udp-application-layer)
    - [EMCB_UDP_IMPLEMENTED_PROTOCOL_VERSION](#EMCB_UDP_IMPLEMENTED_PROTOCOL_VERSION)
    - [EMCB_UDP_MESSAGE_THROTTLE_TIME_MS](#EMCB_UDP_MESSAGE_THROTTLE_TIME_MS)
    - [EMCB_UDP_LONGEST_IMPLEMENTED_MESSAGE_LENGTH](#EMCB_UDP_LONGEST_IMPLEMENTED_MESSAGE_LENGTH)
    - [Header](#emcb-udp-application-layer-header)
      - [EMCB_UDP_HEADER_START_MASTER](#EMCB_UDP_HEADER_START_MASTER)
      - [EMCB_UDP_HEADER_START_SLAVE](#EMCB_UDP_HEADER_START_SLAVE)
    - [Message Codes](#message-codes)
      - [GET Message Codes](#get-message-codes)
        - [EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER](#EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER)
        - [EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS](#EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS)
        - [EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION](#EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION)
        - [EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA](#EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA)
      - [SET Message Codes](#set-message-codes)
        - [EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER](#EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER)
        - [EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION](#EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION)
        - [EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED](#EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED)
      - [EMCB_UDP_MESSAGE_CODES](#EMCB_UDP_MESSAGE_CODES)
  - [Enums and Parsed Data](#enums-and-parsed-data)
    - [EMCB_UDP_ACK](#EMCB_UDP_ACK)
    - [EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_RATE_LIMITED](#EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_RATE_LIMITED)
    - [EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_BAD_SEQUENCE_NUMBER](#EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_BAD_SEQUENCE_NUMBER)
    - [EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN](#EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN)
    - [EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED](#EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED)
    - [EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_FEEDBACK_MISMATCH](#EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_FEEDBACK_MISMATCH)
    - [EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE](#EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE)
  - [Events](#events)
    - [EMCB_UDP_EVENT_QUEUE_DRAINED](#EMCB_UDP_EVENT_QUEUE_DRAINED)
    - [EMCB_UDP_EVENT_DEVICE_DISCOVERED](#EMCB_UDP_EVENT_DEVICE_DISCOVERED)
    - [EMCB_UDP_EVENT_DEVICE_REMOVED](#EMCB_UDP_EVENT_DEVICE_REMOVED)
    - [EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED](#EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED)
  - [Errors](#errors)
    - [EMCB_UDP_ERROR_TIMEOUT](#EMCB_UDP_ERROR_TIMEOUT)
    - [EMCB_UDP_EVENT_PARSER_ERROR](#EMCB_UDP_EVENT_PARSER_ERROR)
    - [EMCB_UDP_ERROR_INVALID_DATA_LENGTH](#EMCB_UDP_ERROR_INVALID_DATA_LENGTH)
  - [Others](#others)
    - [EMCB_UDP_DEVICE_COLORS](#EMCB_UDP_DEVICE_COLORS)

## EmcbUDPbroadcastMaster

[`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) is the primary class exposed by `require('emcbUDPmaster')`.  This class manages all UDP traffic to the EMCBs.  It facilitates device discovery, [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) creation and management, and holds the message queues, manages timeouts, etc. for both broadcast and unicast traffic.

In addition to the commands listed below, [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) extends the [EventEmitter](https://nodejs.org/api/events.html) class and makes the events described in [EventEmitter Cheat Sheet](#eventemitter-cheat-sheet) available to `.on()`, `.once()`, etc.

```js
const { EmcbUDPbroadcastMaster } = require('emcbUDPmaster');
// or
const master0 = require('emcbUDPmaster').EmcbUDPbroadcastMaster
```

### EmcbUDPbroadcastMaster Properties

In addition to the functions described below, an [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) instance has the following properties available to access:

- `ipAddress` _(String)_: The local network broadcast IP Address used by the instance.
- `port` _(Number)_: The Destination UDP port number used by the instance and all [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) instances.
- `devices` _(Object)_: An object indexed by individual EMCB device `IP Addresses`, which holds all [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) instances for the discovered devices.
- `udpSocket` _(dgram.Socket)_: The [Node.js udp4 Socket](https://nodejs.org/api/dgram.html#dgram_class_dgram_socket) used for all local communication on the network.
- `unhandledMessages` _(Number)_: Integer number of times that we have received data from the network without an active message to process it against.   In other words, this is the number of times EMCBs have provided data beyond the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) instance's timeout for a message.

### new EmcbUDPbroadcastMaster(args)

Creates an instance of the Broadcast Master object.

- `args` _(Object)_
  - `broadcastUDPKey` _(Buffer)_: UDP Key for signing/validating all broadcast messages
  - `unicastUDPKeys` _(Object)_: `[Key]: Value` pairs for unicast UDP Keys for signing/validating messages
    - _`$DEVICE_ID`_ _(Buffer)_:  UDP Key for signing/validating all unicast messages for the particular device ID.
  - [`port`] _(String)_: Optional destination UDP port number to use for all communication.  Defaults to [EMCB_UDP_PORT](#EMCB_UDP_PORT).
  - [`sequenceNumber`] _(Number)_: Optional "Next" Sequence Number that we will use when interacting with this device.  Defaults to a random number within the legal UInt32 range of 0 <= x <= 0xFFFFFFFF.  **This value should be left undefined or retreived from non-volatile memory and set to the last highest sequence number used to maintain cybersecurity.**
- **RETURNS** `instance` _(EmcbUDPbroadcastMaster)_: an instantiated [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster).

```js
const { EmcbUDPbroadcastMaster } = require('./emcbUDPmaster');

var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : Buffer.from("DD4253D8725A02A0C1FA3417D809686FE397CC8148EFF5328CE436644849A225", "hex"),
    unicastUDPKeys  : {
        "30000c2a690c7652" : Buffer.from("01C43A38DF5669F3D410602437EC2EF3DAEB12AED3C7EB3FA192D581D2AB9F20", "hex"),
    }
})
```

**NOTE** For the class to do anything useful, you need to provide keys for the devices on your local network gathered from the [EMCB Cloud API](https://portal.developer.eatonem.com/).

### updateBroadcastUDPkey(key)

Updates the broadcast UDP Key provisioned via the [EMCB Cloud API](https://portal.developer.eatonem.com/).

- `key` _(Buffer)_: UDP Key for signing/validating all broadcast messages

```javascript
const crypto = require("crypto")
EMCBs.updateBroadcastUDPkey(crypto.randomBytes(32))
// Don't expect to find any EMCBs this way due to the VERY low probability of randomly generating an in use key, but the API syntax should work :)
```

### updateUnicastUDPkey(idDevice, key)

Updates the unicast UDP Key for a particular device provisioned via the [EMCB Cloud API](https://portal.developer.eatonem.com/).

- `idDevice` _(String)_: Device ID using the unicast key
- `key` _(Buffer)_: UDP Key for signing/validating all unicast messages for this particular device ID.

```javascript
EMCBs.updateUnicastUDPkey("30000c2a690c7652", Buffer.from("DD4253D8725A02A0C1FA3417D809686FE397CC8148EFF5328CE436644849A225", "hex")
```

### getDevice(ipAddressOrIdDevice)

Get the [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the specified `ipAddress` or `idDevice`, assuming that it has been successfully discovered and is communicating with the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster)/[`EmcbUDPdeviceMaster`](#emcbudpdevicemaster).

- `ipAddressOrIdDevice` _(String)_: Local IP Address or Device ID of the device
- **RETURNS** [`instance`] _(EmcbUDPdeviceMaster | undefined)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the given `ipAddressOrIdDevice` or `undefined` if none was found.

```javascript
console.log(EMCBs.getDevice("30000c2a690c7652").idDevice)
// 30000c2a690c7652
```

### discoverDevices([nonce])

Discover EMCBs on the local network using the provisioned UDP broadcast key.  This is a convenience wrapper that performs 4 [getNextSequenceNumber()](#getnextsequencenumbernonce) commands and returns a `Promise` that will resolve with the list of all active devices within the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) or reject with an [`Error`](https://nodejs.org/api/errors.html) if none have been found.

> [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) will self call this function every 5 minutes to detect any devices that are added to the network.

- [`nonce`] _(Buffer)_:  Optional 4 byte UInt32 held within a [`Buffer`](https://nodejs.org/api/buffer.html). Defaults to `crypto.random(4)`.  **NOTE** - `nonce` should **NEVER** be provided in production code (as a [Cryptographically secure pseudorandom number](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator) is the safest thing to use here to prove device authenticity and prevent messages from being replayed) but is included in the API in order to allow developers control over the messages that they send for testing purposes.
- **RETURNS** `Promise` _(Object)_: A `promise` that resolves with the following data or throws an [`Error`](https://nodejs.org/api/errors.html):
  - `data` _(Object)_:
    - _`$IP_ADDRESS`_ _(EmcbUDPdeviceMaster)_:  The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the discovered at the _`$IP_ADDRESS`_ key.

> **NOTE** - If there are any valid responses, the return `Promise` will resolve.  It will only reject in the event that no devices have ever been discovered.  A resolve does NOT guarantee that devices on the network have been discovered.

```javascript
EMCBs.discoverDevices()
    .then((devices) => {
        console.log("DISCOVER DEVICES COMPLETE - found " + Object.keys(devices).length + " EMCBs")

        var coloredDeviceArray = []

        for(var ipAddress in devices){
            var device = devices[ipAddress]
            coloredDeviceArray.push(chalk[device.chalkColor](device.idDevice));
        }

        console.log(coloredDeviceArray.join(chalk.reset(",")))
    })

// 3000d8c46a572cf2,3000d8c46a572d8a,3000d8c46a572d5c,3000d8c46a572af0,3000d8c46a572c34,3000d8c46a572b08,3000d8c46a572aba,3000d8c46a572b34
// **NOTE** this (and all logs from each specific device) will be colorized in terminals that support ANSI escape codes!
```

### syncDeviceSequenceNumbers()

Sends a unicast   - [setNextSequenceNumber](#setnextsequencenumberdesirednextsequencenumber) command to each [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) instance that the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) has discovered in order to sync their sequence numbers together.

> **NOTE** - this method should **NOT** be used in most applications.  Specifically if you are using the [EMCB_UDP_EVENT_QUEUE_DRAINED](#EMCB_UDP_EVENT_QUEUE_DRAINED) event for polling (which you should be using), the `emcbUDPmaster` library will automatically take care of keeping device sequence numbers in sync by monitoring for consecutive timeouts from discovered devices.

- **RETURNS** `Promise` _(Object)_: A `promise` that resolves on success or throws an [`Error`](https://nodejs.org/api/errors.html).

```javascript
EMCBs.syncDeviceSequenceNumbers()
```

### getNextSequenceNumber([nonce])

Gets the next Sequence Number and device ID's of the EMCBs on the local network using the replayable Get Next Expected UDP Sequence Number Command with a sequence number of `0x0000` to facilitate device discovery and synchronization.

- [`nonce`] _(Buffer)_:  Optional 4 byte UInt32 held within a [`Buffer`](https://nodejs.org/api/buffer.html). Defaults to `crypto.random(4)`.  **NOTE** - `nonce` should **NEVER** be provided in production code (as a [Cryptographically secure pseudorandom number](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator) is the safest thing to use here to prove device authenticity and prevent messages from being replayed) but is included in the API in order to allow developers control over the messages that they send for testing purposes.
- **RETURNS** `Promise` _(Object)_: A `promise` that resolves with the following data if there are any valid responses.  Otherwise it will throw the same data structure or an instance of an [`Error`](https://nodejs.org/api/errors.html).
  - `data` _(Object)_:
    - `responses` _(Object)_: Optional object that will contain parsed responses by IP Address for valid responses
      - _`$IP_ADDRESS`_ _(Object)_:
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
        - `nextSequenceNumber` _(Number)_:  UInt32 expected value of the Sequence Number in the next command to the device
        - `idDevice` _(String)_:  Device ID.
        - `protocolRevision` _()_: UInt32 protocol revision number.
    - `errors` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any encountered errors, excluding timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the error.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
    - `timeouts` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the timeout.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.

> **NOTE** - If there are any valid responses, the return `Promise` will resolve.  It will only reject in the event that **ALL** responses are errors or timeouts.

```javascript
EMCBs.getNextSequenceNumber()
    .then((data) => {
        //data.responses[aParticularIPAddress] = {
        //   idDevice: '3000d8c46a572b08',
        //   nextSequenceNumber: 2286175166,
        //   protocolRevision: 1,
        //   device: {...}
        //  }
    })
```

### getBreakerRemoteHandlePosition()

Gets the Remote Handle Position of the EMCB.

- **RETURNS** `Promise` _(Object)_: A `promise` that resolves with the following data if there are any valid responses.  Otherwise it will throw the same data structure or an instance of an [`Error`](https://nodejs.org/api/errors.html).
  - `data` _(Object)_:
    - `responses` _(Object)_: Optional object that will contain parsed responses by IP Address for valid responses
      - _`$IP_ADDRESS`_ _(Object)_:
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
        - `state` _(Number)_: UInt8 code representing the breaker's current Feedback State.  One of `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN`, `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED`, or `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE`.
        - `stateString` _(String)_: A human readable string representing the EMCB state.  One of `"Open"`, `"Closed"`, or `"Feedback Mismatch"`.
    - `errors` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any encountered errors, excluding timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the error.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
    - `timeouts` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the timeout.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.

> **NOTE** - If there are any valid responses, the return `Promise` will resolve.  It will only reject in the event that **ALL** responses are errors or timeouts.

```javascript
async function logFeedbackState(){
    const feedbackStates = await EMCBs.getBreakerRemoteHandlePosition()

    for(var ipAddress in feedbackStates.responses){
        var device = feedbackStates.responses[ipAddress].device
        console.log(chalk[device.chalkColor](device.idDevice + " Remote Handle Position is " + feedbackStates.responses[ipAddress].stateString))
    }
}

logFeedbackState()
// 30000c2a69113173 Remote Handle Position is Open
```

### getMeterData()

Gets the Current Metering Data for the EMCB.

> **NOTE** - this function will return the data that is transmitted over the wire.  However, the data may not be updated within the EMCB HW.  It is the responsibility of the user to check the `updateNum` to determine if the data is "stale" or not.  Alternatively, the [EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA](#EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA) Event can be used, which will only be called when the data is fresh.

- **RETURNS** `Promise` _(Object)_: A `promise` that resolves with the following data if there are any valid responses.  Otherwise it will throw the same data structure or an instance of an [`Error`](https://nodejs.org/api/errors.html).
  - `data` _(Object)_:
    - `responses` _(Object)_: Optional object that will contain parsed responses by IP Address for valid responses
      - _`$IP_ADDRESS`_ _(Object)_:
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
        - `updateNum` _(Number)_: Integer Update number. Starts at 0 on boot and increments when periodic data is updated on the device.
        - `frequency` _(Number)_: Integer Line frequency. mHz.
        - `period` _(Number)_: Integer Period. The Number of seconds over which the returned was accumulated.  // was a UInt8 in protocol version 1.07
        - `mJp0` _(Number)_: Int64 Phase 0 Cumulative active energy. milliJoules = milliWatt-Second.
        - `mVARsp0` _(Number)_: Int64 Phase 0 Cumulative reactive energy. mVARs.
        - `mVAsp0` _(Number)_: UInt64 Phase 0 Cumulative apparent energy. mVAs.
        - `LNmVp0` _(Number)_: Integer Phase 0 voltage RMS. mV.
        - `mAp0` _(Number)_: Integer Phase 0 current RMS. mA.
        - `q1mJp0` _(Number)_: UInt64 Quadrant 1 Phase 0 Cumulative Active energy. mJ.
        - `q2mJp0` _(Number)_: UInt64 Quadrant 2 Phase 0 Cumulative Active energy. mJ.
        - `q3mJp0` _(Number)_: UInt64 Quadrant 3 Phase 0 Cumulative Active energy. mJ.
        - `q4mJp0` _(Number)_: UInt64 Quadrant 4 Phase 0 Cumulative Active energy. mJ.
        - `q1mVARsp0` _(Number)_: UInt64 Quadrant 1 Phase 0 Cumulative Reactive energy. mVARs.
        - `q2mVARsp0` _(Number)_: UInt64 Quadrant 2 Phase 0 Cumulative Reactive energy. mVARs.
        - `q3mVARsp0` _(Number)_: UInt64 Quadrant 3 Phase 0 Cumulative Reactive energy. mVARs.
        - `q4mVARsp0` _(Number)_: UInt64 Quadrant 4 Phase 0 Cumulative Reactive energy. mVARs.
        - `q1mVAsp0` _(Number)_: UInt64 Quadrant 1 Phase 0 Cumulative Apparent energy. mVAs.
        - `q2mVAsp0` _(Number)_: UInt64 Quadrant 2 Phase 0 Cumulative Apparent energy. mVAs.
        - `q3mVAsp0` _(Number)_: UInt64 Quadrant 3 Phase 0 Cumulative Apparent energy. mVAs.
        - `q4mVAsp0` _(Number)_: UInt64 Quadrant 4 Phase 0 Cumulative Apparent energy. mVAs.
        - `mJp1` _(Number)_: Int64 Phase 1 Cumulative active energy. mJ.
        - `mVARsp1` _(Number)_: Int64 Phase 1 Cumulative reactive energy. mVARs.
        - `mVAsp1` _(Number)_: UInt64 Phase 1 Cumulative apparent energy. mVAs.
        - `LNmVp1` _(Number)_: Integer Phase 1 voltage RMS. mV.
        - `mAp1` _(Number)_: Integer Phase 1 current RMS. mA.
        - `q1mJp1` _(Number)_: UInt64 Quadrant 1 Phase 1 Cumulative Active energy. mJ.
        - `q2mJp1` _(Number)_: UInt64 Quadrant 2 Phase 1 Cumulative Active energy. mJ.
        - `q3mJp1` _(Number)_: UInt64 Quadrant 3 Phase 1 Cumulative Active energy. mJ.
        - `q4mJp1` _(Number)_: UInt64 Quadrant 4 Phase 1 Cumulative Active energy. mJ.
        - `q1mVARsp1` _(Number)_: UInt64 Quadrant 1 Phase 1 Cumulative Reactive energy. mVARs.
        - `q2mVARsp1` _(Number)_: UInt64 Quadrant 2 Phase 1 Cumulative Reactive energy. mVARs.
        - `q3mVARsp1` _(Number)_: UInt64 Quadrant 3 Phase 1 Cumulative Reactive energy. mVARs.
        - `q4mVARsp1` _(Number)_: UInt64 Quadrant 4 Phase 1 Cumulative Reactive energy. mVARs.
        - `q1mVAsp1` _(Number)_: UInt64 Quadrant 1 Phase 1 Cumulative Apparent energy. mVAs.
        - `q2mVAsp1` _(Number)_: UInt64 Quadrant 2 Phase 1 Cumulative Apparent energy. mVAs.
        - `q3mVAsp1` _(Number)_: UInt64 Quadrant 3 Phase 1 Cumulative Apparent energy. mVAs.
        - `q4mVAsp1` _(Number)_: UInt64 Quadrant 4 Phase 1 Cumulative Apparent energy. mVAs.
        - `LLp01mV` _(Number)_: Integer Phase-phase voltage RMS. mV.
    - `errors` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any encountered errors, excluding timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the error.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
    - `timeouts` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the timeout.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.

> **NOTE** - If there are any valid responses, the return `Promise` will resolve.  It will only reject in the event that **ALL** responses are errors or timeouts.

```javascript
async function logMeterData(){
    const meterData = await EMCBs.getMeterData()

    for(var ipAddress in meterData.responses){
        var data = meterData.responses[ipAddress]
        var device = data.device
        logger.info(chalk[device.chalkColor](`${device.idDevice}: updateNum=${data.updateNum.toString().padStart(3)}, LN-Volts-p0=${(data.LNmVp0/1000.0).toString().padEnd(7, "0")}, LN-Volts-p1=${(data.LNmVp1/1000.0).toString().padEnd(7, "0")}, Amps-p0=${(data.mAp0/1000.0).toString().padStart(7)}, Amps-p1=${(data.mAp1/1000.0).toString().padStart(7)}, Frequency-Hz=${(data.frequency/1000.0).toString().padEnd(6, "0")}`))
    }
}

logMeterData()
// 30000c2a69113173: updateNum=176, LN-Volts-p0=126.133, LN-Volts-p1=126.133, Amps-p0=  0.009, Amps-p1=  0.008, Frequency-Hz=60.030
```

### getDeviceStatus()

Gets the Current Metering Data for the EMCB.

> **NOTE** - this function will return the data that is transmitted over the wire.  However, the metering data may not be updated within the EMCB HW.  It is the responsibility of the user to check the `updateNum` to determine if the data is "stale" or not.  Alternatively, the [EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA](#EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA) Event can be used, which will only be called when the data is fresh.

- **RETURNS** `Promise` _(Object)_: A `promise` that resolves with the following data if there are any valid responses.  Otherwise it will throw the same data structure or an instance of an [`Error`](https://nodejs.org/api/errors.html).
  - `data` _(Object)_:
    - `responses` _(Object)_: Optional object that will contain parsed responses by IP Address for valid responses
      - _`$IP_ADDRESS`_ _(Object)_:
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
        - `breaker` _(Object)_:
          - `state` _(Number)_: UInt8 code representing the breaker's current Feedback State.  One of `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN`, `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED`, or `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE`.
          - `stateString` _(String)_: A human readable string representing the EMCB state.  One of `"Open"`, `"Closed"`, or `"Feedback Mismatch"`.
        - `meter` _(Object)_:
          - `updateNum` _(Number)_: Integer Update number. Starts at 0 on boot and increments when periodic data is updated on the device.
          - `frequency` _(Number)_: Integer Line frequency. mHz.
          - `period` _(Number)_: Integer Period. The Number of seconds over which the returned was accumulated.  // was a UInt8 in protocol version 1.07
          - `mJp0` _(Number)_: Int64 Phase 0 Cumulative active energy. milliJoules = milliWatt-Second.
          - `mVARsp0` _(Number)_: Int64 Phase 0 Cumulative reactive energy. mVARs.
          - `mVAsp0` _(Number)_: UInt64 Phase 0 Cumulative apparent energy. mVAs.
          - `LNmVp0` _(Number)_: Integer Phase 0 voltage RMS. mV.
          - `mAp0` _(Number)_: Integer Phase 0 current RMS. mA.
          - `q1mJp0` _(Number)_: UInt64 Quadrant 1 Phase 0 Cumulative Active energy. mJ.
          - `q2mJp0` _(Number)_: UInt64 Quadrant 2 Phase 0 Cumulative Active energy. mJ.
          - `q3mJp0` _(Number)_: UInt64 Quadrant 3 Phase 0 Cumulative Active energy. mJ.
          - `q4mJp0` _(Number)_: UInt64 Quadrant 4 Phase 0 Cumulative Active energy. mJ.
          - `q1mVARsp0` _(Number)_: UInt64 Quadrant 1 Phase 0 Cumulative Reactive energy. mVARs.
          - `q2mVARsp0` _(Number)_: UInt64 Quadrant 2 Phase 0 Cumulative Reactive energy. mVARs.
          - `q3mVARsp0` _(Number)_: UInt64 Quadrant 3 Phase 0 Cumulative Reactive energy. mVARs.
          - `q4mVARsp0` _(Number)_: UInt64 Quadrant 4 Phase 0 Cumulative Reactive energy. mVARs.
          - `q1mVAsp0` _(Number)_: UInt64 Quadrant 1 Phase 0 Cumulative Apparent energy. mVAs.
          - `q2mVAsp0` _(Number)_: UInt64 Quadrant 2 Phase 0 Cumulative Apparent energy. mVAs.
          - `q3mVAsp0` _(Number)_: UInt64 Quadrant 3 Phase 0 Cumulative Apparent energy. mVAs.
          - `q4mVAsp0` _(Number)_: UInt64 Quadrant 4 Phase 0 Cumulative Apparent energy. mVAs.
          - `mJp1` _(Number)_: Int64 Phase 1 Cumulative active energy. mJ.
          - `mVARsp1` _(Number)_: Int64 Phase 1 Cumulative reactive energy. mVARs.
          - `mVAsp1` _(Number)_: UInt64 Phase 1 Cumulative apparent energy. mVAs.
          - `LNmVp1` _(Number)_: Integer Phase 1 voltage RMS. mV.
          - `mAp1` _(Number)_: Integer Phase 1 current RMS. mA.
          - `q1mJp1` _(Number)_: UInt64 Quadrant 1 Phase 1 Cumulative Active energy. mJ.
          - `q2mJp1` _(Number)_: UInt64 Quadrant 2 Phase 1 Cumulative Active energy. mJ.
          - `q3mJp1` _(Number)_: UInt64 Quadrant 3 Phase 1 Cumulative Active energy. mJ.
          - `q4mJp1` _(Number)_: UInt64 Quadrant 4 Phase 1 Cumulative Active energy. mJ.
          - `q1mVARsp1` _(Number)_: UInt64 Quadrant 1 Phase 1 Cumulative Reactive energy. mVARs.
          - `q2mVARsp1` _(Number)_: UInt64 Quadrant 2 Phase 1 Cumulative Reactive energy. mVARs.
          - `q3mVARsp1` _(Number)_: UInt64 Quadrant 3 Phase 1 Cumulative Reactive energy. mVARs.
          - `q4mVARsp1` _(Number)_: UInt64 Quadrant 4 Phase 1 Cumulative Reactive energy. mVARs.
          - `q1mVAsp1` _(Number)_: UInt64 Quadrant 1 Phase 1 Cumulative Apparent energy. mVAs.
          - `q2mVAsp1` _(Number)_: UInt64 Quadrant 2 Phase 1 Cumulative Apparent energy. mVAs.
          - `q3mVAsp1` _(Number)_: UInt64 Quadrant 3 Phase 1 Cumulative Apparent energy. mVAs.
          - `q4mVAsp1` _(Number)_: UInt64 Quadrant 4 Phase 1 Cumulative Apparent energy. mVAs.
          - `LLp01mV` _(Number)_: Integer Phase-phase voltage RMS. mV.
    - `errors` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any encountered errors, excluding timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the error.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
    - `timeouts` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the timeout.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.

> **NOTE** - If there are any valid responses, the return `Promise` will resolve.  It will only reject in the event that **ALL** responses are errors or timeouts.

```javascript
async function logDeviceStatus(){
    const data = await EMCBs.getDeviceStatus()

    for(var ipAddress in data.responses){
        var status = data.responses[ipAddress]
        var device = status.device
        logger.info(chalk[device.chalkColor](`${device.idDevice}: Breaker State=${status.breaker.stateString}.  Meter Data: updateNum=${status.meter.updateNum.toString().padStart(3)}, LN-Volts-p0=${(status.meter.LNmVp0/1000.0).toString().padEnd(7, "0")}, LN-Volts-p1=${(status.meter.LNmVp1/1000.0).toString().padEnd(7, "0")}, Amps-p0=${(status.meter.mAp0/1000.0).toString().padStart(7)}, Amps-p1=${(status.meter.mAp1/1000.0).toString().padStart(7)}, Frequency-Hz=${(status.meter.frequency/1000.0).toString().padEnd(6, "0")}`))
    }
}

logDeviceStatus()
// 40000c2a69113173: Breaker State=Open.  Meter Data: updateNum=178, LN-Volts-p0=126.164, LN-Volts-p1=126.164, Amps-p0=   0.01, Amps-p1=  0.009, Frequency-Hz=60.030

```

### setNextSequenceNumber(desiredNextSequenceNumber)

Sets the next Sequence Number to be used by the EMCBs.  In order for this command to work, the [getNextSequenceNumber](#getnextsequencenumbernonce) must have successfully be ran for the EMCB in order for the library to know the Sequence Number that the device will currently accept.

> **NOTE** - this method should **NOT** be used in most applications.  Specifically if you are using the [EMCB_UDP_EVENT_QUEUE_DRAINED](#EMCB_UDP_EVENT_QUEUE_DRAINED) event for polling (which you should be using), the `emcbUDPmaster` library will automatically take care of keeping device sequence numbers in sync by monitoring for consecutive timeouts from discovered devices.

- `desiredNextSequenceNumber` _(Number)_:  The desired UInt32 value for the next Sequence Number between 0 and 0xFFFFFFFF.
- **RETURNS** `Promise` _(Object)_: A `promise` that resolves with the following data if **ALL** responses are valid.  Otherwise, it will throw the same data structure or an instance of an[`Error`](https://nodejs.org/api/errors.html).
  - `data` _(Object)_:
    - `responses` _(Object)_: Optional object that will contain parsed responses by IP Address for valid responses
      - _`$IP_ADDRESS`_ _(Object)_:
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
        - `ack` _(Number)_: UInt8 ACK code provided by the device.  A value of [EMCB_UDP_ACK](#EMCB_UDP_ACK) means the command was executed and the breaker confirmed it is in in desired state.  Any other value is a NACK (and is likely enumerated as an **EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_\*** Enum).
        - `ackString` _(String | undefined)_: A human readable string representing `ack` value.  One of `"Acknowledged"`, `"Rate Limited"`, `"Bad Sequence Number"`, or `undefined`.
        - `nextSequenceNumber` _(Number | undefined)_:  UInt32 expected value of the Sequence Number in the next command to the device.  This value will only be set if `ack` === [EMCB_UDP_ACK](#EMCB_UDP_ACK).
    - `errors` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any encountered errors, excluding timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the error.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
    - `timeouts` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the timeout.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.

> **NOTE** - The return `Promise` will resolve **ONLY** if all requests are successful.  It will reject if **ANY** responses are errors or timeouts.

```javascript
EMCBs.setNextSequenceNumber(crypto.randomBytes(4).readUInt32LE(0))
```

### setBreakerState(desiredState[, maxAttempts])

Sets the desired breaker state.  Will attempt to send the command successfully up to maxAttempts times (defaults to 3).

- `desiredState` _(ENUM)_:  One of the following constants: `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN`, `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED`, or `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE`
- `maxAttempts` _(Number)_: Optional maximum number of attempts to set the breaker state.  Defaults to 3 and allows values from 1-10.
- **RETURNS** `Promise` _(Object)_: A `promise` that resolves with the following data if **ALL** responses are valid.  Otherwise, it will throw the same data structure or an instance of an[`Error`](https://nodejs.org/api/errors.html).
  - `data` _(Object)_:
    - `responses` _(Object)_: Optional object that will contain parsed responses by IP Address for valid responses
      - _`$IP_ADDRESS`_ _(Object)_:
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
        - `ack` _(Number)_: UInt8 ACK code provided by the device.  A value of [EMCB_UDP_ACK](#EMCB_UDP_ACK) means the command was executed and the breaker confirmed it is in in desired state.  Any other value is a NACK.
        - `state` _(Number)_: UInt8 code representing the breaker's current Feedback State.  One of `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN`, `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED`, or `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE`.
        - `stateString` _(String)_: A human readable string representing the EMCB state.  One of `"Open"`, `"Closed"`, or `"Feedback Mismatch"`.
    - `errors` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any encountered errors, excluding timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the error.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
    - `timeouts` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the timeout.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.

> **NOTE** - The return `Promise` will resolve **ONLY** if all requests are successful.  It will reject if **ANY** responses are errors or timeouts.

```javascript
function onSuccess(data, logger = console.log){
    var responses = []
    var errors = []
    var timeouts = []

    for(var ipAddress in data.responses){
        var device = data.responses[ipAddress].device
        data.responses[ipAddress].device = device.idDevice
        responses.push(chalk[device.chalkColor](util.inspect(data.responses[ipAddress])))
    }

    for(var ipAddress in data.timeouts){
        var errorString = data.timeouts[ipAddress].message
        var device = data.timeouts[ipAddress].device
        timeouts.push(chalk[device.chalkColor](device.idDevice + " - " + errorString))
    }

    for(var ipAddress in data.errors){
        var errorString = data.errors[ipAddress].message
        var device = data.errors[ipAddress].device
        errors.push(chalk[device.chalkColor](device.idDevice + " - " + errorString))
    }


    // Sort for consistent rainbow colors!
    responses.sort()
    errors.sort()
    timeouts.sort()

    var responseStr = responses.length > 0 ? chalk.reset("\nResponses:\n") + responses.join(chalk.reset(',\n')) : ""
    var errorStr = errors.length > 0 ? chalk.reset("\nErrors:\n") + errors.join(chalk.reset(',\n')) : ""
    var timeoutStr = timeouts.length > 0 ? chalk.reset("\nTimeouts:\n") + timeouts.join(chalk.reset(',\n')) : ""

    logger(responseStr + errorStr + timeoutStr + '\n')
}

function onError(err){
    onSuccess(err, console.error)
}

//3-shot Open
EMCBs.setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN, 3).then(onSuccess).catch(onError)

// 1-shot Close
EMCBs.setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED, 1).then(onSuccess).catch(onError)

// 3-shot Toggle
EMCBs.setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE).then(onSuccess).catch(onError)

// 3-shot Open to a specific device
EMCBs.getDevice("30000c2a690c7652").setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN, 3).then(onSuccess).catch(onError)
```

### setBargraphLEDToUserDefinedColor(enabled[, colorObj, blinking])

Set the EMCB Bargraph LEDs to specific color.  This is a convenience function which leverages [setBargraphLEDToUserDefinedColor](#setbargraphledtouserdefinedcolorenabled-colorobj-blinking) under the hood.

- `enabled` _(Boolean)_:  Controls if the User Defined Color control of the bargraph is enabled.  If set to false, the Bargraph will return to normal operation and all other arguments will be ignored
- `colorObj` _(Array)_: An optional 5 element array containing the colors for each individual rgb segment of the Bargraph LEDs.  Element 0 is the LED closest to the "bump" on the EMCB.
  - `[0]` _(Object)_:
    - [`red`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`green`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`blue`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`blinking`] _(Boolean)_ An optional value to control if the LED segment should blink or not.
  - `[1]` _(Object)_:
    - [`red`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`green`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`blue`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`blinking`] _(Boolean)_ An optional value to control if the LED segment should blink or not.
  - `[2]` _(Object)_:
    - [`red`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`green`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`blue`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`blinking`] _(Boolean)_ An optional value to control if the LED segment should blink or not.
  - `[3]` _(Object)_:
    - [`red`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`green`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`blue`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`blinking`] _(Boolean)_ An optional value to control if the LED segment should blink or not.
  - `[4]` _(Object)_:
    - [`red`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`green`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`blue`] _(Number)_: An optional UInt8 value (0-255) controlling the brightness for this led.  Defaults to 0
    - [`blinking`] _(Boolean)_ An optional value to control if the LED segment should blink or not.
- `duration` _(Number)_: Optional Integer with a value of 0 (the bargraph will stay this color until unset by the UDP API) or from 1-10737418 seconds that the bargraph will stay the set color.  Defaults to 5 seconds.
- **RETURNS** `Promise` _(Object)_: A `promise` that resolves with the following data if **ALL** responses are valid.  Otherwise, it will throw the same data structure or an instance of an[`Error`](https://nodejs.org/api/errors.html).
  - `data` _(Object)_:
    - `responses` _(Object)_: Optional object that will contain parsed responses by IP Address for valid responses
      - _`$IP_ADDRESS`_ _(Object)_:
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
        - `ack` _(Number)_: UInt8 ACK code provided by the device.  A value of [EMCB_UDP_ACK](#EMCB_UDP_ACK) means the command was executed and the breaker confirmed it is in in desired state.  Any other value is a NACK.
      - `errors` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any encountered errors, excluding timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the error.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
    - `timeouts` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the timeout.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.

> **NOTE** - The return `Promise` will resolve **ONLY** if all requests are successful.  It will reject if **ANY** responses are errors or timeouts.

```javascript
var colorObj = new Array(5);
var color = {red: 0, green: 0, blue: 255, blinking: true},
colorObj.fill(color, 1, 4)

// Set the center 3 LEDs of the EMCB to blink blue until commanded differently
EMCBs.setBargraphLEDToUserDefinedColor(true, colorObj, 0)
```

### setBargraphLEDToUserDefinedColorName(colorName[, duration, blinking])

Set the EMCB Bargraph LEDs to a specific named color.  This is a convenience function which leverages [setBargraphLEDToUserDefinedColor](#setbargraphledtouserdefinedcolorenabled-colorobj-blinking) under the hood.

- `colorName` _(String)_:  The named color to set the bargraph to.  The library looks up colors using [color-name-list](https://www.npmjs.com/package/color-name-list).  additionally, it supports all valid [chalk](https://www.npmjs.com/package/chalk) colors as well as `"off"`, `"clear"`, and `"reset"` to disable the User Defined Color.
- `duration` _(Number)_: Optional Integer with a value of 0 (the bargraph will stay this color until unset by the UDP API) or from 1-10737418 seconds that the bargraph will stay the set color.  Defaults to 5 seconds.
- `blinking` _(Boolean)_: Optional value to blink the LEDs on the EMCB.
- **RETURNS** `Promise` _(Object)_: A `promise` that resolves with the following data if **ALL** responses are valid.  Otherwise, it will throw the same data structure or an instance of an[`Error`](https://nodejs.org/api/errors.html).
  - `data` _(Object)_:
    - `responses` _(Object)_: Optional object that will contain parsed responses by IP Address for valid responses
      - _`$IP_ADDRESS`_ _(Object)_:
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
        - `ack` _(Number)_: UInt8 ACK code provided by the device.  A value of [EMCB_UDP_ACK](#EMCB_UDP_ACK) means the command was executed and the breaker confirmed it is in in desired state.  Any other value is a NACK.
      - `errors` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any encountered errors, excluding timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the error.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.
    - `timeouts` _(Object)_: Optional object that will contain [`Error`](https://nodejs.org/api/errors.html) objects decorated with an additional `device` property, which is the relevant [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster), by IP Address for any timeouts
      - _`$IP_ADDRESS`_ _(Error)_:  An [`Error`](https://nodejs.org/api/errors.html) object describing the timeout.
        - `device` _(EmcbUDPdeviceMaster)_: The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) for the response.

> **NOTE** - The return `Promise` will resolve **ONLY** if all requests are successful.  It will reject if **ANY** responses are errors or timeouts.

```javascript
for(var ipAddress in EMCBs.devices){
    var device = EMCBs.devices[ipAddress]

    // Blink the EMCB bargraph to the same color as what we are logging for 10 seconds!
    device.setBargraphLEDToUserDefinedColorName(device.chalkColor, 10, true)
}
```

## EmcbUDPdeviceMaster

The [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) exposes the same functionality as the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster), but unicasts each command to a specific device/IP address rather than using the [EMCB_UDP_BROADCAST_ADDRESS](#EMCB_UDP_BROADCAST_ADDRESS).  In addition to the commands listed below, [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) also extends the [EventEmitter](https://nodejs.org/api/events.html) class and makes the events described in [EventEmitter Cheat Sheet](#eventemitter-cheat-sheet) available to `.on()`, `.once()`, etc.

Instances of this class are created and managed by the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) (rather than being created directly) as a part of the [Device Discovery](#discoverdevicesnonce) process (and more accurately during [getNextSequenceNumber](#getnextsequencenumbernonce) responses).  The instances can be obtained using the [getDevice](#getDeviceipaddressoriddevice) function or by accessing the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster).`devices` property directly by the device's `IP Address`.

The following commands from the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) are **NOT** available in [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) instances:

- [updateBroadcastUDPkey(key)](#updatebroadcastudpkeykey)
- [updateUnicastUDPkey(key)](#updateunicastudpkeyiddevice-key)
- [getDevice(ipAddressOrIdDevice)](#getDeviceipaddressoriddevice)
- [discoverDevices(nonce)](#discoverdevicesnonce)
- [syncDeviceSequenceNumbers](#syncdevicesequencenumbers)

These commands are identical to the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster), except that they unicast the command to the specific `idDevice` ipAddress instead of broadcasting on the broadcast address

- [getNextSequenceNumber([nonce])](#getnextsequencenumbernonce)
- [getBreakerRemoteHandlePosition()](#getbreakerremotehandleposition)
- [getMeterData()](#getmeterdata)
- [getDeviceStatus()](#getDeviceStatus)
- [setNextSequenceNumber(desiredNextSequenceNumber)](#setnextsequencenumberdesirednextsequencenumber)
- [setBreakerState(desiredState[, maxAttempts])](#setbreakerstatedesiredstate-maxattempts)
- [setBargraphLEDToUserDefinedColor(enabled[, colorObj, blinking])](#setbargraphledtouserdefinedcolorenabled-colorobj-blinking)
- [setBargraphLEDToUserDefinedColorName(colorName[, duration, blinking])](#setbargraphledtouserdefinedcolornamecolorname-duration-blinking)

### EmcbUDPdeviceMaster Properties

In addition to the functions listed above, an [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) has 4 additional properties that are **NOT** available in [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) instances:

- `chalkColor` _(string)_: This is a color assigned to the device from the [EMCB_UDP_DEVICE_COLORS](#EMCB_UDP_DEVICE_COLORS) array during [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) instantiation.  It can be used with [chalk](https://www.npmjs.com/package/chalk) to help colorize logs.
- `idDevice` _(string)_: Device ID of the device
- `remoteHandlePosition` _(Number)_: UInt8 code representing the breaker's current Feedback State.  One of `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN`, `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED`, or `EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE`.
- `meterData` _(object)_: The latest meter data that has been obtained from the device.  Identical to the return `data.responses[$IP_ADDRESS]` in [getMeterData](#getmeterdata).

## EventEmitter Cheat Sheet

Both [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) and [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) extend the [EventEmitter](https://nodejs.org/api/events.html) class.  The following code will register for every event and provides some commentary for the circumstances under which events get called.

```js
// Called whenever there is a response to a GET_NEXT_SEQUENCE_NUMBER command
EMCBs.on(EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER, data => {
    logger.info(chalk[data.device.chalkColor](`Sequence Number updated to 0x${data.nextSequenceNumber.toString(16).toUpperCase()} = ${data.nextSequenceNumber}`))
})

// Called whenever there is a response to a GET_DEVICE_STATUS command that contains fresh data
EMCBs.on(EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS, data => {
    logger.info(chalk[data.device.chalkColor](`Received GET_DEVICE_STATUS response from ${data.device.ipAddress} with Device ID ${data.device.idDevice}`))
})

// Called whenever there is a response to a GET_DEVICE_DEBUG_DATA command
EMCBs.on(EMCB_UDP_MESSAGE_CODE_GET_DEVICE_DEBUG_DATA, data => {
    var device = data.device;
    delete data.device;
    logger.info(chalk[device.chalkColor](`Received GET_DEVICE_DEBUG_DATA response from ${device.ipAddress} with Device ID ${device.idDevice}. Data = ${util.inspect(data, {breakLength: Infinity})}`))
})

// Called whenever the breaker feedback position changes - could be from a GET_BREAKER_REMOTE_HANDLE_POSITION, GET_DEVICE_STATUS, or SET_BREAKER_REMOTE_HANDLE_POSITION command)
EMCBs.on(EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION, function(data){
    logger.info(chalk[data.device.chalkColor](`Breaker Feedback Position changed from ${data.lastState} to ${data.state}`))
})

// Called whenever there is new EMCB Meter data (as detected by seeing an update to updateNum) - could be GET_DEVICE_STATUS or GET_METER_TELEMETRY_DATA
EMCBs.on(EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA, function(data){
    if(data.updateNum%5 === 0){
        logger.info(chalk[data.device.chalkColor](`${data.device.idDevice}: updateNum=${data.updateNum.toString().padStart(3)}, LN-Volts-p0=${(data.LNmVp0/1000.0).toString().padEnd(7, "0")}, LN-Volts-p1=${(data.LNmVp1/1000.0).toString().padEnd(7, "0")}, Amps-p0=${(data.mAp0/1000.0).toString().padStart(7)}, Amps-p1=${(data.mAp1/1000.0).toString().padStart(7)}, Frequency-Hz=${(data.frequency/1000.0).toString().padEnd(6, "0")}`))
    }
})

// Listening to an individual device instead of ALL devices works just fine too :)
// EMCBs.getDevice("10.130.116.50").on(EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA, function(meterData){
//     console.log(meterData)
// })

// Called for every successful SET_NEXT_SEQUENCE_NUMBER command
EMCBs.on(EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER, data => {
    logger.info(chalk[data.device.chalkColor](`SET_NEXT_SEQUENCE_NUMBER response "${data.ackString}" from ${data.device.ipAddress} with Device ID ${data.device.idDevice}.${data.ack === EMCB_UDP_ACK ? ` Sequence Number updated to 0x${data.nextSequenceNumber.toString(16).toUpperCase()} = ${data.nextSequenceNumber}` : ""}`))
})

// Called for every successful SET_BREAKER_REMOTE_HANDLE_POSITION command
EMCBs.on(EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION, data => {
    logger.info(chalk[data.device.chalkColor](`SET_BREAKER_REMOTE_HANDLE_POSITION command succeeded!`))
})

// Called for every successful SET_BARGRAPH_LED_TO_USER_DEFINED
EMCBs.on(EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED, data => {
    logger.info(chalk[data.device.chalkColor](`SET_BREAKER_REMOTE_HANDLE_POSITION command succeeded!`))
})

// Called every time a device is discovered on the local network
EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, data => {
    logger.info(chalk[data.device.chalkColor](`Discovered EMCB ${data.device.idDevice} at ${data.device.ipAddress}!`))
})

// Called after 100 consecutive timeouts and multiple resync attempts with a particular device as we remove it from the list of devices currently "discovered" and available within the EmcbUDPbroadcastMaster
EMCBs.on(EMCB_UDP_EVENT_DEVICE_REMOVED, data => {
    logger.warn(chalk[data.device.chalkColor](`Removing EMCB at ${data.device.ipAddress} with with Device ID ${data.device.idDevice}...  Too many consecutive timeouts/errors.`))
})

// Called whenever a device IP address change is detected
EMCBs.on(EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED, data => {
    logger.info(chalk[data.device.chalkColor](`Device ID ${data.device.idDevice} moved from ${data.oldIPaddress} to ${data.newIPaddress}`))
})

// Called whenever there is a device timeout
EMCBs.on(EMCB_UDP_ERROR_TIMEOUT, data => {
    logger.warn(chalk[data.device.chalkColor](data.message))
})

// Called whenever there is a parser error - which can include a nack from the device, invalid number of bytes, etc.
EMCBs.on(EMCB_UDP_ERROR_PARSER, data => {
    logger.warn(chalk[data.device.chalkColor]("Parser Error - " + data.message))
})

// Whenever the message queue is drained, poll the devices' status as quickly as possible, in order to cause our events listeners above to fire!
EMCBs.on(EMCB_UDP_EVENT_QUEUE_DRAINED, () => {
    EMCBs.getDeviceStatus()
})

EMCBs.discoverDevices()
    .then((devices) => {
        console.log("DISCOVER DEVICES COMPLETE - found " + Object.keys(devices).length + " EMCBs")
    });
```

## logger
- [Class: logger](#logger)
`logger` exposes a pre-configured [winston@3](https://github.com/winstonjs/winston) logger.  It also overrides `console.log`, etc. so that all logs are captured by [winston](https://github.com/winstonjs/winston).

These logs are written to both the console and to `./logs/` whenever the `emcbUDPmaster` is used to aid in debugging/understanding.

> **NOTE** - Because the written files will contain colorized output via ANSI Escape codes, command line tools such as `cat` or [SumblimeANSI](https://github.com/aziz/SublimeANSI) are **very** useful in viewing the logs.

## Constants

The following constants are exported by the module and available for application use and described below.

```javascript
const {

    // Network Configuration
    EMCB_UDP_BROADCAST_ADDRESS,
    EMCB_UDP_PORT,

    // Application Layer Constraints
    EMCB_UDP_IMPLEMENTED_PROTOCOL_VERSION,
    EMCB_UDP_MESSAGE_THROTTLE_TIME_MS,
    EMCB_UDP_LONGEST_IMPLEMENTED_MESSAGE_LENGTH,

    // Application Layer Header Constants
    EMCB_UDP_HEADER_START_MASTER,
    EMCB_UDP_HEADER_START_SLAVE,

    // Application Layer GET Message Codes
    EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER,
    EMCB_UDP_MESSAGE_CODE_GET_DEVICE_DEBUG_DATA,
    EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS,
    EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION,
    EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA,

    // Application Layer SET Message Codes
    EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER,
    EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION,
    EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED,

    // Application Layer Integer Message Codes to strings
    EMCB_UDP_MESSAGE_CODES,

    // Enums / Parsed Data Constants
    EMCB_UDP_ACK,

    EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_RATE_LIMITED,
    EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_BAD_SEQUENCE_NUMBER,

    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_FEEDBACK_MISMATCH,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE,

    // Errors
    EMCB_UDP_ERROR_TIMEOUT,
    EMCB_UDP_ERROR_PARSER,
    EMCB_UDP_ERROR_INVALID_DATA_LENGTH,

    // EventEmitter Events
    EMCB_UDP_EVENT_QUEUE_DRAINED,
    EMCB_UDP_EVENT_DEVICE_DISCOVERED,
    EMCB_UDP_EVENT_DEVICE_REMOVED,
    EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED,


    // Others
    EMCB_UDP_DEVICE_COLORS

} = require('emcbUDPmaster');
```

### Network Configuration

#### EMCB_UDP_BROADCAST_ADDRESS

The broadcast IP address on the local network that will be used by [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster).

#### EMCB_UDP_PORT

The destination UDP port number that will be used by default by [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) and all created [`EmcbUDPdeviceMaster`](#emcbudpdevicemaster) instances.  This value is 32866 (or "EATON" on a phone keypad)

### EMCB UDP Application Layer

#### EMCB_UDP_IMPLEMENTED_PROTOCOL_VERSION

The version of the **EMCB UDP API** Application Protocol that is implemented by the class and used to check against [getNextSequenceNumber()](#getnextsequencenumbernonce) responses to verify compatibility.

#### EMCB_UDP_MESSAGE_THROTTLE_TIME_MS

The fastest rate that messages will be sent over the local network in milliseconds.

#### EMCB_UDP_LONGEST_IMPLEMENTED_MESSAGE_LENGTH

The longest implemented message response supported by the class (to reduce processing time / buffer overruns in fuzz testing).

### EMCB UDP Application Layer Header

#### EMCB_UDP_HEADER_START_MASTER

Start Byte of all Master->Slave requests

#### EMCB_UDP_HEADER_START_SLAVE

Start Byte of all Slave->Master responses

### Message Codes

### GET Message Codes

#### EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER

The integer message code for the GET_NEXT_SEQUENCE_NUMBER command.  This constant will also be emitted by the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) and [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) whenever a response to the command is successfully parsed.

#### EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS

The integer message code for the GET_DEVICE_STATUS command.  This constant will also be emitted by the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) and [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) whenever a response to the command is successfully parsed.

#### EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION

The integer message code for the GET_BREAKER_REMOTE_HANDLE_POSITION command.  This constant will also be emitted by the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) and [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) whenever a response to the command is successfully parsed.

#### EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA

The integer message code for the GET_METER_TELEMETRY_DATA command.  This constant will also be emitted by the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) and [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) whenever a response to the command is successfully parsed.

### SET Message Codes

#### EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER

The integer message code for the SET_NEXT_SEQUENCE_NUMBER command.  This constant will also be emitted by the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) and [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) whenever a response to the command is successfully parsed.

#### EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION

The integer message code for the SET_BREAKER_REMOTE_HANDLE_POSITION command.  This constant will also be emitted by the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) and [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) whenever a response to the command is successfully parsed.

#### EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED

The integer message code for the SET_BARGRAPH_LED_TO_USER_DEFINED command.  This constant will also be emitted by the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) and [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) whenever a response to the command is successfully parsed.

#### EMCB_UDP_MESSAGE_CODES

A lookup table to convert the integer message codes back to human readable strings.

```javascript
console.log(EMCB_UDP_MESSAGE_CODES[EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED])
// $ SET_BARGRAPH_LED_TO_USER_DEFINED
```

### Enums and Parsed Data

#### EMCB_UDP_ACK

A response value defined in the EMCB UDP API to signify that the command was successfully acknowledged and performed by the device.

#### EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_RATE_LIMITED

A response value defined in the EMCB UDP API to signify that the [`setNextSequenceNumber`](#setnextsequencenumberdesirednextsequencenumber) command was rate limited and therefore not executed.

#### EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_BAD_SEQUENCE_NUMBER

A response value defined in the EMCB UDP API to signify that the [`setNextSequenceNumber`](#setnextsequencenumberdesirednextsequencenumber)  command was not executed due to an invalid `desiredSequenceNumber`

#### EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN

A response/command value defined in the EMCB UDP API to signify that the EMCB remote handle is/should be in the open position

#### EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED

A response/command value defined in the EMCB UDP API to signify that the EMCB remote handle is/should be in the closed position

#### EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_FEEDBACK_MISMATCH

A response value defined in the EMCB UDP API to signify that the EMCB remote handle feedback is mismatched on a 2-pole breaker (i.e. one pole is open and the other is closed).

#### EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE

A command value defined in the EMCB UDP API to signify that the EMCB remote handle should toggle from its current state

### Events

In addtion to the [GET](#get-message-codes) and [SET](#set-message-codes) Message codes, the following events will be emitted by [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) instances:

#### EMCB_UDP_EVENT_QUEUE_DRAINED

Emitted whenever the message queue for the broadcast master is empty and the application should execute additional regular polling commands

```javascript
 EMCBs.on(EMCB_UDP_EVENT_QUEUE_DRAINED, () => {
    EMCBs.getDeviceStatus()
 }
```

#### EMCB_UDP_EVENT_DEVICE_DISCOVERED

Emitted whenever a new EMCB is discovered as a part of a [getNextSequenceNumber](#getnextsequencenumbernonce) or [discoverDevices()](#discoverdevicesnonce) command

#### EMCB_UDP_EVENT_DEVICE_REMOVED

Emitted whenever an EMCB is removed from the [`EmcbUDPbroadcastMaster`](#emcbudpbroadcastmaster) instance's list of devices, due to excessive consecutive timeouts.

#### EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED

Emitted whenever an EMCB device's IP address changes.

### Errors

The following error constants are used by the application.  Additional [node.js Errors](https://nodejs.org/api/errors.html) are thrown / returned as appropriate.

#### EMCB_UDP_ERROR_TIMEOUT

This error will be emitted and returned in the rejected promise whenever a device experiences a timeout.

#### EMCB_UDP_EVENT_PARSER_ERROR

This error will be emitted and returned in the rejected promise whenever a response parser throws an error (wrong number of bytes, nack from the device, etc.)

#### EMCB_UDP_ERROR_INVALID_DATA_LENGTH

This error will be returned in the rejected promise whenever a parser detects an invalid response length.

### Others

#### EMCB_UDP_DEVICE_COLORS

This is an array of [chalk](https://www.npmjs.com/package/chalk) colors to aid in logging/debugging of the application.
