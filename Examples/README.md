# Examples

These examples are provided to demonstrate how to use the `emcb-udp-master` module.

> **NOTE** - The UDP API of the EMCB is currently in Beta.  To use this module and these examples, you must have an EMCB that has been enrolled in the UDP API Beta on the same Local Area Network as the machine you are running the scripts on.  For more information, contact Eaton.

------------

## Configure the Examples

All of the examples use [Examples/_config.js](./_config.js) to import the required UDP Keys for interacting with the devices.  Create a [_config.js](./_config.js) and edit it with your devices' keys setup using the [EMCB Cloud API](portal.developer.eatonem.com).

```javascript
// All of our UDP Keys, stored as 32 character hex strings.  These will be converted to Buffers before use in our application
var UDPKeys = {
    "broadcast": "3UJT2HJaAqDB+jQX2Alob+OXzIFI7/UyjOQ2ZEhJoiU=",
    "unicast": {
        "30000c2a690c7652" : "AcQ6ON9WafPUEGAkN+wu89rrEq7Tx+s/oZLVgdKrnyA=",
        "30000c2a69112b6f" : "nz1BBgJDfsLv3UJT2HEq7Tx+s/rjQX2Alob+OXzIFI4="
    }
}

const keyEncoding = "base64"
// Convert from Hex strings to buffers
UDPKeys.broadcast = Buffer.from(UDPKeys.broadcast, keyEncoding)

for(var k in UDPKeys.unicast){
    UDPKeys.unicast[k] = Buffer.from(UDPKeys.unicast[k], keyEncoding)
}

module.exports = UDPKeys
```

## Building the Main Branch Firmware for UDP support

UDP support adds a ton of code to the firmware.  If you don't have a build already that is being targeted the following steps will show you how to trim down the code base enough so it will fit.  The following example is based upon the Master Branch in the eatonem repository.  Read the README.md in the [EM Device Firmware README](./em-device-firmware/README.md).

Configuring the project file:
In the project file for the device group that contains the target for the UDP communications, you will add the following builder variable to the list:

```Squirrel
            "builder": {
                "variables": {
                    "UDP": true
                    ...
                }
            }
```

em-device-firmware/src/Implementation/UDP/udpSlave.device.nut modifications:
There are 2 sections to uncomment. To activate the Broadcast and Unicast keys you will need to uncomment the lines below.  Also you will need to ensure that your key matches the key for the key type.  To format base64 key properly this website will give it in hex codes [Base64-to-Hex] (<https://cryptii.com/pipes/base64-to-hex>).

```c
// ::g_udpSlave.updateUDPKey(
//     UDP_KEY.BROADCAST_PRIMARY,
//     "\xDD\x42\x53\xD8\x72\x5A\x02\xA0\xC1\xFA\x34\x17\xD8\x09\x68\x6F\xE3\x97\xCC\x81\x48\xEF\xF5\x32\x8C\xE4\x36\x64\x48\x49\xA2\x25",
//     5184000 // 60 days
// )
// g_udpSlave.updateUDPKey(
//     UDP_KEY.UNICAST_PRIMARY,
//     "\x05\xc4\x3a\x38\xdf\x56\x69\xf3\xd4\x10\x60\x24\x37\xec\x2e\xf3\xda\xeb\x12\xae\xd3\xc7\xeb\x3f\xa1\x92\xd5\x81\xd2\xab\x9f\x20",
//     5184000
//     )
```

em-device-firmware/src/device.nut modifications:
In the main branch at the time of this README.md writing there are several items you will need to comment out to save enough space to build the UDP code.  the following is a list of lines to comment out.

```C
// @if HW_TARGET == "EMCB"
// @include once "lib/LIS3DH/LIS3DH.lite.singleton.nut"
// @include once "lib/TMP1x2/TMP1x2.lite.singleton.nut"
// @end

...

// Configure the g_TempSensor Sensor
// g_TempSensor <- TMP1x2.init(PORT_I2C, ADDRESS_TMP102);
// g_Accelerometer <- LIS3DH.init(PORT_I2C, ADDRESS_LIS3DH);

// // Configure accelerometer
// g_Accelerometer.setDataRate(100);
// g_Accelerometer.configureInterruptLatching(true);

// //TODO: we are not currently using any of the accelerometer interrupts - we really should be monitoring for things like excessive vibration and sending events based on that.
// // Set up a free-fall interrupt
// g_Accelerometer.configureFreeFallInterrupt(true);

// // Set up a double-click interrupt
// g_Accelerometer.configureClickInterrupt(true, LIS3DH_DOUBLE_CLICK);

// function accelInterruptHandler() {
//     if (PIN_DI_IRQ_ACCEL.read() == 0) return;

//     // Get + clear the interrupt + clear
//     local data = g_Accelerometer.getInterruptTable();

//     // Check what kind of interrupt it was
//     if (data.int1) {
//         server.log("Free Fall");
//     }

//     if (data.doubleClick) {
//         // Flash white twice - each blink is on for 1 second, off for 0.5 seconds.
//         g_Bargraph.fill(RGB_WHITE, 0, null, true, BARGRAPH_PRIORITY.ACCELEROMETER).draw()
//         imp.wakeup(1.5 function(){ g_Bargraph.deleteLayer(BARGRAPH_PRIORITY.ACCELEROMETER)})
//     }

//   //TODO: Add accelerometer dynamic data
// }

// PIN_DI_IRQ_ACCEL.configure(DIGITAL_IN, accelInterruptHandler);

...

//@include once "src/Functions/Meter/BreakerHandlePosition.nut"

...

    //determineBreakerMainHandlePosition(data);

...

// @include "src/Implementation/DataManager/telemetry/registerAccelerometerTelemetryData.device.nut"
// @include "src/Implementation/DataManager/telemetry/registerThermometerTelemetryData.emcb.device.nut"

```

When you deploy the firmware to your development group look for the following information in the log:

2021-01-19T23:43:41.644 +00:00  [Status]    Agent restarted: reload.

2021-01-19T23:43:42.095 +00:00  [Status]    Downloading new code; **99.98% program storage used**

## Command Line Interface Examples

Examples in the [cli](./cli) folder, use a command line interface to interact with users and log/collect data.  These examples are described below:

### discoverAndControl.js

[discoverAndControl](./cli/discoverAndControl.js) is a minimalistic command line tool to:

- discover EMCB's on the local network using the provisioned UDP keys in [_config.js](./_config.js)
- identify them by turning their Bargraph LEDs to match the color that they are being logged by the terminal for 10 seconds (using [chalk](https://www.npmjs.com/package/chalk))
- and instruct them to `open`, `close`, or `toggle` (defaulting to `toggle` if no command is given)

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

### discoverAndInteractiveControl.js

[discoverAndInteractiveControl](./cli/discoverAndInteractiveControl.js) extends [discoverAndControl](./cli/discoverAndControl.js) to include a keyboard interface for user input.  It will:

- discover EMCB's on the local network using the provisioned UDP keys in [_config.js](./_config.js)
- identify them by turning their Bargraph LEDs to match the color that they are being logged by the terminal for 10 seconds (using [chalk](https://www.npmjs.com/package/chalk))
- and log a set of keyboard inputs that can be used on the focused terminal to send various commands

```bash
# Clean up log files from an previous runs of the tool and start the script
rm logs/*.txt; rm logs/*.csv; node ./Examples/cli/discoverAndInteractiveControl.js

#[+  66.963ms]info: Broadcast Address == 10.130.135.255
#[+1032.041ms]info: DISCOVER DEVICES COMPLETE - found 8 EMCBs
#[+  20.053ms]info: 3000d8c46a572d5c,3000d8c46a572aba,3000d8c46a572cf2,3000d8c46a572af0,3000d8c46a572b34,3000d8c46a572c34,3000d8c46a572d8a,3000d8c46a572b08
#[+   5.516ms]info: Press "ctrl+c" to exit...
#[+   0.158ms]info: Press "shift+t" to perform a repeated test
#[+   0.122ms]info: Press "o" to open all EMCBs, "c" to close, or "t" to toggle.
#[+   0.460ms]info: Press "r" to cycle the bargraph LEDs on all breakers through the rainbow.
#[+   0.140ms]info: Press "d" to Discover Devices and match their bargraph LEDs to the logged colors.
#[+   0.125ms]info: Press "i" to identify individual Devices (log their ID's and shine their bargraph color to match terminal for 10 seconds).
#[+   0.121ms]info: Press "s" to Get Device Status (Breaker Feedback and Metering).
#[+   0.110ms]info: Press "f" to Get Breaker Feedback Status.
#[+   0.109ms]info: Press "m" to Get Meter Data.

# Example Output of a Repeated Test "shift+t" command:
#[+ 0.182ms] info: Failed Attempts = 0
#[+ 0.144ms] info: Successful Attempts = 10
#[+ 0.126ms] info: Total Time = 1276.989530029297 ms
#[+ 0.126ms] info: Average Time = 127.69895300292968 ms
#[+ 0.123ms] info: Max Time = 175.87114398193359 ms
#[+ 0.121ms] info: Min Time = 104.25870202636719 ms
```

Combined with `tail logs/logs.txt -f`, this is a very powerful tool to familiarize developers with the [EMCB UDP API](./docs/EMCB\ UDP\ API.pdf) and binary protocol.

> **NOTE** - This tool is great for debugging, but it does NOT implement `.on(`[EMCB_UDP_EVENT_QUEUE_DRAINED](./../docs/API.md#EMCB_UDP_EVENT_QUEUE_DRAINED)`)` [EventEmitter](https://nodejs.org/api/events.html) callback for polling and should therefore **NOT** be used as a reference for a production application.

### discoverAndLogData.js

[discoverAndLogData](./cli/discoverAndLogData.js) is another "one shot" tool for discovering and logging device status data.  It shows some different [ECMAScript 6](https://www.w3schools.com/js/js_es6.asp) syntax and functionality than the previous examples.  The example does the following:

- discover EMCB's on the local network using the provisioned UDP keys in [_config.js](./_config.js)
- identify them by turning their Bargraph LEDs to match the color that they are being logged by the terminal for 10 seconds (using [chalk](https://www.npmjs.com/package/chalk))
- Log the [`getDeviceStatus`](./../docs/API.md#getdevicestatus) command, which includes both breaker feedback status and the current metering values

```bash
# Clean up log files from an previous runs of the tool and start the script
rm logs/*.txt; rm logs/*.csv; node ./Examples/cli/discoverAndLogData.js

#[+1156.303ms]info: DISCOVER DEVICES COMPLETE - found 1 EMCBs
#[+   3.773ms]info: 30000c2a690e2ee2
#[+ 212.913ms]info: 30000c2a690e2ee2: Breaker State=Closed.  Meter Data: updateNum= 71, LN-Volts-p0=121.800, LN-Volts-p1=0000000, Amps-p0=  0.008, Amps-p1=  0.008, Frequency-Hz=60.015
```

### writeDeviceDataToCSV.js

[writeDeviceDataToCSV](./cli/writeDeviceDataToCSV.js) is the most feature rich example application, serving as a complete data logger for the EMCB. This application is suitable for longer term testing and analysis and does the following:

- discover EMCB's on the local network using the provisioned UDP keys in [_config.js](./_config.js)
- identify them by turning their Bargraph LEDs to match the color that they are being logged by the terminal for 10 seconds (using [chalk](https://www.npmjs.com/package/chalk))
- Logs most of the interesting EMCB Events described in the [EventEmitter Cheat Sheet](./../docs/API.md#eventemitter-cheat-sheet)
- Begins polling the [`getDeviceStatus`](./../docs/API.md#getdevicestatus) as aggressively as possible by using the `.on(`[EMCB_UDP_EVENT_QUEUE_DRAINED](./../docs/API.md#EMCB_UDP_EVENT_QUEUE_DRAINED)`)` [EventEmitter](https://nodejs.org/api/events.html)
- Writes all of the collected data to individual `.csv` files in `./logs`
- Toggles the EMCBs every 10 seconds
  - Record statistics around each toggle and give a report when the app is closed

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

#Eample of the statistics recorded during the test for toggling the remote breaker handle
#^C[+1024.261ms]info: Caught interrupt signal
#[+   0.137ms]info: EMCBs._messageQueue.length = 0
#[+   0.080ms]info: { messagesSent: 2013, errors: 90, successes: 1938 }
#[+   0.039ms]info: 21 Attempts of the EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE command
#[+   0.034ms]info: Failed Attempts = 0
#[+   0.030ms]info: Successful Attempts = 20
#[+   0.028ms]info: Total Time = 5427.592463073731 ms
#[+   0.027ms]info: Average Time = 271.3796231536865 ms
#[+   0.026ms]info: Max Time = 418.3754390258789 ms
#[+   0.026ms]info: Min Time = 179.90867700195312 ms
```
