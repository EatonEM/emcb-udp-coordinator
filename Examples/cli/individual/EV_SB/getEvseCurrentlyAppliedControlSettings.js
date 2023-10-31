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

function parseGetAppliedEvseControlSettings(response){
    // clone the object
    var response = Object.assign({}, response); // shallow copy
    delete response.device;
    delete response.raw;

    response.enabled = (response.enabled == 1 ? true : (response.enabled == 0 ? false : null));
    response.authorized = (response.authorized == 1 ? true : (response.authorized == 0 ? false : null));

    // 0 means no software limit set, but hardware is still limited to 32 amps
    if (response.maxCurrentAmps == 0){
        response.maxCurrentAmps = 32;
    }

    if (response.maxEnergyWatts == 0){
        response.maxEnergyWatts = "none";
    }

    return response;
}


EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, (data) => {
    console.log('Device connected from address: ' + data.device.ipAddress);
    console.log("Sending: Get EVSE currently applied control settings");

    data.device.getEvseAppliedControlSettings()
        .then(data => {
            for (const [ip, response] of Object.entries(data.responses)) {
                console.log("Response from " + ip + ":");
                console.log(parseGetAppliedEvseControlSettings(response));
            }
        })
        .catch(err => {
            console.error("Failed to get EVSE currently applied settings:")
            console.error(err)
        })
        .then(() => {
            process.exit()
        })
})
    