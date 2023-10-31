// NOTE: This command will only work on EV Smart Breaker Charger

const {
    EmcbUDPbroadcastMaster,
    EMCB_UDP_EVENT_DEVICE_DISCOVERED
} = require('../../../..'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys = require("../../../_config.js")

var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

const argv = require('minimist')(process.argv.slice(2));
var deviceID = argv._[0];
var deviceIP = argv._[1];

console.log("Establishing connection to device " + deviceID + " at ip: " + deviceIP);
var device = EMCBs.createDevice(deviceID, deviceIP, true);

function parsePatchEvseConfigSettingsAndModeResponse(response){
    // clone the object
    var response = Object.assign({}, response); // shallow copy
    delete response.device;

    return response;
}

EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, (data) => {
    console.log('Device connected from address: ' + data.device.ipAddress);
    console.log("Sending: Set EVSE configuration settings and mode");

    data.device.patchEvseConfigSettingsAndMode({
        // NOTE: each value can be deleted or set to null to use the existing value on the device
        // mode : null,
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
            console.log(parsePatchEvseConfigSettingsAndModeResponse(response));
        }

    })
    .catch(err => {
        console.error("Failed to set EVSE configuration settings and mode");
        console.error(err)
    })
    .then(() => {
        process.exit()
    })
})




    