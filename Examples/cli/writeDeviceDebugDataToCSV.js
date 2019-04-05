const {

    EmcbUDPbroadcastMaster,
    logger,

    // GET Message Codes
    EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER,
    EMCB_UDP_MESSAGE_CODE_GET_DEVICE_DEBUG_DATA,

    // SET Message Codes
    EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER,

    // Enums
    EMCB_UDP_ACK,

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
const util                   = require('util')
const { Readable }           = require('stream')
const Json2csvTransform      = require('json2csv').Transform;
const chalk                  = require('chalk');

var jsonWriteStreams = {}
var totalQueueDrains = 0
var successes = 0
var failures = 0

var localDevices = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})


// Called whenever there is a response to a GET_NEXT_SEQUENCE_NUMBER command
localDevices.on(EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER, data => {
    logger.info(chalk[data.device.chalkColor](`Sequence Number updated to 0x${data.nextSequenceNumber.toString(16).toUpperCase()} = ${data.nextSequenceNumber}`))
})

// Called whenever there is a response to a GET_DEVICE_DEBUG_DATA command
localDevices.on(EMCB_UDP_MESSAGE_CODE_GET_DEVICE_DEBUG_DATA, data => {
    var device = data.device;
    delete data.device;
    logger.info(chalk[device.chalkColor](`Received GET_DEVICE_DEBUG_DATA response from ${device.ipAddress} with Device ID ${device.idDevice}. Data = ${util.inspect(data, {breakLength: Infinity})}`))
})

// Called for every successful SET_NEXT_SEQUENCE_NUMBER command
localDevices.on(EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER, data => {
    logger.info(chalk[data.device.chalkColor](`SET_NEXT_SEQUENCE_NUMBER response "${data.ackString}" from ${data.device.ipAddress} with Device ID ${data.device.idDevice}.${data.ack === EMCB_UDP_ACK ? ` Sequence Number updated to 0x${data.nextSequenceNumber.toString(16).toUpperCase()} = ${data.nextSequenceNumber}` : ""}`))
})

// Called every time a device is discovered on the local network
localDevices.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, data => {
    logger.info(chalk[data.device.chalkColor](`Discovered EMCB ${data.device.idDevice} at ${data.device.ipAddress}!`))
})

// Called after 100 consecutive timeouts and multiple resync attempts with a particular device as we remove it from the list of devices currently "discovered" and available within the EmcbUDPbroadcastMaster
localDevices.on(EMCB_UDP_EVENT_DEVICE_REMOVED, data => {
    logger.warn(chalk[data.device.chalkColor](`Removing EMCB at ${data.device.ipAddress} with with Device ID ${data.device.idDevice}...  Too many consecutive timeouts/errors.`))
})

// Called whenever a device IP address change is detected
localDevices.on(EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED, data => {
    logger.info(chalk[data.device.chalkColor](`Device ID ${data.device.idDevice} moved from ${data.oldIPaddress} to ${data.newIPaddress}`))
})

// Called whenever there is a device timeout
localDevices.on(EMCB_UDP_ERROR_TIMEOUT, data => {
    failures++
    logger.warn(chalk[data.device.chalkColor](data.message))
})

// Called whenever there is a parser error - which can include a nack from the device, invalid number of bytes, etc.
localDevices.on(EMCB_UDP_ERROR_PARSER, data => {
    failures++
    logger.warn(chalk[data.device.chalkColor]("Parser Error - " + data.message))
})

// Whenever the message queue is drained, poll the devices' status as quickly as possible, in order to cause our events listeners above to fire!
localDevices.on(EMCB_UDP_EVENT_QUEUE_DRAINED, () => {
    totalQueueDrains++

    localDevices.getDeviceDebugData()
            .then(data => {
                for(var ipAddress in data.responses){
                    data.responses[ipAddress].ts = new Date()
                    jsonWriteStreams[ipAddress].input.push(data.responses[ipAddress])
                    successes++
                }
            })
            .catch(err => {})   // Silence unhandled errors

})

function discoverDevices(){
    localDevices.discoverDevices()
        .then((devices) => {
            console.log("DISCOVER DEVICES COMPLETE - found " + Object.keys(devices).length + " devices on the local network!")

            var coloredDeviceArray = []
            const fields = ["ts", "time", "millis", "micros", "freeMemory", "RSSI", "lightLevel"];
            const transformOpts = { objectMode: true, highWaterMark: 16384, encoding: 'utf-8' };

            for(var ipAddress in devices){
                coloredDeviceArray.push(chalk[devices[ipAddress].chalkColor](devices[ipAddress].idDevice));

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
        })
        .catch(err => {
            console.error(err instanceof Error ? err.message : err)
            logger.info("Retrying Device Discovery in 5 seconds")
            setTimeout(() => {
                discoverDevices()
            }, 5000)
        })
}

discoverDevices()

process.on('SIGINT', function() {
    try{
        logger.info("Caught interrupt signal");

        console.info("localDevices._messageQueue.length = " + localDevices._messageQueue.length)

        var numDevices = Object.keys(localDevices.devices).length*1.0

        console.info({
            messagesSent: totalQueueDrains,
            errors: failures/numDevices,
            successes: successes/numDevices,
            unhandledMessages: localDevices.unhandledMessages/numDevices,
            errorsExcludingUnhandledMessages: failures/numDevices - localDevices.unhandledMessages/numDevices,
        })

        // Kill our streams and our process afterwards
        var ends = 0
        for(var ipAddress in jsonWriteStreams){
            jsonWriteStreams[ipAddress].input.push(null)
            jsonWriteStreams[ipAddress].processor.end(() => {
                ends++

                if(ends === Object.keys(jsonWriteStreams).length)
                    process.exit();
            })
        }

        if(Object.keys(jsonWriteStreams).length === 0)
            process.exit();

    } catch(ex){
        console.error("process.on SIGINT threw an error...")
        console.error(ex);
        process.exit();
    }

});
