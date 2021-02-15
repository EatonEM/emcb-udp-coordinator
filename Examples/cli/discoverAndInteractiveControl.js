/*jshint esversion: 6 */

const {
    EmcbUDPbroadcastMaster,
    logger,

    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE
} = require('./../../'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys                = require("../_config.js");
const readline               = require('readline');
const util                   = require('util');
const chalk                  = require('chalk');


const rainbowColors = [
    {red: 255,  green: 0,   blue: 0,    blinking: false},   //    red:
    {red: 255,  green: 165, blue: 0,    blinking: false},   //    orange:
    {red: 255,  green: 255, blue: 0,    blinking: false},   //    yellow:
    {red: 0,    green: 255, blue: 0,    blinking: false},   //    green:
    {red: 0,    green: 0,   blue: 255,  blinking: false},   //    blue:
    {red: 75,   green: 0,   blue: 130,  blinking: false},   //    indigo:
    {red: 238,  green: 130, blue: 238,  blinking: false},   //    violet:
    {red: 0,    green: 0,   blue: 0,    blinking: false},   //    reset:
];

const rainbowColorNames = [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "indigo",
    "violet",
    "white",    // Really off, but chalk.keyword likes this better :)
];

var rainbowIdx = 0;

var identifyIdx = 0;



var EMCBs = new EmcbUDPbroadcastMaster({
	// broadcastIPAddress : "10.130.116.255",
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
});


function discoverDevices(){
    EMCBs.discoverDevices()
        .then((devices) => {
			console.log("DISCOVER DEVICES COMPLETE - found " + Object.keys(devices).length + " EMCBs");

			var expectedDevices = Object.keys(UDPKeys.unicast);

            var coloredDeviceArray = [];

            for(var ipAddress in devices){
				coloredDeviceArray.push(chalk[devices[ipAddress].chalkColor](devices[ipAddress].idDevice));

				var index = expectedDevices.indexOf(devices[ipAddress].idDevice);
				if (index > -1) {
					expectedDevices.splice(index, 1);
				}

                // Blink the bargraph to the same color as what we are loggiing for 10 seconds!
                devices[ipAddress].setBargraphLEDToUserDefinedColorName(devices[ipAddress].chalkColor, 10, true);
            }

			console.log(coloredDeviceArray.join(chalk.reset(", ")) + chalk.reset(""));

			if(expectedDevices.length){
				console.error(chalk.red("Did not find the following expected Devices: " + expectedDevices.join(", ")));
			}



            function onSuccess(data, logger = console.log){
                if(data.responses === undefined && data.errors === undefined && data.timeouts === undefined){
                    logger(util.inspect(data));
                    return;
                }

                var responses = [];
                var errors = [];
				var timeouts = [];
				var ipAddress;

                for(var ipAddress in data.responses){
                    var device = data.responses[ipAddress].device;
                    data.responses[ipAddress].device = device.idDevice;
                    responses.push(chalk[device.chalkColor](util.inspect(data.responses[ipAddress])));
                }

				for(var ipAddress in data.errors){
					var errorString = data.errors[ipAddress].message;
					var device = data.errors[ipAddress].device;
					errors.push(chalk[device.chalkColor](device.idDevice + " - " + errorString));
				}

				for(var ipAddress in data.timeouts){
                    var errorString = data.timeouts[ipAddress].message;
                    var device = data.timeouts[ipAddress].device;
                    timeouts.push(chalk[device.chalkColor](device.idDevice + " - " + errorString));
                }



                // Sort for consistent rainbow colors!
                responses.sort();
                errors.sort();
                timeouts.sort();

                var responseStr = responses.length > 0 ? chalk.reset(`\n${responses.length} Responses:\n`) + responses.join(chalk.reset(',\n')) : "";
                var errorStr = errors.length > 0 ? chalk.reset(`\n${errors.length} Errors:\n`) + errors.join(chalk.reset(',\n')) : "";
                var timeoutStr = timeouts.length > 0 ? chalk.reset(`\n${timeouts.length} Timeouts:\n`) + timeouts.join(chalk.reset(',\n')) : "";

				logger(responseStr + errorStr + timeoutStr + '\n');
				// logger(util.inspect(data, false, 2));
            }

            function onError(err){
                onSuccess(err, console.error);
            }

            readline.emitKeypressEvents(process.stdin);
            process.stdin.setRawMode(true);

            process.stdin.on('keypress', (str, key) => {
                if (key.ctrl && key.name === 'c') {
                    console.log("Terminating interactive application");
                    process.exit();
                } else {
                    if(key.name === 'o'){   // open
                        EMCBs.setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN, 1).then(onSuccess).catch(onError);
                    }
                    else if(key.name === 'c'){  // close
                        EMCBs.setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED, 1).then(onSuccess).catch(onError);
                    }
                    else if(key.name === 't'){ // toggle
                        EMCBs.setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE, 1).then(onSuccess).catch(onError);
                    }

                    else if(key.name === 'd'){ // discover
                        var colorize = function(){
                            // Set the bargraph to the same color as what we are logging for 10 seconds!
                            for(var ipAddress in EMCBs.devices){
                                var device = EMCBs.devices[ipAddress];
                                device.setBargraphLEDToUserDefinedColorName(device.chalkColor, 10, false).catch(onError);
                            }
                        };

                        EMCBs.discoverDevices().then(devices => {
                            var coloredDeviceArray = [];
                            for(var ipAddress in devices){
                                coloredDeviceArray.push(chalk[devices[ipAddress].chalkColor](devices[ipAddress].idDevice));
                            }
                            console.log("Discovered " + Object.keys(devices).length + " EMCBs - " + coloredDeviceArray.join(chalk.reset(", ")) + chalk.reset(""));
                        })
                        .catch(onError).then(() => {
                            return EMCBs.syncDeviceSequenceNumbers().catch(onError);
                        })
                        .then(colorize)
                        .catch(colorize);
                    }

                    else if(key.name === 'i'){ // identify device id

                        var ipAddresses = Object.keys(EMCBs.devices).sort((a,b) => {
                            if(EMCBs.devices[a].idDevice < EMCBs.devices[b].idDevice)
                            	return -1;
                            else if(EMCBs.devices[a].idDevice > EMCBs.devices[b].idDevice)
                            	return 1;
                            else
                            	throw new Error("How do we have 2 of the same deviceID === " + EMCBs.devices[a].idDevice);
                        });

                        // Turn the bargraph to the same color as what we are logging for 10 seconds for a specific device!
                        var device = EMCBs.devices[ipAddresses[identifyIdx % ipAddresses.length]];

                        console.log(chalk[device.chalkColor](`Identifying Device ${device.idDevice} using color ${device.chalkColor}`));

                        device.setBargraphLEDToUserDefinedColorName(device.chalkColor, 10, false).catch(onError);
                        identifyIdx++;
                    }

                    else if(key.name === 'r') { // Rainbow
                        var colorObj = new Array(5);

                        var color = rainbowColors[rainbowIdx];
                        color.blinking = false;

                        colorObj.fill(color, 1, 4);

                        console.log("Setting color to " + chalk.keyword(rainbowColorNames[rainbowIdx])(rainbowColorNames[rainbowIdx] == "white" ? "Normal Operation" : rainbowColorNames[rainbowIdx]));
                        EMCBs.setBargraphLEDToUserDefinedColor(rainbowIdx === rainbowColors.length-1 ? false : true, colorObj, 0).then(onSuccess).catch(onError);

                        rainbowIdx = (rainbowIdx+1) % rainbowColors.length;    // Start with red to make a proper rainbow!
                    }

                    else if(key.name === 's'){  // status
                        EMCBs.getDeviceStatus().then(onSuccess).catch(onError);
                    }

                    else if(key.name === 'f') { // feedback state
                        EMCBs.getBreakerRemoteHandlePosition().then(onSuccess).catch(onError);
                    }

                    else if(key.name === 'm'){ // getMeterData
                        EMCBs.getMeterData().then(onSuccess).catch(onError);
                    }

                    else if(key.name === 'g'){ // getNextSequenceNumber
                        EMCBs.getNextSequenceNumber().then(onSuccess).catch(onError);
                    }
                }
            });

            console.log(`Press "ctrl+c" to exit...`);
            console.log(`Press "o" to open all EMCBs, "c" to close, or "t" to toggle.`);
            console.log(`Press "r" to cycle the bargraph LEDs on all breakers through the ${chalk.red("r")}${chalk.keyword("orange")("a")}${chalk.yellow("i")}${chalk.green("n")}${chalk.blue("b")}${chalk.keyword("violet")("o")}${chalk.keyword("indigo")("w")}.`);
            console.log(`Press "d" to Discover Devices and match their bargraph LEDs to the logged colors.`);
            console.log(`Press "i" to identify individual Devices (log their ID's and shine their bargraph color to match terminal for 10 seconds).`);
            console.log(`Press "s" to Get Device Status (Breaker Feedback and Metering).`);
            console.log(`Press "f" to Get Breaker Feedback Status.`);
            console.log(`Press "m" to Get Meter Data.`);

        })
        .catch(err => {
            logger.error(util.inspect(err));
            logger.info("Retrying in 5 seconds");
            setTimeout(() => {
                discoverDevices();
            }, 5000);
        });
}
discoverDevices();