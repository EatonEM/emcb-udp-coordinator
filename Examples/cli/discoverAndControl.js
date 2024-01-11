// NOTE: This script will only work with Smart Breakers

const {
    discoverDevicesErrorLogger,
    exitProcess,
    logExceptionAndExitProcess
} = require('./lib/shared')

const {
    EmcbUDPbroadcastCoordinator,
    logger,

    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE
} = require('./../../'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-coordinator` module, replace with `require("emcb-udp-coordinator")`

const UDPKeys                = require("../_config.js")

const chalk                  = require('chalk');

//Call this script with `$ node discoverAndControl.js open` as an example
const validCommands = ["open", "close", "toggle"]
const argv = require('minimist')(process.argv.slice(2));
var command = argv._[0]
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


var EMCBs = new EmcbUDPbroadcastCoordinator({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

function runExample(){
    EMCBs.discoverDevices()
        .then((devices) => {
            console.log("DISCOVER DEVICES COMPLETE - found " + Object.keys(devices).length + " EMCBs")

            var coloredDeviceArray = []

            for(var ipAddress in EMCBs.devices){
                var device = EMCBs.devices[ipAddress]

                coloredDeviceArray.push(chalk[device.chalkColor](device.idDevice));

                // Turn the bargraph to the same color as what we are logging for 10 seconds!
                device.setBargraphLEDToUserDefinedColorName(device.chalkColor, 10, true);

            }

            console.log(coloredDeviceArray.join(chalk.white(",")));

            EMCBs.setBreakerState(command)
            .then(data => {
                console.log("Toggled all breakers successfully!");
                console.log(data);
            })
            .catch(err => {
                console.error("Unable to Toggle all breakers");
                console.error(err);
            })
            .then(() => {
                exitProcess();
            })
        })
        .catch(err => {
            discoverDevicesErrorLogger(err);
            logger.info("Retrying Device Discovery in 5 seconds");
            setTimeout(() => {
                runExample();
            }, 5000)
    })
}

runExample();
