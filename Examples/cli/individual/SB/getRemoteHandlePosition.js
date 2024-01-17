// NOTE: This command will only work on Smart Breaker

const {
    EmcbUDPbroadcastCoordinator,
    EMCB_UDP_EVENT_DEVICE_DISCOVERED
} = require('../../../..'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-coordinator` module, replace with `require("emcb-udp-coordinator")`

const UDPKeys                = require("../../../_config.js")

const util = require('util')

var EMCBs = new EmcbUDPbroadcastCoordinator({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

const argv = require('minimist')(process.argv.slice(2));
var deviceID = argv._[0];
var deviceIP = argv._[1];

if (deviceID === undefined){
    throw "device ID (arg 0) is required";
}
if (deviceIP === undefined){
    throw "device IP (arg 1) is required";
}

var device = EMCBs.createDevice(deviceID, deviceIP, true);

EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, (data) => {
    console.log('Device connected from address: ' + data.device.ipAddress);
    console.log("Sending: Get breaker state");

    device.getBreakerRemoteHandlePosition()
        .then(data => {
            for (const [ip, response] of Object.entries(data.responses)) {
                console.log("Response from " + ip + ":");

                var resp = Object.assign({}, response); // shallow clone
                delete resp.device;
                console.log(util.inspect(resp, false, null, true));
            }
        })
        .catch(err => {
            console.error("Failed to get remote handle position")
            console.error(err)
        })
        .then(() => {
            process.exit()
        })
})
