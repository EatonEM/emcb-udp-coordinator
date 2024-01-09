// NOTE: This script will only work with Smart Breakers

const {
    discoverDevicesErrorLogger,
    exitProcess,
    logExceptionAndExitProcess
} = require('./lib/shared')

const {
    EmcbUDPbroadcastCoordinator,
    logger,
} = require('./../../'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys                = require("../_config.js")
const chalk                  = require('chalk');

var EMCBs = new EmcbUDPbroadcastCoordinator({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

async function logDeviceStatus(){
    const data = await EMCBs.getDeviceStatus()

    for(var ipAddress in data.responses){
        var status = data.responses[ipAddress]
        var device = status.device
        logger.info(chalk[device.chalkColor](`${device.idDevice}: Breaker State=${status.breaker.stateString}.  Meter Data: updateNum=${status.meter.updateNum.toString().padStart(3)}, LN-Volts-p0=${(status.meter.LNmVp0/1000.0).toString().padEnd(7, "0")}, LN-Volts-p1=${(status.meter.LNmVp1/1000.0).toString().padEnd(7, "0")}, Amps-p0=${(status.meter.mAp0/1000.0).toString().padStart(7)}, Amps-p1=${(status.meter.mAp1/1000.0).toString().padStart(7)}, Frequency-Hz=${(status.meter.frequency/1000.0).toString().padEnd(6, "0")}`))
    }
}

async function runExample() {
    EMCBs.discoverDevices().then(async devices => {
        try {
            console.log("DISCOVER DEVICES COMPLETE - found " + Object.keys(devices).length + " EMCBs")

            var coloredDeviceArray = []

            for(var ipAddress in devices){
                var device = EMCBs.devices[ipAddress]

                coloredDeviceArray.push(chalk[device.chalkColor](device.idDevice));

                // Turn the bargraph to the same color as what we are logging for 10 seconds!
                device.setBargraphLEDToUserDefinedColorName(device.chalkColor, 10, true)
            }

            console.log(coloredDeviceArray.join(chalk.white(",")))

            await logDeviceStatus()

            exitProcess();
        } catch (ex) {
            logExceptionAndExitProcess(ex);
        }

    }, discoverDevicesErrorLogger);
}

runExample();