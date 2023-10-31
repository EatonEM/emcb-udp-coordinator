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

function parseGetEvseConfigSettingsAndModeResponse(response){

    // clone the object
    var response = Object.assign({}, response); // shallow copy
    response.apiConfiguration = Object.assign({}, response.apiConfiguration); // shallow copy
    delete response.device;
    delete response.raw;

    var modes = {
        1 : "no-restrictions", //Enabled and 100% charge rate, default out of the box mode
        2 : "offline-no-restrictions", //Enabled and 100% charge rate, reverts once back online
        3 : "manual-override",
        4 : "cloud-api",
        5 : "charge-windows",
        6 : "api-override-enable",
        7 : "api-override-disable",
        8 : "ocpp",
    }

    var offlineModes = {
        1 : "no-restrictions",
        2 : "no-change"
    }

    if (response.mode in modes){
        response.mode = modes[response.mode];
    }
    else{
        response.mode = "unknown";
    }

    if (response.offlineMode in offlineModes){
        response.offlineMode = offlineModes[response.offlineMode];
    }
    else{
        response.offlineMode = "unknown";
    }

    var enabled = response.apiConfiguration.enabled;
    response.apiConfiguration.enabled = (enabled == 1? true : (enabled == 0? false : "unknown"));

    // 0 means no software limit set, but hardware is still limited to 32 amps
    if (response.apiConfiguration.maxCurrentAmps == 0){
        response.apiConfiguration.maxCurrentAmps = 32
    }

    if (response.apiConfiguration.maxEnergyWatts == 0){
        response.apiConfiguration.maxEnergyWatts = "none"
    }

    return response;
}

EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, (data) => {
    console.log('Device connected from address: ' + data.device.ipAddress);
    console.log("Sending: EVSE configuration settings and mode");

    data.device.getEvseConfigSettingsAndMode()
        .then(data => {
            for (const [ip, response] of Object.entries(data.responses)) {
                console.log("Response from " + ip + ":");
                console.log(parseGetEvseConfigSettingsAndModeResponse(response));
            }

        })
        .catch(err => {
            console.error("Unable to get EVSE configuration settings and mode")
            console.error(err)
        })
        .then(() => {
            process.exit()
        })
})