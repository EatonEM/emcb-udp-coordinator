const {
    discoverDevicesErrorLogger,
    exitProcess,
    logExceptionAndExitProcess
} = require('./lib/shared')

const {

    EmcbUDPbroadcastMaster,
    logger,

    // GET Message Codes
    EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER,
    EMCB_UDP_MESSAGE_CODE_GET_DEVICE_DEBUG_DATA,
    EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS,
    EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION,
    EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA,

    // SET Message Codes
    EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER,
    EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION,
    EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED,

    // Enums / Parsed Data Constants
    EMCB_UDP_ACK,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE,

    // Errors
    EMCB_UDP_ERROR_TIMEOUT,
    EMCB_UDP_ERROR_PARSER,

    // Events
    EMCB_UDP_EVENT_QUEUE_DRAINED,
    EMCB_UDP_EVENT_DEVICE_DISCOVERED,
    EMCB_UDP_EVENT_DEVICE_REMOVED,
    EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED

} = require('./../../'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys                = require("../_config.js")

const fs                     = require('fs');
const path                   = require('path')
const { Readable }           = require('stream')
const Json2csvTransform      = require('json2csv').Transform;
const chalk                  = require('chalk');
const numeral 				 = require('numeral');

var jsonWriteStreams = {}

var totalQueueDrains = 0
var successes = 0
var failures = 0

var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

// Called whenever there is a response to a GET_NEXT_SEQUENCE_NUMBER command
EMCBs.on(EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER, data => {
    logger.info(chalk[data.device.chalkColor](`Sequence Number updated to 0x${data.nextSequenceNumber.toString(16).toUpperCase()} = ${data.nextSequenceNumber}`))
})

// Called whenever there is a response to a GET_DEVICE_STATUS command that contains fresh data
EMCBs.on(EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS, data => {
    logger.debug(chalk[data.device.chalkColor](`Received GET_DEVICE_STATUS response from ${data.device.ipAddress} with Device ID ${data.device.idDevice}`))
})

EMCBs.on(EMCB_UDP_MESSAGE_CODE_GET_DEVICE_DEBUG_DATA, data => {
    logger.debug(chalk[data.device.chalkColor](`Received GET_DEVICE_DEBUG_DATA response from ${data.device.ipAddress} with Device ID ${data.device.idDevice}`))
})

// Called whenever the breaker feedback position changes - could be from a GET_BREAKER_REMOTE_HANDLE_POSITION, GET_DEVICE_STATUS, or SET_BREAKER_REMOTE_HANDLE_POSITION command)
EMCBs.on(EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION, function(data){
    logger.info(chalk[data.device.chalkColor](`Breaker Feedback Position changed from ${data.lastState} to ${data.state}`))
})

// Called whenever there is new EMCB Meter data (as detected by seeing an update to updateNum) - could be GET_DEVICE_STATUS or GET_METER_TELEMETRY_DATA
var g_PreviousMeterData = {}
EMCBs.on(EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA, function(data){
	var idDevice = data.device.idDevice

    if(g_PreviousMeterData[idDevice]){
		var diff = data.updateNum - g_PreviousMeterData[idDevice].updateNum
		if(diff < 0) diff += 256	// Sequence Space arithmetic

		if(diff >= 5){ // Don't overwhelm the logging
			// Calculate the amount of delta Energy in milliJoules = milliWatt-Seconds.  We will divide this by the number of milliseconds since our last update below, to come up with the average Power that the device has consumed since our last log
			var deltaRealEp0 = data.mJp0 - g_PreviousMeterData[idDevice].mJp0
			var deltaRealEp1 = data.mJp1 - g_PreviousMeterData[idDevice].mJp1

			// Vertical logging
			// logger.info(chalk[data.device.chalkColor](`[${data.device.idDevice}]
            // updateNum: ${data.updateNum.toString().padStart(3)},  Period: ${data.period.toString().padStart(4)},
            // LN-Volts-p0: ${numeral(data.LNmVp0/1000.0).format('0.000').padStart(7)}, LN-Volts-p1: ${numeral(data.LNmVp1/1000.0).format('0.000').padStart(7)},
            // Amps-p0: ${numeral(data.mAp0/1000.0).format('0.000').padStart(7)},     Amps-p1: ${numeral(data.mAp1/1000.0).format('0.000').padStart(7)},
            // Watts-p0: ${numeral(deltaRealEp0/(data.period*diff)).format('0.000').padStart(9)},  Watts-p1: ${numeral(deltaRealEp1/(data.period*diff)).format('0.000').padStart(9)},
			// Frequency-Hz: ${numeral(data.frequency/1000.0).format('0.000')}`))

			// Widescreen logging
			logger.info(chalk[data.device.chalkColor](`[${data.device.idDevice}] updateNum: ${data.updateNum.toString().padStart(3)},  Period: ${data.period.toString().padStart(4)}, LN-Volts-p0: ${numeral(data.LNmVp0/1000.0).format('0.000').padStart(7)}, LN-Volts-p1: ${numeral(data.LNmVp1/1000.0).format('0.000').padStart(7)},Amps-p0: ${numeral(data.mAp0/1000.0).format('0.000').padStart(7)}, Amps-p1: ${numeral(data.mAp1/1000.0).format('0.000').padStart(7)}, Watts-p0: ${numeral(-deltaRealEp0/(data.period*diff)).format('0.000').padStart(9)}, Watts-p1: ${numeral(deltaRealEp1/(data.period*diff)).format('0.000').padStart(9)}, Frequency-Hz: ${numeral(data.frequency/1000.0).format('0.000')}`))

		} else{
			// If we don't log, we don't want to clobber our data otherwise we will never get to a diff > 5!
			return
		}
	}

	g_PreviousMeterData[idDevice] = data;
})

// Called for every successful SET_NEXT_SEQUENCE_NUMBER command
EMCBs.on(EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER, data => {
    logger.info(chalk[data.device.chalkColor](`SET_NEXT_SEQUENCE_NUMBER response "${data.ackString}" from ${data.device.ipAddress} with Device ID ${data.device.idDevice}.${data.ack === EMCB_UDP_ACK ? ` Sequence Number updated to 0x${data.nextSequenceNumber.toString(16).toUpperCase()} = ${data.nextSequenceNumber}` : ""}`))
})

// Called for every successful SET_BREAKER_REMOTE_HANDLE_POSITION command
EMCBs.on(EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION, data => {
    logger.info(chalk[data.device.chalkColor](`SET_BREAKER_REMOTE_HANDLE_POSITION command succeeded!`))
})

// Called for every successful SET_BARGRAPH_LED_TO_USER_DEFINED
EMCBs.on(EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED, data => {
    logger.info(chalk[data.device.chalkColor](`SET_BREAKER_REMOTE_HANDLE_POSITION command succeeded!`))
})

// Called every time a device is discovered on the local network
EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, data => {
    logger.info(chalk[data.device.chalkColor](`Discovered EMCB ${data.device.idDevice} at ${data.device.ipAddress}!`))
})

// Called after 100 consecutive timeouts and multiple resync attempts with a particular device as we remove it from the list of devices currently "discovered" and available within the EmcbUDPbroadcastMaster
EMCBs.on(EMCB_UDP_EVENT_DEVICE_REMOVED, data => {
    logger.warn(chalk[data.device.chalkColor](`Removing EMCB at ${data.device.ipAddress} with with Device ID ${data.device.idDevice}...  Too many consecutive timeouts/errors.`))
})

// Called whenever a device IP address change is detected
EMCBs.on(EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED, data => {
    logger.info(chalk[data.device.chalkColor](`Device ID ${data.device.idDevice} moved from ${data.oldIPaddress} to ${data.newIPaddress}`))
})

// Called whenever there is a device timeout
EMCBs.on(EMCB_UDP_ERROR_TIMEOUT, data => {
	failures++
	var color = data.device ? data.device.chalkColor : "reset"
    logger.debug(chalk[color](data.message))
})

// Called whenever there is a parser error - which can include a nack from the device, invalid number of bytes, etc.
EMCBs.on(EMCB_UDP_ERROR_PARSER, data => {
    failures++
    logger.warn(chalk[data.device.chalkColor]("Parser Error - " + data.message))
})

// Whenever the message queue is drained, poll the devices' status as quickly as possible, in order to cause our events listeners above to fire!
EMCBs.on(EMCB_UDP_EVENT_QUEUE_DRAINED, () => {
    totalQueueDrains++

    EMCBs.getDeviceStatus()
            .then(data => {
                for(var ipAddress in data.responses){
                    data.responses[ipAddress].ts = new Date()
                    for(var k in data.responses[ipAddress].meter){
                        data.responses[ipAddress].meter[k] = data.responses[ipAddress].meter[k].toString()
                    }

                    jsonWriteStreams[ipAddress].input.push(data.responses[ipAddress])
                    successes++
                }
            })
            .catch(err => {})   // Silence unhandled errors

})

function runExample(){
    EMCBs.discoverDevices()
        .then((devices) => {
            console.log("DISCOVER DEVICES COMPLETE - found " + Object.keys(devices).length + " EMCBs")

            var coloredDeviceArray = []
            const fields = ["ts", "breaker.state", "breaker.stateString", "meter.updateNum", "meter.frequency", "meter.period", "meter.mJp0", "meter.mVARsp0", "meter.mVAsp0", "meter.LNmVp0", "meter.mAp0", "meter.q1mJp0", "meter.q2mJp0", "meter.q3mJp0", "meter.q4mJp0", "meter.q1mVARsp0", "meter.q2mVARsp0", "meter.q3mVARsp0", "meter.q4mVARsp0", "meter.q1mVAsp0", "meter.q2mVAsp0", "meter.q3mVAsp0", "meter.q4mVAsp0", "meter.mJp1", "meter.mVARsp1", "meter.mVAsp1", "meter.LNmVp1", "meter.mAp1", "meter.q1mJp1", "meter.q2mJp1", "meter.q3mJp1", "meter.q4mJp1", "meter.q1mVARsp1", "meter.q2mVARsp1", "meter.q3mVARsp1", "meter.q4mVARsp1", "meter.q1mVAsp1", "meter.q2mVAsp1", "meter.q3mVAsp1", "meter.q4mVAsp1", "meter.LLp01mV",];
            const transformOpts = { objectMode: true, highWaterMark: 16384, encoding: 'utf-8' };

            for(var ipAddress in devices){
                coloredDeviceArray.push(chalk[devices[ipAddress].chalkColor](devices[ipAddress].idDevice));

                // Turn the bargraph to the same color as what we are logging for 10 seconds!
                var device = EMCBs.devices[ipAddress]
                device.setBargraphLEDToUserDefinedColorName(device.chalkColor, 10, true)


                // Create a readable stream in object modefor the JSON Transformer to consume
                const csvInput = new Readable({ objectMode: true });
                csvInput._read = () => {};

                const json2csv = new Json2csvTransform({ fields }, transformOpts);

                jsonWriteStreams[ipAddress] = {
                    input: csvInput,
                    processor: csvInput.pipe(json2csv).pipe(fs.createWriteStream(path.resolve(process.cwd(), "logs", devices[ipAddress].idDevice+".csv"), { encoding: 'utf8' }))
                }
            }

            console.log(coloredDeviceArray.join(chalk.reset(",")))

            setInterval(() => {
                console.log("Toggling Devices!")
                EMCBs.setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE)
                    .catch(err => {
                        logger.error("Unable to Toggle all breakers...")
                        logger.error(`Successes = [${Object.keys(err.responses || {}).join(",")}]; Timeouts = [${Object.keys(err.timeouts || {}).join(",")}]; Errors = [${Object.keys(err.errors || {}).join(",")}]`)
                    })
            }, 10050)    // The EMCB has a 10 second lockout timer between breaker control commands.  This ensures allows us to toggle at the max possible rate
        })
        .catch(err => {
            discoverDevicesErrorLogger(err);
            logger.info("Retrying Device Discovery in 5 seconds")
            setTimeout(() => {
                runExample()
            }, 5000)
        })
}

process.on('SIGINT', function() {   //Ctrl + C
    try{
        logger.info("Caught interrupt signal");

        console.info("EMCBs._messageQueue.length = " + EMCBs._messageQueue.length)

        var numDevices = Object.keys(EMCBs.devices).length*1.0

        console.info({
            messagesSent: totalQueueDrains,
            errors: failures/numDevices,
            successes: successes/numDevices
        })

        // Kill our streams and our process afterwards
        var ends = 0
        for(var ipAddress in jsonWriteStreams){
            jsonWriteStreams[ipAddress].input.push(null)
            jsonWriteStreams[ipAddress].processor.end(() => {
                ends++

                if(ends === Object.keys(jsonWriteStreams).length) {
                    exitProcess();
                }
            })
        }

        if(Object.keys(jsonWriteStreams).length === 0) {
            exitProcess();
        }

    } catch(ex){
        logExceptionAndExitProcess();
    }
});

runExample();
