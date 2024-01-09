// NOTE: This command will only work on EV Smart Breaker Charger

const {
    EmcbUDPbroadcastCoordinator,
    EMCB_UDP_EVENT_DEVICE_DISCOVERED
} = require('../../../../index.js'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys = require("../../../_config.js")

var EMCBs = new EmcbUDPbroadcastCoordinator({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

var parsers = require('./evseExampleParsers.js');

const argv = require('minimist')(process.argv.slice(2));
var deviceID = argv._[0];
var deviceIP = argv._[1];

console.log("Establishing connection to device " + deviceID + " at ip: " + deviceIP);
var device = EMCBs.createDevice(deviceID, deviceIP, true);

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function setToRandomCurrent(device){

    device.getEvseDeviceState()
    .then(data => {
        for (const [ip, response] of Object.entries(data.responses)) {
            console.log("Response from " + ip + ":");
            if (response.state !== 3){
                console.log(parsers.parseGetEvseDeviceStateResponse(response));
                process.exit()
            }
        }
    })
    .then(data => {

        var newCurrent = randomIntFromInterval(6, 32);

        console.log("setting current to: " + newCurrent);

        return device.patchEvseConfigSettingsAndMode({
            mode : "cloud-api",
            apiConfiguration : {
                enabled : true,
                restrictions : {
                    maxCurrent : newCurrent,
                }
            }
        })
    })
    .then(data => {
        for (const [ip, response] of Object.entries(data.responses)) {
            console.log("Response from " + ip + ":");
            console.log(parsers.parsePatchEvseConfigSettingsAndModeResponse(response));
        }
    })
    .catch(err => {
        console.error("Failed to set EVSE configuration settings and mode");
        console.error(err)
    })
    .then(data => {
        setTimeout(function() {setToRandomCurrent(device)}, 10000);
    })
}

EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, (data) => {
    console.log('Device connected from address: ' + data.device.ipAddress);

    setToRandomCurrent(data.device);

})
