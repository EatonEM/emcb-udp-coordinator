// NOTE: This command will only work on Smart Breaker

const {
    EmcbUDPbroadcastMaster,
    EMCB_UDP_EVENT_DEVICE_DISCOVERED,

    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE
} = require('../../../..'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys                = require("../../../_config.js")

const util = require('util')

const argv = require('minimist')(process.argv.slice(2));
var deviceID = argv._[0];
var deviceIP = argv._[1];
var command = argv._[2];

const validCommands = ["open", "close", "toggle"];
if(!validCommands.includes(command)){
    console.warn("Provided command argument not in [" + validCommands.join(", ") + "].  Toggling instead")
    command = "toggle"
}

switch(command){
    case "open":
        command = EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN;
        break;
    case "close":
        command = EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED
        break;
    default:
        command = EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE
        break;
}

var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

var device = EMCBs.createDevice(deviceID, deviceIP, true);

EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, (data) => {
    console.log('Device connected from address: ' + data.device.ipAddress);
    console.log("Sending: Set breaker state");

    device.setBreakerState(command)
        .then(data => {
            for (const [ip, response] of Object.entries(data.responses)) {
                console.log("Response from " + ip + ":");
                
                var resp = Object.assign({}, response); // shallow clone
                delete resp.device; 
                console.log(util.inspect(resp, false, null, true));
            }
        })
        .catch(err => {
            console.error("Failed to set breaker handle position");
            console.error(err)
        })
        .then(() => {
            process.exit()
        })
})