/*jshint esversion: 6 */

// NOTE: This script will only work with Smart Breakers

const {
    discoverDevicesErrorLogger,
    exitProcess,
    logExceptionAndExitProcess
} = require('./lib/shared')

const {
    EmcbUDPbroadcastMaster,
    logger,

    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE
} = require('../..'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys                = require("../_config.js");
const readline               = require('readline');
const util                   = require('util');
const chalk                  = require('chalk');
const microsecondsNow                  = require('microseconds');


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

var devicesUnderTest = [];

var identifyIdx = 0;
var lastCommand = null;

var profilingStatistics = {
    "timeAvg": 0,
    "timeMax": null,
    "timeMin": null,
    "numAttempts": 0,
    "numSuccess": 0,
    "numFailed": 0
  };
  
  var profilingConfig = {
    "active": false,
    "commandKey": null,
    "commandString": null,
    "targetDevice": null,
    "selectionIdx": 0
  };

var startTimeMicroseconds = 0;

var EMCBs = new EmcbUDPbroadcastMaster({
	// broadcastIPAddress : "10.130.116.255",
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
});


function runExample(){
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
            console.log("")

			if(expectedDevices.length){
				console.error(chalk.red("Did not find the following expected Devices: " + expectedDevices.join(", ")));
                console.log("");
			}

            function onSuccess(data, logger = console.log){
                var timeMicroseconds = (microsecondsNow.now() - startTimeMicroseconds);
                if((data.responses === undefined) && (data.errors === undefined) && (data.timeouts === undefined)){
                    logger(util.inspect(data));
                    lastKeyPress = 0;
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
                if(true === profilingConfig.active){
                    if(responses.length){
                        profilingStatistics.numSuccess++;
                        profilingStatistics.timeAvg += timeMicroseconds;
                        if((profilingStatistics.timeMax < timeMicroseconds) || (null === profilingStatistics.timeMax)){
                            profilingStatistics.timeMax = timeMicroseconds;
                        }
                        if((profilingStatistics.timeMin > timeMicroseconds) || (null === profilingStatistics.timeMin)){
                            profilingStatistics.timeMin = timeMicroseconds;
                        }
                        console.log("Success Attempt #" + profilingStatistics.numSuccess + " time elapsed " + (timeMicroseconds/1000) + " ms");
                    }
                    if(errors.length || timeouts.length){
                        profilingStatistics.numFailed++;
                    }

                    var timeoutSettingInMilliSeconds = 2000;
                    switch(profilingConfig.commandKey.name){
                        case 'o': //Force the remote switch to be opened
                        case 't': //Toggle the remote switch
                        case 'c': //Force the remote switch to be closed
                            //Anytime you move the remote contacts there is a built in 10 second timeout before the next attempt can be made.
                            timeoutSettingInMilliSeconds = 10050;
                            break;
                        default:
                            break;
                    }
                    setTimeout(() => {  onTest(); }, timeoutSettingInMilliSeconds);
                }
            }

            function onTest(){
                if((100 > profilingStatistics.numAttempts) && (10 > profilingStatistics.numSuccess)){
                    ++profilingStatistics.numAttempts;
                    startTimeMicroseconds = microsecondsNow.now();
                    executeAction(profilingConfig.commandKey);
                    return;
                }
                switch(profilingConfig.commandKey.name){
                    case 'r':
                        EMCBs.setBargraphLEDToUserDefinedColor(false).then(onSuccess).catch(onError);
                        break;
                    default:
                        break;
                }
                console.log(profilingStatistics.numAttempts + " Attempts of the " + profilingConfig.commandString + " command");
                console.log("Failed Attempts = " + profilingStatistics.numFailed);
                console.log("Successful Attempts = " + profilingStatistics.numSuccess);
                console.log("Total Time = " + (profilingStatistics.timeAvg/1000) + " ms");
                console.log("Average Time = " + (profilingStatistics.timeAvg/(1000 * profilingStatistics.numSuccess)) + " ms");
                console.log("Max Time = " + (profilingStatistics.timeMax/1000) + " ms");
                console.log("Min Time = " + (profilingStatistics.timeMin/1000) + " ms");
                process.stdout.write("\n\n\n");
                profilingConfig.active = false;
                profilingConfig.commandKey = null;
                profilingConfig.targetDevice = null;
                devicesUnderTest = [];
                profilingConfig.selectionIdx = 0;
                //JSA - Reprint choices
                printDirections();
                return;
            }

            function onError(err){
                onSuccess(err, console.error);
            }

            function printDirections(){
                console.log(chalk.yellow(`Press "esc" to exit`))
                console.log(``)
                console.log(`Which Test would you like to perform the UDP Analysis on?`);
                console.log(`Press "o" to open all EMCBs, "c" to close, or "t" to toggle.`);
                console.log(`Press "r" to cycle the bargraph LEDs on all breakers through the ${chalk.red("r")}${chalk.keyword("orange")("a")}${chalk.yellow("i")}${chalk.green("n")}${chalk.blue("b")}${chalk.keyword("violet")("o")}${chalk.keyword("indigo")("w")}.`);
                console.log(`Press "s" to Get Device Status (Breaker Feedback and Metering).`);
                console.log(`Press "f" to Get Breaker Feedback Status.`);
                console.log(`Press "m" to Get Meter Data.`);    
                console.log(``)
                console.log(`To identify local devices on the network used the following commands:`);
                console.log(`Press "d" to Discover Devices and match their bargraph LEDs to the logged colors.`);
                console.log(`Press "i" to identify individual Devices (log their ID's and shine their bargraph color to match terminal for 10 seconds).`);
                console.log(``)
                console.log(chalk.yellow(`Press "ctrl+c" to kill process...`));
            }

            function executeAction(key){
                if(key.name === 'o'){   // open
                    profilingConfig.commandString = "EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN";
                    profilingConfig.targetDevice.setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN, 1).then(onSuccess).catch(onError);
                }
    
                else if(key.name === 'c'){  // close
                    profilingConfig.commandString = "EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED";
                    profilingConfig.targetDevice.setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED, 1).then(onSuccess).catch(onError);
                }
    
                else if(key.name === 't'){ // toggle
                    profilingConfig.commandString = "EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE";
                    profilingConfig.targetDevice.setBreakerState(EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE, 1).then(onSuccess).catch(onError);
                }

                else if(key.name === 'd'){ // discover
                    var colorize = function(){
                        // Set the bargraph to the same color as what we are logging for 10 seconds!
                        for(var ipAddress in EMCBs.devices){
                            var device = EMCBs.devices[ipAddress];
                            device.setBargraphLEDToUserDefinedColorName(device.chalkColor, 10, false).catch(onError);
                        }
                    };
                    profilingConfig.commandString = "discoverDevices";
                    EMCBs.discoverDevices().then(devices => {
                        var coloredDeviceArray = [];
                        for(var ipAddress in devices){
                            coloredDeviceArray.push(chalk[devices[ipAddress].chalkColor](devices[ipAddress].idDevice + " (" + ipAddress + ")"));
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
                        if(EMCBs.devices[a].idDevice < EMCBs.devices[b].idDevice){
                            return -1;
                        }
                        else if(EMCBs.devices[a].idDevice > EMCBs.devices[b].idDevice){
                            return 1;
                        }
                        else{
                            throw new Error("How do we have 2 of the same deviceID === " + EMCBs.devices[a].idDevice);
                        }
                    });

                    profilingConfig.commandString = "Identify Device";
                    // Turn the bargraph to the same color as what we are logging for 10 seconds for a specific device!
                    var device = EMCBs.devices[ipAddresses[identifyIdx % ipAddresses.length]];

                    console.log(chalk[device.chalkColor](`Identifying Device ${device.idDevice} (${device.ipAddress}) using color ${device.chalkColor}`));

                    device.setBargraphLEDToUserDefinedColorName(device.chalkColor, 10, false).catch(onError);
                    identifyIdx++;
                }

                else if(key.name === 'r') { // Rainbow
                    profilingConfig.commandString = "setBargraphLEDToUserDefinedColor";
                    var colorObj = new Array(5);

                    var color = rainbowColors[rainbowIdx];
                    color.blinking = false;

                    colorObj.fill(color, 1, 4);

                    console.log("Setting color to " + chalk.keyword(rainbowColorNames[rainbowIdx])(rainbowColorNames[rainbowIdx] == "white" ? "Normal Operation" : rainbowColorNames[rainbowIdx]));
                    profilingConfig.targetDevice.setBargraphLEDToUserDefinedColor(rainbowIdx === rainbowColors.length-1 ? false : true, colorObj, 0).then(onSuccess).catch(onError);

                    rainbowIdx = (rainbowIdx+1) % rainbowColors.length;    // Start with red to make a proper rainbow!
                }

                else if(key.name === 's'){  // status
                    profilingConfig.commandString = "getDeviceStatus";
                    profilingConfig.targetDevice.getDeviceStatus().then(onSuccess).catch(onError);
                }

                else if(key.name === 'f') { // feedback state
                    profilingConfig.commandString = "getBreakerRemoteHandlePosition";
                    profilingConfig.targetDevice.getBreakerRemoteHandlePosition().then(onSuccess).catch(onError);
                }

                else if(key.name === 'm'){ // getMeterData
                    profilingConfig.commandString = "getMeterData";
                    profilingConfig.targetDevice.getMeterData().then(onSuccess).catch(onError);
                }

                else if(key.name === 'g'){ // getNextSequenceNumber
                    profilingConfig.commandString = "getNextSequenceNumber";
                    profilingConfig.targetDevice.getNextSequenceNumber().then(onSuccess).catch(onError);
                }

                else
                {
                    profilingConfig.commandString = "UNDEFINED"; 
                    profilingConfig.commandKey = null;
                }
            }

            readline.emitKeypressEvents(process.stdin);
            process.stdin.setRawMode(true);

            process.stdin.on('keypress', (str, key) => {
                if (key.ctrl && (key.name === 'c')) {
                    console.log("Terminating interactive application");
                    exitProcess();
                } else if (key.name === 'escape') {
                    exitProcess();
                } else {

                    if(profilingConfig.active === true){
                        console.log("A test run is currently active. Please wait for the run to completed before sending another command.");
                    }

                    else if (profilingConfig.commandKey == null){
                        switch(key.name){
                            case 'o':
                            case 'c':
                            case 't':
                            case 'r':
                            case 's':
                            case 'f':
                            case 'm':
                                profilingConfig.commandKey = key;
                                //JSA - If there is only one device just select it and perform the test
                                if(Object.keys(EMCBs.devices).length == 1){
                                    for(var ipAddress in EMCBs.devices){
                                        profilingConfig.targetDevice = EMCBs.devices[ipAddress];
                                    }    
                                }

                                else if(Object.keys(EMCBs.devices).length == 0){
                                    throw new Error("No devices found when selecting an UDP test!");
                                }
                                

                                else{
                                    console.log("Please select a device to test:");
                                    var count = 1;
                                    for(var ipAddress in EMCBs.devices){
                                        devicesUnderTest.push({idDevice: EMCBs.devices[ipAddress].idDevice , ipAddress: ipAddress});
                                        process.stdout.write(`[${count}]: ${EMCBs.devices[ipAddress].idDevice} (${ipAddress})\n`);
                                        count++;
                                    }
                                }
                                break;
                            case 'd':
                            case 'i':
                                //JSA - This is not a UDP test command these are for device discovery and/or identification.
                                executeAction(key);
                                break;
                            default:
                                break;
                        }
                    }

                    else if(profilingConfig.targetDevice == null){
                        //console.log("key.name " + key.name);
                        if(key.name != "return"){
                            switch(key.name){
                                case "backspace":
                                    process.stdout.write("\b \b");
                                    profilingConfig.selectionIdx = profilingConfig.selectionIdx.slice(0, -1);
                                    break;
                                case "delete":
                                    process.stdout.clearLine();
                                    process.stdout.cursorTo(0); 
                                    profilingConfig.selectionIdx = 0;
                                    break;
                                case '1':
                                case '2':
                                case '3':
                                case '4':
                                case '5':
                                case '6':
                                case '7':
                                case '8':
                                case '9':
                                    profilingConfig.selectionIdx += key.name;
                                    process.stdout.write(key.name);
                                    break;
                                case '0':
                                    if(profilingConfig.selectionIdx != 0){
                                        profilingConfig.selectionIdx += key.name;
                                        process.stdout.write(key.name);
                                    }
                                    break;
                                default:
                                    break;
                            }
                        }

                        else if(profilingConfig.selectionIdx != 0){
                            var selectionIndex = parseInt(profilingConfig.selectionIdx);
                            //Array is zero based
                            selectionIndex -= 1;
                            process.stdout.write('\n');
                            //var count = 1;
                            console.log("Number selection " + profilingConfig.selectionIdx +"\ndutIPAddress count " + devicesUnderTest.length + "\ndutIPAddress " + devicesUnderTest[selectionIndex]);
                            if(selectionIndex <=  devicesUnderTest.length){
                                profilingConfig.targetDevice = EMCBs.devices[devicesUnderTest[selectionIndex].ipAddress];
                            }
                            
                            if(profilingConfig.targetDevice == null){
                                profilingConfig.selectionIdx = 0;
                                console.log("\nERROR:  Invalid selection!!\nPlease select a device to test:");
                                var count = 1;
                                for(var index in devicesUnderTest.length){
                                    process.stdout.write(count + ": " + devicesUnderTest[index].idDevice + " (" + devicesUnderTest[index].ipAddress + ")\n");
                                    count++;
                                }   
                            }                            
                        }
                    }

                    else{
                        console.log("\nERROR:  Coding Error we should not be here!");
                    }

                    if((profilingConfig.commandKey != null) && (profilingConfig.targetDevice != null) && (profilingConfig.active == false)){
                        console.log("Run Selected '"+ profilingConfig.commandKey.name + "' UDP Test!");
                        profilingStatistics.numAttempts = 0;
                        profilingStatistics.numFailed = 0;
                        profilingStatistics.numSuccess = 0;
                        profilingStatistics.timeAvg = 0;
                        profilingStatistics.timeMax = null;
                        profilingStatistics.timeMin = null;
                        profilingConfig.active = true;
                        setTimeout(() => { onTest(); }, 1000);    
                    }
                }
            });

            printDirections();
        })  
        .catch(err => {
            discoverDevicesErrorLogger(err);
            logger.info("Retrying Device Discovery in 5 seconds")
            setTimeout(() => {
                runExample()
            }, 5000)
        });
}

runExample();