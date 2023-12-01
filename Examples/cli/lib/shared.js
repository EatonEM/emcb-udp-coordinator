const util = require('util');

const {
    logger,
} = require('./../../../'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

function discoverDevicesErrorLogger(err) {
    if (err instanceof Error) {
        var errString = err.toString();

        if (errString.toLowerCase().includes("no devices discovered")) {
            logger.warn(errString)
        } else {
            logger.error(errString)
        }
    } else {
        if (typeof err === 'object') {
            if (err.timeouts) {
                var ips = Object.keys(err.timeouts);

                for (var i = 0; i < ips.length; i++) {
                    var ipAddr = ips[i];
                    var val = err.timeouts[ipAddr];
                    var str = val instanceof Error ? val.toString() : val;

                    logger.error(`${ipAddr}: ${str}`);
                }
            } else {
                logger.error(err.toString());
            }
        } else {
            logger.error(err)
        }
    }
}

function exitProcess(_){
    logger.info("Example complete!")
    process.exit()
}

function logExceptionAndExitProcess(err) {
    logger.error(util.inspect(err));

    exitProcess();
}

module.exports = {
    "discoverDevicesErrorLogger": discoverDevicesErrorLogger,
    "exitProcess": exitProcess,
    "logExceptionAndExitProcess": logExceptionAndExitProcess 
}
