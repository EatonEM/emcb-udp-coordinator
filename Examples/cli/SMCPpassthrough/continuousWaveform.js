const UDP_MESSAGE_CODE_SMCP_PASSTHROUGH = 0x1234
const UDP_MESSAGE_CODE_METER_RESET      = 0x2345
const UDP_MESSAGE_CODE_GET_DATA_READY   = 0x3456
const UDP_MESSAGE_CODE_UNSOLICITED_DATA = 0x9876
// const UDP_MESSAGE_CODE_DATA_READY       = 0x8765

const {
    EmcbUDPbroadcastMaster,
} = require('../../..'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys         = require("../../_config.js");
const { exitOnError } = require('winston');

var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

const argv = require('minimist')(process.argv.slice(2));
var deviceID = argv._[0]
var deviceIP = argv._[1]
var device = EMCBs.createDevice(deviceID, deviceIP, true);

var setModeContinuousWaveform = [0xAA, 0x07, 0x00, 0x7E, 0x02, 0xF9, 0xDE]

device.master.onUnhandledMessage = function(data){

    if (data.messageCode == UDP_MESSAGE_CODE_UNSOLICITED_DATA){
        console.log("Got unsolicited meter data from " + data.rinfo.address + " :");
        console.log(data.messageData)
        return true;
    }

    return false;
}

var command = setModeContinuousWaveform
var buf = Buffer.alloc(command.length);
for (var i = 0; i < command.length; i++) buf[i] = command[i];

device.send(UDP_MESSAGE_CODE_SMCP_PASSTHROUGH, buf, device.ipAddress, device.udpKey)
.then(data => {
    console.log(JSON.parse(JSON.stringify(data.responses[deviceIP])).data);
})
.catch(err => {
    console.error("Failed:")
    console.error(err)
})

