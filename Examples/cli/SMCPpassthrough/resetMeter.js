const UDP_MESSAGE_CODE_SMCP_PASSTHROUGH = 0x1234
const UDP_MESSAGE_CODE_METER_RESET      = 0x2345
const UDP_MESSAGE_CODE_GET_DATA_READY   = 0x3456
const UDP_MESSAGE_CODE_UNSOLICITED_DATA = 0x9876

const {
    EmcbUDPbroadcastMaster,
} = require('../..'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys         = require("../_config.js");
const { exitOnError } = require('winston');


var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

const argv = require('minimist')(process.argv.slice(2));
var deviceID = argv._[0]
var deviceIP = argv._[1]
var device = EMCBs.createDevice(deviceID, deviceIP, true);


device.send(UDP_MESSAGE_CODE_METER_RESET, Buffer.alloc(0), device.ipAddress, device.udpKey)
.then(data => {
    console.log("meter reset");
})
.catch(err => {
    console.error("Failed:")
    console.error(err)
})
