const {
    EmcbUDPbroadcastMaster,
    logger,
} = require('../../index.js'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys                = require("../_config.js")
const util                   = require('util');
const chalk                  = require('chalk');

var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})

function printMeterData(){
    
    EMCBs.getMeterData()
    .then(data => {
        Object.keys(data).forEach(x => {
            if (x === "responses"){

                Object.keys(data.responses).forEach(k => {
                    var response = data.responses[k];
                    var color = response.device.chalkColor;

                    response = Object.assign({}, response); // shallow copy
                    delete response.device;

                    console.log(chalk[color](util.inspect(response)));
                });

            }
            else if (x === "timeouts"){
                Object.keys(data.timeouts).forEach(k => {

                    var timeout = data.timeouts[k];

                    if ("device" in timeout){
                        var color = timeout.device.chalkColor;
                        console.log(chalk[color]("[", k, "]:", "timeout"));
                    }
                    else{
                        console.log("[", k, "]: timeout");
                    }

                });
            }
            else{
                console.log(data[x])
            }
        });
    })
    .catch(err => {
        console.error("Failed to get meter data")
        console.error(err)
    })
}

function discoverDevices(){
    EMCBs.discoverDevices()
        .then((devices) => {
            console.log("DISCOVER DEVICES COMPLETE - found " + Object.keys(devices).length + " EMCBs")

            printMeterData();
            setInterval(printMeterData, 15000);
        })
        .catch(err => {
            logger.error(err)
            logger.info("Retrying in 5 seconds")
            setTimeout(() => {
                discoverDevices()
            }, 5000)
        })
}
discoverDevices();