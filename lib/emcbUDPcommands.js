const logger            = require("winston");
const chalk             = require('chalk');
const crypto            = require('crypto');
const ip				= require('ip')
const namedColors       = require('color-name-list');

namedColors.push({name: "Gray",          hex: "#808080"})

namedColors.push({name: "redBright",     hex: "#FF0000"})
namedColors.push({name: "greenBright",   hex: "#00FF00"})
namedColors.push({name: "yellowBright",  hex: "#FFFF00"})
namedColors.push({name: "blueBright",    hex: "#0000FF"})
namedColors.push({name: "magentaBright", hex: "#FF00FF"})
namedColors.push({name: "cyanBright",    hex: "#00FFFF"})

namedColors.push({name: "bgRed",     hex: "#FF0000"})
namedColors.push({name: "bgGreen",   hex: "#00FF00"})
namedColors.push({name: "bgYellow",  hex: "#FFFF00"})
namedColors.push({name: "bgBlue",    hex: "#0000FF"})
namedColors.push({name: "bgMagenta", hex: "#FF00FF"})
namedColors.push({name: "bgCyan",    hex: "#00FFFF"})
namedColors.push({name: "bgWhite",   hex: "#FFFFFF"})

const {
    // GET Message Codes
    EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER,
    EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS,
    EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION,
    EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA,
    EMCB_UDP_MESSAGE_CODE_GET_EVSE_APPLIED_CONTROL_SETTINGS,
    EMCB_UDP_MESSAGE_CODE_GET_EVSE_DEVICE_STATE,
    EMCB_UDP_MESSAGE_CODE_GET_EVSE_CONFIG_SETTINGS,
    
    // SET Message Codes
	EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER,
	EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION,
	EMCB_UDP_MESSAGE_CODE_SET_METER_MODE,
    EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED,
    EMCB_UDP_MESSAGE_CODE_SET_EVSE_CONFIG_SETTINGS,

    // Enums
    EMCB_UDP_ACK,

    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED,
	EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE,

	EMCB_UDP_METER_MODE_NORMAL,
	EMCB_UDP_METER_MODE_CONTINUOUS_WAVEFORM

} = require('./emcbUDPconstants.js')


// These are shared functions across our broadcast Master and individual device slaves

function sendWithRetryHelper(command, commandArgs, maxAttempts, attempts, fulfill, reject){
    return command.apply(this, commandArgs)
                .then(fulfill)
                .catch((err) => {
                    console.verbose(err)
                    if(++attempts < maxAttempts){
                        logger.verbose("_sendWithRetries attempt " + attempts + "/" + maxAttempts + " failed with error.  Retrying")
                        //TODO: Keep up with all of these promises so that we can parse through ALL of the responses and decide if commands were successful or failed
                        return sendWithRetryHelper.call(this, command, commandArgs, maxAttempts, attempts, fulfill, reject)     // This is basically an async loop that will eventually break
                    } else {
                        // For now we are only returning the last error //TODO: Investigate if it makes sense to return an array of errors
                        return reject(err)
                    }
                })
}

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        red:    parseInt(result[1], 16),
        green:  parseInt(result[2], 16),
        blue:   parseInt(result[3], 16)
    } : null;
}

// Our "this" will get set to the appropriate EmcbUDPbroadcastMaster or EmcbUDPdeviceMaster with a .bind for each scoped command.
// We create the "self" variable so that commands can get access to the other commands in this file if they need to.
var self = {
    getNextSequenceNumber: function(nonce) {
        if(nonce === undefined) nonce = crypto.randomBytes(4)
        if(nonce.length != 4) throw "Nonce must be exactly 4 bytes long"
        return this.send(EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER, nonce, this.ipAddress, this.udpKey, 0x00000000, Number.MAX_SAFE_INTEGER)
    },

    validateNextSequenceNumber: function(nonce) {
        if(nonce === undefined) nonce = crypto.randomBytes(4)
        if(nonce.length != 4) throw "Nonce must be exactly 4 bytes long"
        return this.send(EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER, nonce, this.ipAddress, this.udpKey)
    },

    getBreakerRemoteHandlePosition: function() {
        // needs some extra time for the response since it won't be sent until after the contact position has been updated
        return this.send(EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION, Buffer.alloc(0), this.ipAddress, this.udpKey, undefined, undefined, 1000)
    },

    getMeterData: function() {
        return this.send(EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA, Buffer.alloc(0), this.ipAddress, this.udpKey)
    },

    //TODO: We probably want a single API command that returns everything in one fell swoop
    getDeviceStatus: function() {
        return this.send(EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS, Buffer.alloc(0), this.ipAddress, this.udpKey)
    },

    getEvseAppliedControlSettings: function(){
        return this.send(EMCB_UDP_MESSAGE_CODE_GET_EVSE_APPLIED_CONTROL_SETTINGS, Buffer.alloc(0), this.ipAddress, this.udpKey)
    },

    getEvseDeviceState: function() {
        return this.send(EMCB_UDP_MESSAGE_CODE_GET_EVSE_DEVICE_STATE, Buffer.alloc(0), this.ipAddress, this.udpKey)
    },

    getEvseConfigSettingsAndMode: function() {
        return this.send(EMCB_UDP_MESSAGE_CODE_GET_EVSE_CONFIG_SETTINGS, Buffer.alloc(0), this.ipAddress, this.udpKey)
    },

    patchEvseConfigSettingsAndMode: function(options) {

        var mode = 0xff;
        var enabled = 0xff;
        var offlineMode = 0xff;
        var maxCurrent = 0xff;
        var maxEnergy = 0xffffffff;

        if ("mode" in options && options.mode != null){
            var modes = {
                "no-restrictions" : 1,
                "cloud-api" : 4,
                "charge-windows" : 5,
                "api-override-enable" : 6,
                "api-override-disable" : 7,
            }

            if (options.mode in modes){
                mode = modes[options.mode];
            }
            else{
                throw new Error("mode '" + options.mode + "' is not available");
            }
        }

        if ("offlineMode" in options && options.offlineMode != null){
            var offlineModes = {
                "no-restrictions" : 1,
                "no-change" : 2
            }

            if (options.offlineMode in offlineModes){
                offlineMode = offlineModes[options.offlineMode];
            }
            else{
                throw new Error("offlineMode '" + options.offlineMode + "' is not available");
            }
        }

        if ("apiConfiguration" in options && options.apiConfiguration != null ){

            var config = options.apiConfiguration;

            if ("enabled" in config && config.enabled != null){
                var en = config.enabled;
                if (en == true || en == false){
                    enabled = en;
                }
                else{
                    throw new Error("apiConfiguration.enabled must be a boolean but got: " + en);
                }
            }

            if ("restrictions" in config && config.restrictions != null){
                var restrictions = config.restrictions;

                if ("maxCurrent" in restrictions && restrictions.maxCurrent != null){
                    var maxC = restrictions.maxCurrent;
                    if (maxC == 0 || (maxC >= 6 && maxC <= 32)){
                        maxCurrent = maxC;
                    }
                    else{
                        throw new Error("apiConfiguration.restrictions.maxCurrent must be 0 (to clear) or between 6 and 32 (amps, inclusive) but got: " + maxC);
                    }
                }

                if ("maxEnergy" in restrictions && restrictions.maxEnergy != null){
                    var maxE = restrictions.maxEnergy;
                    if (maxE >= 0 && maxE <= 200000){
                        maxEnergy = maxE;
                    }
                    else{
                        throw new Error("apiConfiguration.restrictions.maxEnergy must be 0 (to clear) or between 1 and 200000 (watts, inclusive) but got: " + maxE);
                    }
                }
            }
        }

        var buf = Buffer.alloc(8);
        buf.writeUInt8(mode, 0);
        buf.writeUInt8(offlineMode, 1);
        buf.writeUInt8(enabled, 2);
        buf.writeUInt8(maxCurrent, 3);
        buf.writeUInt32LE(maxEnergy, 4);

        // needs some extra time for the response since it won't be sent until after the settings have been saved on device
        return this.send(EMCB_UDP_MESSAGE_CODE_SET_EVSE_CONFIG_SETTINGS, buf, this.ipAddress, this.udpKey, undefined, undefined, 5000)
                    .then(self.rejectOnTimeoutOrNonACK.bind(this))
    },

    setNextSequenceNumber: function(desiredNextSequenceNumber) {
        if(desiredNextSequenceNumber === undefined) throw new Error("desiredNextSequenceNumber === undefined")

        var buf = Buffer.alloc(4);
        buf.writeUInt32LE((desiredNextSequenceNumber & 0xFFFFFFFF) >>> 0)   //node.js is weird about signed values and bitwise math - see https://stackoverflow.com/questions/6798111/bitwise-operations-on-32-bit-unsigned-ints/6798829#6798829
        return this.send(EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER, buf, this.ipAddress, this.udpKey)
                    .then(self.rejectOnTimeoutOrNonACK.bind(this))
	},

    setBreakerState: function(desiredState){
        var validDesiredStates = [
			EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN,
			EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED,
			EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE
		]

        if(!validDesiredStates.includes(desiredState))
            throw new Error("desiredState === " + desiredState + ", not one of [" + validDesiredStates.join(", ") + "]")

        var buf = Buffer.alloc(1);
        buf[0] = desiredState;

        return this.send(EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION, buf, this.ipAddress, this.udpKey)
                   .then(self.rejectOnTimeoutOrNonACK.bind(this))   // "this" is going to be bound by an external bind, so we use "self" (the object that we are storing this function reference in) when referencing another command function
	},

	setMeterMode: function(desiredMode, ipAddress){
		var validDesiredModes = [
			EMCB_UDP_METER_MODE_NORMAL,
			EMCB_UDP_METER_MODE_CONTINUOUS_WAVEFORM
		]

        if(!validDesiredModes.includes(desiredMode))
            throw new Error("desiredState === " + desiredMode + ", not one of [" + validDesiredModes.join(", ") + "]")

        var buf = Buffer.alloc(5);
		buf[0] = desiredMode;
		ip.toBuffer(ipAddress, buf, 1)

        return this.send(EMCB_UDP_MESSAGE_CODE_SET_METER_MODE, buf, this.ipAddress, this.udpKey)
                   .then(self.rejectOnTimeoutOrNonACK.bind(this))   // "this" is going to be bound by an external bind, so we use "self" (the object that we are storing this function reference in) when referencing another command function

	},

    // var colorObj = new Array(5)
    // colorObj.fill({red: 0, green: 0, blue: 255, blinking: 0})
    setBargraphLEDToUserDefinedColor(enabled, colorObj, duration){
        var buf = Buffer.alloc(25);

        if(duration && (duration < 0 || duration > 10737418)){
            throw new Error(`Invalid Duration = ${duration}`)
        }

        buf[0] = enabled ? 1 : 0
        buf.writeInt32LE(duration == undefined ? 5 : duration, 1) // Default to leave it on for 5 seconds.  Pass in 0 for forever

        colorObj = colorObj === undefined ? new Array(5) : colorObj;

        // LED 0
        colorObj[0] = colorObj[0] ? colorObj[0] : {red: 0, green: 0, blue: 0, blinking: 0}
        buf[5] = (colorObj[0].red   || 0) & 0xFF
        buf[6] = (colorObj[0].green || 0) & 0xFF
        buf[7] = (colorObj[0].blue  || 0) & 0xFF
        buf[8] = colorObj[0].blinking ? 1 : 0

        // LED 1
        colorObj[1] = colorObj[1] ? colorObj[1] : {red: 0, green: 0, blue: 0, blinking: 0}
        buf[9]  = (colorObj[1].red   || 0) & 0xFF
        buf[10] = (colorObj[1].green || 0) & 0xFF
        buf[11] = (colorObj[1].blue  || 0) & 0xFF
        buf[12] = colorObj[1].blinking ? 1 : 0

        // LED 2
        colorObj[2] = colorObj[2] ? colorObj[2] : {red: 0, green: 0, blue: 0, blinking: 0}
        buf[13] = (colorObj[2].red   || 0) & 0xFF
        buf[14] = (colorObj[2].green || 0) & 0xFF
        buf[15] = (colorObj[2].blue  || 0) & 0xFF
        buf[16] = colorObj[2].blinking ? 1 : 0

        // LED 3
        colorObj[3] = colorObj[3] ? colorObj[3] : {red: 0, green: 0, blue: 0, blinking: 0}
        buf[17] = (colorObj[3].red   || 0) & 0xFF
        buf[18] = (colorObj[3].green || 0) & 0xFF
        buf[19] = (colorObj[3].blue  || 0) & 0xFF
        buf[20] = colorObj[3].blinking ? 1 : 0

        // LED 4
        colorObj[4] = colorObj[4] ? colorObj[4] : {red: 0, green: 0, blue: 0, blinking: 0}
        buf[21] = (colorObj[4].red   || 0) & 0xFF
        buf[22] = (colorObj[4].green || 0) & 0xFF
        buf[23] = (colorObj[4].blue  || 0) & 0xFF
        buf[24] = colorObj[4].blinking ? 1 : 0

        return this.send(EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED, buf, this.ipAddress, this.udpKey)
                   .then(self.rejectOnTimeoutOrNonACK.bind(this))   // "this" is going to be bound by an external bind, so we use "self" (the object that we are storing this function reference in) when referencing another command function
    },

    setBargraphLEDToUserDefinedColorName: function(colorName, duration, blinking){
        var color = this.chalkColor || "reset"

        logger.debug(chalk[color]("Setting Bargraph LED to " + colorName + " for " + duration + " seconds with Blinking = " + blinking))

        if(color === "off" || color === "clear" || color === "reset"){
            return this.setBargraphLEDToUserDefinedColor(false)
        }

        var colorObj = new Array(5)

        var color = hexToRgb(namedColors.find(color => color.name.toLowerCase() === colorName.toLowerCase()).hex) || {red: 0, green: 0, blue: 0}
        color.blinking = blinking

        color.red = color.red
        color.blue = color.blue
        color.green = color.green

        colorObj.fill(color)

        return this.setBargraphLEDToUserDefinedColor(true, colorObj, duration)
    },

    // This wrapper allows you to extend any method to support async retries.  Look at EMCBudpDeviceMaster.setBreakerState for an example of how to use
    // Basically, this will recall the method that called it up to maxAttempts times with the arguments provide by the original function
    sendWithRetries: function(command, commandArgs, maxAttempts){
        return new Promise((fulfill, reject) => {
            maxAttempts = maxAttempts || 3;
            if(typeof maxAttempts !== "number" || maxAttempts < 1 || maxAttempts > 10) throw new Error("Invalid maxAttempts = " + maxAttempts)
            return sendWithRetryHelper.call(this, command, commandArgs, maxAttempts & 0xA, 0, fulfill, reject)  //Restrict to 10 retries
        })
    },

    rejectOnTimeoutOrNonACK:  function(data) {
        // For certain commands, if someone times out or responds with something other than an ack, then we should reject so that an outside caller can try again
        // This is assuming that you are trying to keep all breaker sequence numbers in sync.

        // if(this.master === undefined && Object.keys(data.responses).length !== Object.keys(this.devices).length)
        if(data.timeouts)
            return Promise.reject(data)

        for(var ipAddress in data.responses){
            if(data.responses[ipAddress].ack !== EMCB_UDP_ACK)
                return Promise.reject(data)
        }

        return data
    }
}

module.exports = self

