// NOTE: This command will only work on EV Smart Breaker Charger

const {
    EmcbUDPbroadcastMaster,
    EMCB_UDP_EVENT_DEVICE_DISCOVERED
} = require('../../../..'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys = require("../../../_config.js")

var parsers = require('./evseExampleParsers.js');

var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

const argv = require('minimist')(process.argv.slice(2));
var deviceID = argv._[0];
var deviceIP = argv._[1];

console.log("Establishing connection to device " + deviceID + " at ip: " + deviceIP);
EMCBs.createDevice(deviceID, deviceIP, true);


EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, (data) => {
    var device = data.device;
    console.log('Device connected from address: ' + device.ipAddress);
    console.log("Sending: Set EVSE configuration settings and mode");

    device.patchEvseConfigSettingsAndMode({
        // NOTE: every key is optional, undefined values will not modify the existing value on the device
        // mode : undefined,
        // mode : "no-restrictions",
        mode : "cloud-api",
        // mode: "charge-windows",
        // mode: "api-override-enable",
        // mode: "api-override-disable",
        
        offlineMode : "no-change",
        // offlineMode : "no-restrictions",

        apiConfiguration : {
            enabled : true,
            restrictions : {
                maxCurrent : 32,
                maxEnergy : 0
            }
        }
    })
    .then(data => {
        for (const [ip, response] of Object.entries(data.responses)) {
            console.log("Response from " + ip + ":");
            console.log(parsers.parsePatchEvseConfigSettingsAndModeResponse(response));
        }

        // need a bit of extra time for the values to update on the device. 1s seems to work fine but I'll go with 2s for now to be safe
        return new Promise(resolve => setTimeout(resolve, 2000));
    })
    .then(data => {
        return device.getEvseConfigSettingsAndMode()
                .then(data => {
                    for (const [ip, response] of Object.entries(data.responses)) {
                        console.log("Response from " + ip + ":");
                        console.log(parsers.parseGetEvseConfigSettingsAndModeResponse(response));
                    }
                })
                .catch(err => {
                    console.error("Failed to get EVSE configuration settings and mode");
                    console.error(err)
                })
    })
    .catch(err => {
        console.error("Failed to set EVSE configuration settings and mode");
        console.error(err)
    })
    .then(() => {
        process.exit()
    })
})
