'use strict';
const logger            = require("./logger.js")   // Sets up our Winston "Default" Logger as the starting point
const emcbUDPutils      = require('./emcbUDPutils.js');
const emcbUDPcommands   = require('./emcbUDPcommands.js')

const EventEmitter      = require('events');
const crypto            = require('crypto');
const chalk             = require('chalk');
const util              = require('util');

const {
    // GET Message Codes
    EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER,
    EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS,
    EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION,
    EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA,

    // SET Message Codes
    EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER,
    EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION,
    EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED,

    // Integer Message Codes to strings
    EMCB_UDP_MESSAGE_CODES,

    // Enums / Parsed Data Constant
    EMCB_UDP_ACK,

    // Events
    EMCB_UDP_EVENT_DEVICE_DISCOVERED,

    // Others
    EMCB_UDP_DEVICE_COLORS

} = require('./emcbUDPconstants.js')


class EmcbUDPdeviceMaster extends EventEmitter {    // Any of our message codes and any EMCB_UDP_EVENT_* constants can be .on'd.

    constructor(args){
		super();

        if(args.udpKey == undefined){
			logger.warn("No udpKey provided for discovered device " + args.idDevice + " at IP address " + args.ipAddress + " in EmcbUDPdeviceMaster constructor")
			return
        }

        this.master             = args.master

        this.ipAddress          = args.ipAddress;
        this.port               = args.port;

        this.udpKey             = args.udpKey;     // UDP Key for signing / validating all messages

        this.chalkColor         = args.chalkColor || EMCB_UDP_DEVICE_COLORS[Object.keys(this.master.devices).length % EMCB_UDP_DEVICE_COLORS.length];

        this.idDevice           = args.idDevice;
        this.remoteHandlePosition
        this.meterData

        this._sequenceNumber    = args.sequenceNumber || crypto.randomBytes(4).readUInt32LE(0); // Our "Next" Sequence Number that we plan to use when interacting with this device - although we allow it to be passed in, we are assuming that our Sequence number is going to be set as a part of the devices discovery process, using the getNextSequenceNumber Broadcast command and the [EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER]: response handler below

        this.consecutiveErrorsAndTimeouts = 0;

        this.lastMessageSendTime = (new Date()).getTime()

        this.activeMessage   = undefined	// Hold an activeMessage for unicast messages as a flag for the broadcast master to use

        //Setup all of our shared functions
        this._sendWithRetries                     = emcbUDPcommands.sendWithRetries.bind(this)

        this.getNextSequenceNumber                = emcbUDPcommands.getNextSequenceNumber.bind(this)
        this.validateNextSequenceNumber           = emcbUDPcommands.validateNextSequenceNumber.bind(this)
        this.getDeviceDebugData                   = emcbUDPcommands.getDeviceDebugData.bind(this)
        this.getBreakerRemoteHandlePosition       = emcbUDPcommands.getBreakerRemoteHandlePosition.bind(this)
        this.getMeterData                         = emcbUDPcommands.getMeterData.bind(this)
        this.getDeviceStatus                      = emcbUDPcommands.getDeviceStatus.bind(this)
		// this.setNextSequenceNumber                = emcbUDPcommands.setNextSequenceNumber.bind(this)       // For individual devices, we support retries on these commands so there is some goofy wrapping below
		this.setCloudLogging					  = emcbUDPcommands.setCloudLogging.bind(this)
        // this.setBreakerState                      = emcbUDPcommands.setBreakerState.bind(this)             // For individual devices, we support retries on these commands so there is some goofy wrapping below
		this.setMeterMode					  	  = emcbUDPcommands.setMeterMode.bind(this)
		this.setBargraphLEDToUserDefinedColor     = emcbUDPcommands.setBargraphLEDToUserDefinedColor.bind(this)
        this.setBargraphLEDToUserDefinedColorName = emcbUDPcommands.setBargraphLEDToUserDefinedColorName.bind(this)

        this.getEvseAppliedControlSettings        = emcbUDPcommands.getEvseAppliedControlSettings.bind(this)
        this.getEvseDeviceState                   = emcbUDPcommands.getEvseDeviceState.bind(this)
        this.getEvseConfigSettingsAndMode         = emcbUDPcommands.getEvseConfigSettingsAndMode.bind(this)
        this.patchEvseConfigSettingsAndMode       = emcbUDPcommands.patchEvseConfigSettingsAndMode.bind(this)

        this.useMasterSequenceNumber = false

        // There is probably a better way to do this, but in the current design, when EmcbUDPbroadcastMaster.createDevice calls this, the below code will automatically call setNextSequenceNumber
        // EmcbUDPbroadcastMaster.createDevice will then call getNextSequenceNumber (if unicastGetNextSequenceNumber is true), 
        // this means we have to wait for the first setNextSequenceNumber to timeout before we can send getNextSequenceNumber.
        // Instead we can use autoGetAndSetSeqNum to signal this class to call the get before calling the set
        // I'm not really sure why we even pass in args.sequenceNumber when we know it won't be valid, but maybe it makes sense for broadcast, so I don't want to make any breaking changes. 
        if (this.udpKey && args.autoGetAndSetSeqNum){
            this.getNextSequenceNumber()
        }

        // Set our Sequence Number to align to our master
        if(args.sequenceNumber || args.autoGetAndSetSeqNum){
            this.setNextSequenceNumber(args.sequenceNumber, 3)
                .then(data => {
                    logger.verbose(chalk[this.chalkColor]("---------------------------------" + this.idDevice + " Initialized ----------------------------"))
                    this.useMasterSequenceNumber = true;
                    this.emit(EMCB_UDP_EVENT_DEVICE_DISCOVERED, {device: this})
                })
                .catch(err => {
                    //TODO: In a lot of cases when we see this log, we do actually have a correct sequence number - the packet that held the response just was lost.  Really we should unicast read the Sequence number and see if it is sycnced with the master before giving up...
                    logger.warn(chalk[this.chalkColor]("----------" + this.idDevice + " Unable to confirm correctly setting Sequence Number in instantiation ----------------"))
                    logger.warn(chalk[this.chalkColor](util.inspect(err)))
                    this.emit(EMCB_UDP_EVENT_DEVICE_DISCOVERED, {device: this})
                })
        }

        //onQueueDrained() will be called after these initialization commands are ran

    }

    setNextSequenceNumber(desiredNextSequenceNumber, maxAttempts){    // Don't use ...attempts unless you are the retrySend function!!!
        return this._sendWithRetries(emcbUDPcommands.setNextSequenceNumber, [desiredNextSequenceNumber], maxAttempts)
    }

    // desiredState = [EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN, EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED, EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE]
    setBreakerState(desiredState, maxAttempts){
        return this._sendWithRetries(emcbUDPcommands.setBreakerState, [desiredState], maxAttempts)
    }

    send(messageCode, messageData, ipAddress, udpKey, sequenceNumberOverride, expectedNumResponses=1, timeoutMs){
        return this.master.send(
            messageCode,
            messageData,
            this.ipAddress, // We maintain function definition compatibility with EmcbUDPbroadcastMaster, but we don't want this send being used for any arbitrary IP address, so we force it to the right thing here
            this.udpKey,    // We maintain function definition compatibility with EmcbUDPbroadcastMaster, but we don't want this send being used for any arbitrary IP address, so we force it to the right thing here
            sequenceNumberOverride === undefined ? this._getNextSequenceNumber.bind(this) : sequenceNumberOverride,
            expectedNumResponses,
            timeoutMs
        )
    }

    toString(){
        return this.idDevice.toString()
    }

    _getNextSequenceNumber(){
        if(this.useMasterSequenceNumber === true) return undefined

        this._sequenceNumber = emcbUDPutils.incrementSequenceNumber(this._sequenceNumber)
        return this._sequenceNumber
    }

    _emit(messageCode, parsedData){
        setImmediate(function(){
            this.emit(messageCode, parsedData);
        }.bind(this))

        setImmediate(function(){
            this.master.emit(messageCode, parsedData);
        }.bind(this))
    }

    // These instance "on" functions are used in case we need to do something within the class based on the parsedData response
    [EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER](parsedData){
        logger.debug(chalk[this.chalkColor](`Setting instance sequence number to 0x${parsedData.nextSequenceNumber.toString(16).toUpperCase()} = ${parsedData.nextSequenceNumber}`))
        this._sequenceNumber = parsedData.nextSequenceNumber;
        this._emit(EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER, parsedData)
    }


    [EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS](parsedData){
        var dirty = false

        if(this[EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION](Object.assign({"device": parsedData.device}, parsedData.breaker)) === true) dirty = true  // Don't lose the device object, but do lose the data that these events don't care about
        if(this[EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA](Object.assign({"device": parsedData.device}, parsedData.meter)) === true) dirty = true

        if(dirty){
            this._emit(EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS, parsedData)
        }
    }

    [EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION](parsedData){
        if(this.remoteHandlePosition !== parsedData.state){
            logger.verbose(chalk[this.chalkColor](`Breaker Feedback Position changed from ${this.remoteHandlePosition} to ${parsedData.state}`))

            parsedData.lastState = this.remoteHandlePosition
            this.remoteHandlePosition = parsedData.state

            // Only emit events on something changing
            this._emit(EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION, parsedData)

            return true
        }

    }

    [EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA](parsedData){
        if(this.meterData === undefined || parsedData.updateNum != this.meterData.updateNum){
            // Meter data has changed!  Emit an event
            this.meterData = parsedData
            this._emit(EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA, parsedData)

            return true
        }
    }

    [EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER](parsedData){
        if(parsedData.nextSequenceNumber){
            logger.debug(chalk[this.chalkColor](`Setting instance sequence number to 0x${parsedData.nextSequenceNumber.toString(16).toUpperCase()} = ${parsedData.nextSequenceNumber}`))
            this._sequenceNumber = parsedData.nextSequenceNumber;
            this._emit(EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER, parsedData)
        } else {
            // logger.warn(chalk[this.chalkColor](`Setting next Sequence Number failed - ${parsedData.ackString}`));
            return new Error(`${EMCB_UDP_MESSAGE_CODES[EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER]} failed - got ack response ${parsedData.ack}`)
        }

    }

    [EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION](parsedData){
        this[EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION](parsedData)   // Update our internal feedback position based on the response data

        if(parsedData.ack !== EMCB_UDP_ACK){
            // logger.warn(chalk[this.chalkColor](`${EMCB_UDP_MESSAGE_CODES[EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION]} failed - got ack response ${parsedData.ack}`))
            return new Error(`${EMCB_UDP_MESSAGE_CODES[EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION]} failed - got ack response ${parsedData.ack}`)
        }

        this._emit(EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION, parsedData)
    }

    [EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED](parsedData){
        if(parsedData.ack !== EMCB_UDP_ACK){
        }

        if(parsedData.ack !== EMCB_UDP_ACK){
            // logger.warn(chalk[this.chalkColor](`${EMCB_UDP_MESSAGE_CODES[EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED]} failed - got ack response ${parsedData.ack}`))
            return new Error(`${EMCB_UDP_MESSAGE_CODES[EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED]} failed - got ack response ${parsedData.ack}`)
        }

        this._emit(EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED, parsedData)
    }
}

module.exports = EmcbUDPdeviceMaster
