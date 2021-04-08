const {
    EmcbUDPbroadcastMaster,
    logger,
} = require('./../../'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys                = require("../_config.js")
const chalk                  = require('chalk');

var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

// async function logFeedbackState(){
//     const feedbackStates = await EMCBs.getBreakerRemoteHandlePosition()

//     for(var ipAddress in feedbackStates.responses){
//         var device = feedbackStates.responses[ipAddress].device
//         console.log(chalk[device.chalkColor](device.idDevice + " Remote Handle Position is " + feedbackStates.responses[ipAddress].stateString))
//     }
// }

// async function logMeterData(){
//     const meterData = await EMCBs.getMeterData()

//     for(var ipAddress in meterData.responses){
//         var data = meterData.responses[ipAddress]
//         var device = data.device
//         logger.info(chalk[device.chalkColor](`${device.idDevice}: updateNum=${data.updateNum.toString().padStart(3)}, LN-Volts-p0=${(data.LNmVp0/1000.0).toString().padEnd(7, "0")}, LN-Volts-p1=${(data.LNmVp1/1000.0).toString().padEnd(7, "0")}, Amps-p0=${(data.mAp0/1000.0).toString().padStart(7)}, Amps-p1=${(data.mAp1/1000.0).toString().padStart(7)}, Frequency-Hz=${(data.frequency/1000.0).toString().padEnd(6, "0")}`))
//     }
// }

async function logDeviceStatus(){
    const data = await EMCBs.getDeviceStatus()

    for(var ipAddress in data.responses){
        var status = data.responses[ipAddress]
        var device = status.device
        logger.info(chalk[device.chalkColor](`${device.idDevice}: Breaker State=${status.breaker.stateString}.  Meter Data: updateNum=${status.meter.updateNum.toString().padStart(3)}, LN-Volts-p0=${(status.meter.LNmVp0/1000.0).toString().padEnd(7, "0")}, LN-Volts-p1=${(status.meter.LNmVp1/1000.0).toString().padEnd(7, "0")}, Amps-p0=${(status.meter.mAp0/1000.0).toString().padStart(7)}, Amps-p1=${(status.meter.mAp1/1000.0).toString().padStart(7)}, Frequency-Hz=${(status.meter.frequency/1000.0).toString().padEnd(6, "0")}`))
    }
}




// We wrap this function so we can call every 5 seconds in the event that we don't discover anything...
async function discoverDevices(){
    return new Promise((resolve, reject) => {
        EMCBs.discoverDevices()
            .then(async devices => {
                console.log("DISCOVER DEVICES COMPLETE - found " + Object.keys(devices).length + " EMCBs")

                var coloredDeviceArray = []

                for(var ipAddress in devices){
                    var device = EMCBs.devices[ipAddress]

                    coloredDeviceArray.push(chalk[device.chalkColor](device.idDevice));

                    // Turn the bargraph to the same color as what we are logging for 10 seconds!
                    device.setBargraphLEDToUserDefinedColorName(device.chalkColor, 10, true)
                }

                console.log(coloredDeviceArray.join(chalk.white(",")))


                // await logFeedbackState()
                // await logMeterData()
                await logDeviceStatus()

                resolve()
            })
            .catch(err => {
                logger.error(err)
                logger.info("Retrying in 5 seconds")
                setTimeout(() => {
                    discoverDevices()
                }, 5000)
            })
    })

}

function exit(dummy){
    process.exit()
}

discoverDevices().then(exit);