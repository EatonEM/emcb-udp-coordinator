# Examples

These examples are provided to demonstrate how to use the EMLCP Node.JS SDK.

------------

## Configure the Examples

All of the examples use [Examples/_config.js](./_config.js) to import the
required UDP Keys for interacting with the devices.  Create a
[_config.js](./_config.js) and edit it with your devices' keys setup using the
[EM Partner API](https://api.em.eaton.com/docs#section/EM-API-Overview/Understanding-Local-Communications).

```javascript
// NOTE: All of our UDP Keys, stored as base64-encoded strings. These will be converted to Buffers before use in our application. 
var keyEncoding = "base64";
var UDPKeys = {
    "broadcast": "3UJT2HJaAqDB+jQX2Alob+OXzIFI7/UyjOQ2ZEhJoiU=",
    "unicast": {
        "30000c2a690c7652" : "AcQ6ON9WafPUEGAkN+wu89rrEq7Tx+s/oZLVgdKrnyA=",
        "30000c2a69112b6f" : "nz1BBgJDfsLv3UJT2HEq7Tx+s/rjQX2Alob+OXzIFI4="
    }
}

// Alternatively, use keys as 32 character hex strings.  
// var keyEncoding = "hex";
// var UDPKeys = {
//     "broadcast": "DD4253D8725A02A0C1FA3417D809686FE397CC8148EFF5328CE436644849A225",
//     "unicast": {
//         "30000c2a690c7652" : "01C43A38DF5669F3D410602437EC2EF3DAEB12AED3C7EB3FA192D581D2AB9F20",
//         "30000c2a69112b6f" : "9F3D410602437EC2EFDD4253D8712AED3C7EB3FAE3417D809686FE397CC8148E"
//     }
// }

// Convert to buffers
UDPKeys.broadcast = Buffer.from(UDPKeys.broadcast, keyEncoding)

for(var k in UDPKeys.unicast){
    UDPKeys.unicast[k] = Buffer.from(UDPKeys.unicast[k], keyEncoding)
}

module.exports = UDPKeys;
```

### Command Line Interface Examples

Examples in the [cli](./cli) folder, use a command line interface to interact
with users and log/collect data.  These examples are described below:

#### discoverAndControl.js

[discoverAndControl](./cli/discoverAndControl.js) is a minimalistic command line
tool to:

- discover EM Node(s) on the local network using the provisioned UDP keys in
  [_config.js](./_config.js)
- identify them by turning their Bargraph LEDs to match the color that they are
  being logged by the terminal for 10 seconds (using
  [chalk](https://www.npmjs.com/package/chalk))
- and instruct them to `open`, `close`, or `toggle` (defaulting to `toggle` if
  no command is given)

```bash
# Clean up log files from an previous runs of the tool
rm logs/*.txt; rm logs/*.csv;

# Run the script to toggle all discovered devices
node ./Examples/cli/discoverAndControl.js
# or
node ./Examples/cli/discoverAndControl.js toggle

# Run the script to open all discovered devices
node ./Examples/cli/discoverAndControl.js open

# Run the script to close all discovered devices
node ./Examples/cli/discoverAndControl.js close

# Example Output of a toggle command:
#[+ 982.734ms]info: DISCOVER DEVICES COMPLETE - found 1 EMCBs
#[+   3.268ms]info: 30000c2a690e1a62
#[+ 306.761ms]info: Toggled all breakers successfully!
#[+   2.050ms]info: { responses:
#   { '10.130.116.108':
#      { ack: 0,
#        state: 0,
#        stateString: 'Open',
#        device: [EmcbUDPdeviceMaster] } } }
```

#### discoverAndInteractiveControl.js

[discoverAndInteractiveControl](./cli/discoverAndInteractiveControl.js) extends
[discoverAndControl](./cli/discoverAndControl.js) to include a keyboard
interface for user input.  It will:

- discover EM Node(s) on the local network using the provisioned UDP keys in
  [_config.js](./_config.js)
- identify them by turning their Bargraph LEDs to match the color that they are
  being logged by the terminal for 10 seconds (using
  [chalk](https://www.npmjs.com/package/chalk))
- and log a set of keyboard inputs that can be used on the focused terminal to
  send various commands

```bash
# Clean up log files from an previous runs of the tool and start the script
rm logs/*.txt; rm logs/*.csv; node ./Examples/cli/discoverAndInteractiveControl.js

#[+  66.963ms]info: Broadcast Address == 10.130.135.255
#[+1032.041ms]info: DISCOVER DEVICES COMPLETE - found 8 EMCBs
#[+  20.053ms]info: 3000d8c46a572d5c,3000d8c46a572aba,3000d8c46a572cf2,3000d8c46a572af0,3000d8c46a572b34,3000d8c46a572c34,3000d8c46a572d8a,3000d8c46a572b08
#[+   8.430ms]info: Press "ctrl+c" to exit...
#[+   0.158ms]info: Press "o" to open all EMCBs, "c" to close, or "t" to toggle.
#[+   1.431ms]info: Press "r" to cycle the bargraph LEDs on all breakers through the rainbow.
#[+   0.120ms]info: Press "d" to Discover Devices and match their bargraph LEDs to the logged colors.
#[+   0.160ms]info: Press "i" to identify individual Devices (log their ID's and shine their bargraph color to match terminal for 10 seconds).
#[+   0.216ms]info: Press "s" to Get Device Status (Breaker Feedback and Metering).
#[+   0.138ms]info: Press "f" to Get Breaker Feedback Status.
#[+   0.153ms]info: Press "m" to Get Meter Data.
```

Combined with `tail logs/logs.txt -f`, this is a very powerful tool to
familiarize developers with the [EM Local Communications
Protocol](https://api.em.eaton.com/docs/emlcp.html) and binary protocol.

> **NOTE** - This tool is great for debugging, but it does NOT implement
> `.on(`[EMCB_UDP_EVENT_QUEUE_DRAINED](./../docs/api.md#EMCB_UDP_EVENT_QUEUE_DRAINED)`)`
> [EventEmitter](https://nodejs.org/api/events.html) callback for polling and
> should therefore **NOT** be used as a reference for a production application.

#### discoverAndLogData.js

[discoverAndLogData](./cli/discoverAndLogData.js) is another "one shot" tool for
discovering and logging device status data.  It shows some different [ECMAScript
6](https://www.w3schools.com/js/js_es6.asp) syntax and functionality than the
previous examples.  The example does the following:

- discover EM Node(s) on the local network using the provisioned UDP keys in
  [_config.js](./_config.js)
- identify them by turning their Bargraph LEDs to match the color that they are
  being logged by the terminal for 10 seconds (using
  [chalk](https://www.npmjs.com/package/chalk))
- Log the [`getDeviceStatus`](./../docs/api.md#getdevicestatus) command, which
  includes both breaker feedback status and the current metering values

```bash
# Clean up log files from an previous runs of the tool and start the script
rm logs/*.txt; rm logs/*.csv; node ./Examples/cli/discoverAndLogData.js

#[+1156.303ms]info: DISCOVER DEVICES COMPLETE - found 1 EMCBs
#[+   3.773ms]info: 30000c2a690e2ee2
#[+ 212.913ms]info: 30000c2a690e2ee2: Breaker State=Closed.  Meter Data: updateNum= 71, LN-Volts-p0=121.800, LN-Volts-p1=0000000, Amps-p0=  0.008, Amps-p1=  0.008, Frequency-Hz=60.015
```

#### writeDeviceDataToCSV.js

[writeDeviceDataToCSV](./cli/writeDeviceDataToCSV.js) is the most feature rich
example application, serving as a complete data logger for EM Node(s). This
application is suitable for longer term testing and analysis and does the
following:

- discover EM Node(s) on the local network using the provisioned UDP keys in
  [_config.js](./_config.js)
- identify them by turning their Bargraph LEDs to match the color that they are
  being logged by the terminal for 10 seconds (using
  [chalk](https://www.npmjs.com/package/chalk))
- Logs most of the interesting EM Node events described in the [EventEmitter Cheat
  Sheet](./../docs/api.md#eventemitter-cheat-sheet)
- Begins polling the [`getDeviceStatus`](./../docs/api.md#getdevicestatus) as
  aggressively as possible by using the
  `.on(`[EMCB_UDP_EVENT_QUEUE_DRAINED](./../docs/api.md#EMCB_UDP_EVENT_QUEUE_DRAINED)`)`
  [EventEmitter](https://nodejs.org/api/events.html)
- Writes all of the collected data to individual `.csv` files in `./logs`
- Toggles the EM Node(s) every 10 seconds

```bash
# Clean up log files from an previous runs of the tool and start the script
rm logs/*.txt; rm logs/*.csv; node ./Examples/cli/writeDeviceDataToCSV.js

# These logs are MUCH more useful when they are properly colorized!
# [+  81.257ms]info: Broadcast Address == 10.130.116.255
# [+   2.213ms]info: Sequence Number updated to 0xDD2DD801 = 3710769153
# [+ 177.519ms]info: Discovered EMCB 30000c2a690e2ee2 at 10.130.116.110!
# [+   0.274ms]info: SET_NEXT_SEQUENCE_NUMBER response "Acknowledged" from 10.130.116.110 with Device ID 30000c2a690e2ee2. Sequence Number updated to 0xB7B3E62D = 3082020397
# [+ 393.252ms]warn: TIMEOUT for GET_NEXT_SEQUENCE_NUMBER
# [+ 203.865ms]warn: TIMEOUT for GET_NEXT_SEQUENCE_NUMBER
# [+  10.473ms]info: Breaker Feedback Position changed from undefined to 1
# [+   0.360ms]info: Received GET_DEVICE_STATUS response from 10.130.116.110 with Device ID 30000c2a690e2ee2
# [+ 389.805ms]warn: TIMEOUT for GET_NEXT_SEQUENCE_NUMBER
# [+   1.304ms]info: DISCOVER DEVICES COMPLETE - found 1 EMCBs
# [+   8.551ms]info: 30000c2a690e2ee2
# [+  43.160ms]info: SET_BREAKER_REMOTE_HANDLE_POSITION command succeeded!
# [+ 169.378ms]info: Received GET_DEVICE_STATUS response from 10.130.116.110 with Device ID 30000c2a690e2ee2
# [+ 471.746ms]info: 30000c2a690e2ee2: updateNum=150, LN-Volts-p0=121.333, LN-Volts-p1=0000000, Amps-p0=  0.005, Amps-p1=  0.008, Frequency-Hz=600000
# [+   0.184ms]info: Received GET_DEVICE_STATUS response from 10.130.116.110 with Device ID 30000c2a690e2ee2
# [+ 316.607ms]info: Toggling Devices!
# [+ 109.381ms]info: Breaker Feedback Position changed from 1 to 0
# [+   0.255ms]info: SET_BREAKER_REMOTE_HANDLE_POSITION command succeeded!
#[+ 569.365ms]info: Received GET_DEVICE_STATUS response from 10.130.116.110 with Device ID 30000c2a690e2ee2
```
