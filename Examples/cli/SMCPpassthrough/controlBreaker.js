const UDP_MESSAGE_CODE_SMCP_PASSTHROUGH = 0x1234

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


// var getProtocol = [0xAA, 0x06, 0x00, 0x83, 0xD7, 0xDF]
var getCalibrationConfig = [0xAA, 0x06, 0x00, 0xFF, 0xCC, 0x60]
var getWaveform = [0xAA, 0x06, 0x00, 0x87, 0x53, 0x9F]
var setWaveformImmediate = [0xAA, 0x0B, 0x00, 0x01, 0x01, 0xFF, 0x0F, 0x64, 0x00, 0x1C, 0xA8]
var setModeContinousWaveform = [0xAA, 0x07, 0x00, 0x7E, 0x02, 0xF9, 0xDE]

// var getProtocol = "open"

var buf = "close"
// var buf = Buffer.alloc(command.length);
// for (var i = 0; i < command.length; i++) buf[i] = command[i];


const UDP_MESSAGE_CODE_GET_REMOTE_POSITION  = 0x4567
const UDP_MESSAGE_CODE_SET_REMOTE_POSITION  = 0x5678
const UDP_MESSAGE_CODE_SET_AUTO_OPEN        = 0x6789

// var buf = "close"
// // var buf = "open"

// device.send(UDP_MESSAGE_CODE_SET_REMOTE_POSITION, buf, device.ipAddress, device.udpKey)
// .then(data => {
//     var x = JSON.parse(JSON.stringify(data.responses[deviceIP])).data;
//     var y = ""
//     x.forEach(element => y += String.fromCharCode(element));
//     console.log(y);
// })
// .catch(err => {
//     console.error("Failed:")
//     console.error(err)
// })

// var buf = ""

// device.send(UDP_MESSAGE_CODE_GET_DATA_READY, buf, device.ipAddress, device.udpKey)
// .then(data => {
//     var x = JSON.parse(JSON.stringify(data.responses[deviceIP])).data;
//     var y = ""
//     x.forEach(element => y += String.fromCharCode(element));
//     console.log(y);
// })
// .catch(err => {
//     console.error("Failed:")
//     console.error(err)
// })


// var buf = "on"
// var buf = "off"

// device.send(UDP_MESSAGE_CODE_SET_AUTO_OPEN, buf, device.ipAddress, device.udpKey)
// .then(data => {
//     var x = JSON.parse(JSON.stringify(data.responses[deviceIP])).data;
//     var y = ""
//     x.forEach(element => y += String.fromCharCode(element));
//     console.log(y);
// })
// .catch(err => {
//     console.error("Failed:")
//     console.error(err)
// })



var UDP_MESSAGE_CODE_GET_DEVICE_STATUS = 0x00FF

var buf = ""

device.send(UDP_MESSAGE_CODE_GET_DEVICE_STATUS, buf, device.ipAddress, device.udpKey)
.then(data => {
    // var x = JSON.parse(JSON.stringify(data.responses[deviceIP])).data;
    // var y = ""
    // x.forEach(element => y += String.fromCharCode(element));
    // console.log(y);

    // console.log(JSON.parse(JSON.stringify(data.responses[deviceIP])).data);

    console.log(data.responses[deviceIP].breaker)
    console.log(data.responses[deviceIP].meter)
    // console.log(data.responses[deviceIP].device)
})
.catch(err => {
    console.error("Failed:")
    console.error(err)
})
