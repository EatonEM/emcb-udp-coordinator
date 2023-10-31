const {
    EmcbUDPbroadcastMaster,
    EMCB_UDP_EVENT_DEVICE_DISCOVERED
} = require('../../..'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys                = require("../../_config.js")

var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

const argv = require('minimist')(process.argv.slice(2));
var deviceID = argv._[0];
var deviceIP = argv._[1];

var device = EMCBs.createDevice(deviceID, deviceIP, true);

function parseGetMeterDataResponse(response){
    // clone the object
    var response = Object.assign({}, response); // shallow copy
    delete response.device;

    return response;
}

EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, (data) => {
    console.log('Device connected from address: ' + data.device.ipAddress);
    console.log("Sending: Get meter data");

    data.device.getMeterData()
        .then(data => {
            for (const [ip, response] of Object.entries(data.responses)) {
                console.log("Response from " + ip + ":");
                console.log(parseGetMeterDataResponse(response));
            }
        })
        .catch(err => {
            console.error("Failed to get meter data:")
            console.error(err)
        })
        .then(() => {
            process.exit()
        })
})