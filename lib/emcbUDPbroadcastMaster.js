const logger              = require("./logger.js")   // Sets up our Winston "Default" Logger as the starting point
const emcbUDPutils        = require('./emcbUDPutils.js');
const emcbUDPcommands     = require('./emcbUDPcommands.js')
const EmcbUDPdeviceMaster = require('./emcbUDPdeviceMaster.js');

const EventEmitter        = require('events');
const crypto              = require('crypto');
const dgram               = require('dgram');
const chalk               = require('chalk');
const util                = require('util');
const clonedeep 		  = require('lodash.clonedeep')

const {

    EMCB_UDP_PORT,

    EMCB_UDP_MESSAGE_THROTTLE_TIME_MS,

    EMCB_UDP_LONGEST_IMPLEMENTED_MESSAGE_LENGTH,
    EMCB_UDP_HEADER_START_SLAVE,

    // Integer Message Codes to strings
    EMCB_UDP_MESSAGE_CODES,

    //Errors
    EMCB_UDP_ERROR_TIMEOUT,
    EMCB_UDP_ERROR_PARSER,

    // Events
    EMCB_UDP_EVENT_QUEUE_DRAINED,
    EMCB_UDP_EVENT_DEVICE_DISCOVERED,
    EMCB_UDP_EVENT_DEVICE_REMOVED,
    EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED

} = require('./emcbUDPconstants.js')


class EmcbUDPbroadcastMaster extends EventEmitter {

    constructor(args){
		if(!Buffer.isBuffer(args.broadcastUDPKey) || args.broadcastUDPKey.length != 32){
			logger.warn(util.inspect(new Error(`args.broadcastUDPKey = ${args.broadcastUDPKey} not in the expected format - don't expect to discover any devices until you call updateBroadcastUDPkey!`)))
		}

		super();

        this.ipAddress            = args.broadcastIPAddress  					   // This should be the network broadcast address
        this.port                 = args.port || EMCB_UDP_PORT;

        this.udpKey               = args.broadcastUDPKey;                          // UDP Key for signing / validating all messages
        this.unicastUDPKeys       = args.unicastUDPKeys || {};                     // [DEVICE_ID]: key, unicast keys that will be used after particular device IDs are discovered on the network

        this._sequenceNumber      = args.sequenceNumber || crypto.randomBytes(4).readUInt32LE(0); // Our "Next" Sequence Number that we plan to use when interacting with this device

        // we can only send 1 message at a time to each device. Since broadcast goes to all devices it should be in the sent queue alone
        // _sentQueue = {
        //     192.168.50.1 : msg,
        //     192.168.50.2 : msg,

        //     // or:
        //     this.ipAddress : msg
        // }
        this._sentQueue           = {}
        this._messageQueue        = []              // This queue stores all messages that are to be sent from the master and sends at the rate     //TODO: Right now we have a single messageQueue for both broadcast and unicast devices.  When you have many EMCBs on the network, this architecture becomes very inefficient.  The important thing in our Application Layer is that a single device isn't receiving commands faster than 200ms.  Unicast packets could be fanned out in bulk, greatly improving performance around device discovery and other fan out unicast commands
        this._processQueuesTimer   = undefined
    
        //TODO: Some of these should probably be private?

        this.unhandledMessages    = 0

        this.lastMessageSendTime  = (new Date()).getTime()

        this.devices              = {}   //[ipAddress] = EmcbUDPdeviceMaster instance

        this.udpSocket            = dgram.createSocket("udp4");

        this.messageId             = 0 // this is just to help with debugging

        // Configure our socket for broadcasting
        this.udpSocket.bind(() =>{
            this.udpSocket.setBroadcast(true);
        });

        // This is where all incoming data enters our module.  From here, we parse out the data and determine who all needs to receive it
        this.udpSocket.on('message', this._onPacket.bind(this));

        // Search for new devices every 5 minutes
        setInterval(() => { this.discoverDevices() }, 300000)

        //Setup all of our shared functions
        this.getNextSequenceNumber                = emcbUDPcommands.getNextSequenceNumber.bind(this)
        this.validateNextSequenceNumber           = emcbUDPcommands.validateNextSequenceNumber.bind(this)
        this.getDeviceDebugData                   = emcbUDPcommands.getDeviceDebugData.bind(this)
        this.getDeviceStatus                      = emcbUDPcommands.getDeviceStatus.bind(this)
        this.getBreakerRemoteHandlePosition       = emcbUDPcommands.getBreakerRemoteHandlePosition.bind(this)
        this.getMeterData                         = emcbUDPcommands.getMeterData.bind(this)
        this.getEvseAppliedControlSettings        = emcbUDPcommands.getEvseAppliedControlSettings.bind(this)  
		this.getEvseDeviceState                   = emcbUDPcommands.getEvseDeviceState.bind(this)
		this.getEvseConfigSettingsAndMode         = emcbUDPcommands.getEvseConfigSettingsAndMode.bind(this)
		this.patchEvseConfigSettingsAndMode       = emcbUDPcommands.patchEvseConfigSettingsAndMode.bind(this)

        this.setNextSequenceNumber                = emcbUDPcommands.setNextSequenceNumber.bind(this)
		this.setCloudLogging					  = emcbUDPcommands.setCloudLogging.bind(this)
        // this.setBreakerState                      = emcbUDPcommands.setBreakerState.bind(this)             // For individual devices, we support retries on these commands so there is some goofy wrapping below
		this.setMeterMode					  	  = emcbUDPcommands.setMeterMode.bind(this)
		this.setBargraphLEDToUserDefinedColor     = emcbUDPcommands.setBargraphLEDToUserDefinedColor.bind(this)
        this.setBargraphLEDToUserDefinedColorName = emcbUDPcommands.setBargraphLEDToUserDefinedColorName.bind(this)
		this.getMasterIpAddress				      = emcbUDPutils.getIpAddress;

		this._sendWithRetries                	  = emcbUDPcommands.sendWithRetries.bind(this)

		if(!this.ipAddress){
			logger.debug("No broadcast Address provided to EmcbUDPbroadcastMaster constructor - attempting to set for interface " + (args.ifaceName ? args.ifaceName : "default"))
			emcbUDPutils.getBroadcastAddress(args.ifaceName)
				.then(broadcastAddress => {
					logger.debug("Setting EmcbUDPbroadcastMaster broadcast Address to "+ broadcastAddress)
					this.ipAddress = broadcastAddress
				})

		}
    }

    updateBroadcastUDPkey(key){
        this.udpKey = key
    }

    updateUnicastUDPkey(idDevice, key){
        this.unicastUDPKeys[idDevice] = key

        var unicastDevice = this.getDevice(idDevice)

        if(unicastDevice){
            unicastDevice.udpKey = key;
        }
    }

    getDevice(ipAddressOrIdDevice){
        if(this.devices[ipAddressOrIdDevice]) return this.devices[ipAddressOrIdDevice]

        for(var ipAddress in this.devices){
            if(this.devices[ipAddress].idDevice === ipAddressOrIdDevice)
                return this.devices[ipAddress]
        }
	}

	createDevice(idDevice, ipAddress, unicastGetNextSequenceNumber = true){
		try{
			var existingDevice = this.getDevice(idDevice)

			var newDevice = new EmcbUDPdeviceMaster({
				master          : this,
				idDevice        : idDevice,
				ipAddress       : ipAddress,
				port            : this.port,
				udpKey          : this.unicastUDPKeys[idDevice],
				sequenceNumber  : this._sequenceNumber,
                autoGetAndSetSeqNum : (unicastGetNextSequenceNumber === true)
			})

			if(newDevice.udpKey) {	// If we don't have a udpKey for the device, we won't successfully create one and we don't need to store anything about it
				this.devices[ipAddress] = newDevice

                // We are now calling this inside of EmcbUDPdeviceMaster so that it can be called before setNextSequenceNumber
                // Now we don't have to wait for setNextSequenceNumber to timeout, leading to much faster startup
				// if(unicastGetNextSequenceNumber === true){
				// 	newDevice.getNextSequenceNumber()
				// }

				if(existingDevice){
					delete this.devices[existingDevice.ipAddress]
					this.emit(EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED, {   //TODO: Will this ever get called?  Likely we hit 100 consecutive timeouts, remove the device, and then pick it back up during our next discoverDevices command...  For a device to change IP addresses, it likely has restarted and therefore its sequence number is out of sync...
						oldIPaddress: existingDevice.ipAddress,
						newIPaddress: ipAddress,
						device: this.devices[ipAddress]
					})
				}

				this.devices[ipAddress].on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, data => {
					this.emit(EMCB_UDP_EVENT_DEVICE_DISCOVERED, data)
				})

				return newDevice;

			} else {
				return;
			}


		} catch(ex){
			logger.error(util.inspect(ex))
			return;
		}
	}

    discoverDevices(nonce, count){
        function silentCallback(d){ return d }
        // We send 4 broadcast getNextSequenceNumbers in order to discover devices
        // When each device is discovered, we will create a device instance to grab its sequence number, device id, and get it synced up to our master sequence number

        nonce = nonce || crypto.randomBytes(4)  // This is a bit of a hack in the current implementation to help prevent Error: Sent Nonce 0xe61d068a != received Nonce 0x9e6777b9, which are really glorified timeouts.  //TODO: once we implement better timeout handling, this can go away.

        return this.getNextSequenceNumber(nonce)
                    .then(silentCallback.bind(this))
                    .catch(silentCallback.bind(this))
                    .then(() => {   //es6 needs a finally...
                        count = count || 0

                        // We attempt 3 sequential discoveries on the network
                        if(count < 3){
                            logger.debug("discovering devices again. count: " + count);
                            return this.discoverDevices(nonce, ++count)
                        }
                        else {
                            //TODO: Figure out how to wait for our devices to have their device IDs retreived before we resolve this promise to the outside caller
                            if(Object.keys(this.devices).length > 0){
                                return this.devices
                            } else {
                                throw new Error(EMCB_UDP_ERROR_TIMEOUT + " - No Devices discovered!")
                            }
                        }
                    })
    }

    // This shouldn't have to be called if you are regularly polling devices (consecutiveErrorsAndTimeouts takes care of things) but can be useful if you are not
    syncDeviceSequenceNumbers(){
        var promises = []
        var ipAddresses = []

        // Prevent EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_BAD_SEQUENCE_NUMBER errors
        this._sequenceNumber = emcbUDPutils.incrementSequenceNumber(this._sequenceNumber, 200)

        for(var ipAddress in this.devices){
            var d = this.devices[ipAddress]
            var useMasterSequenceNumber = this.devices[ipAddress].useMasterSequenceNumber
            d.useMasterSequenceNumber = false;  //TODO: THIS IS A BUG - THIS SHOULDN"T HAPPEN UNTIL THE MESSAGE IS PULLED OFF OF THE QUEUE!
            promises.push(d.setNextSequenceNumber(this._sequenceNumber)
                .then(data => {
                    d.useMasterSequenceNumber = true;
                    return data
                })
                .catch(err => {
                    d.useMasterSequenceNumber = useMasterSequenceNumber //Restore it to what it was
                    throw err
                })
            )
            ipAddresses.push(ipAddress)
        }

        //TODO: Make the return format of this function sane
        // function formatResponseGenerator(error){
        //     return function(data){
        //         if(error){
        //             throw retObj
        //         }
        //         for(var k in ipAddresses){
        //             console.log(k)
        //             retObj[ipAddresses[k]] = data[k]
        //         }



        //         return retObj
        //     }
        // }

        return Promise.all(promises)  //.then(formatResponseGenerator()).catch(formatResponseGenerator(true))
    }

    // desiredState = [EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN, EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED, EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE]
    setBreakerState(desiredState, maxAttempts){
        return this._sendWithRetries(emcbUDPcommands.setBreakerState, [desiredState], maxAttempts)
    }

    // The send flow of this class goes something like this:
    //  - send is called and pushes a message onto this._messageQueue.  We have a single queue for both unicast and broadcast messages
    //  - this._processQueues() is called
    //      - if no messages for that ip (or a broadcast message) are already "in flight" then we will send it now, otherwise we have to wait in line
    //      - if there are no messages in our this._messageQueue, we kill the this._processQueuesTimer and call the onQueueDrained callback (if we have it)
    //  - when data comes in, it will hit the shared udpSocket.on('message', ()) callback function, which then forwards to this._onPacket
    //  - We can then do the final validation steps, parse the message, and fulfill our promise / emit any events that we need to (for both the broadcast and relevant unicast masters)!
    send(messageCode, messageData, ipAddress, udpKey, sequenceNumberOverride, expectedNumResponses, timeoutMs=EMCB_UDP_MESSAGE_THROTTLE_TIME_MS){
        return new Promise(function(fulfill, reject){
            this._messageQueue.push({
                "tx": {
                    ipAddress: ipAddress,
                    sequenceNumber: sequenceNumberOverride, // If this is undefined, it will be overriden to the master's internally tracked current value of this._sequenceNumber in _send.  If it is a function, it will be called at the moment we need a fresh sequenceNumber (which is what we use before the EmcbUDPdeviceMasters and individual EMCBs are synced up to the master)
                    messageCode: messageCode,
                    messageData: messageData,
                    udpKey: udpKey,
                    // message: emcbUDPutils.createEMCBudpBuffer(seqNum, messageCode, messageData, this._udpKey)    // This will also be created in _send so that seqNum is the most recent value that it should be
                },
                "fulfill": fulfill,
                "reject": reject,
                "expectedNumResponses": expectedNumResponses || Object.keys(this.devices).length,
                "responses": {},    //[ipAddress]: responseData
                
                "timeoutMs" : timeoutMs, // duration to be used for timeouts
                // expirationTimeMs // used to track what time the message should expire. We don't set it until we send the message
                "id" : this.messageId++
            })

            logger.debug("running _processQueues now because we added a new message to the queue addressed to: " + ipAddress);
            if (this._processQueuesTimer){
                clearTimeout(this._processQueuesTimer);
            }
            this._processQueuesTimer = setTimeout(() => { this._processQueues() }, 0);

        }.bind(this))
    }

    //TODO: Review how to avoid exporting these "private" functions that depend on "this" - unfortunately, all of the "right" ways of doing this are a bit of work...

    _processQueues(){
        logger.debug("running _processQueues with _sentQueue.length: " + Object.keys(this._sentQueue).length + ".  _messageQueue.length: " + Object.keys(this._messageQueue).length);

        // cancel the previous timer so we don't end up with multiple running
        if (this._processQueuesTimer){
            clearTimeout(this._processQueuesTimer);
            this._processQueuesTimer = undefined;
        }

        // deal with expired messages

        var now = (new Date()).getTime();

        var expiredMsgs = Object.values(this._sentQueue).filter(msg => { return now > msg.expirationTimeMs});

        logger.debug(expiredMsgs.length + " message(s) have expired");

        expiredMsgs.forEach(msg => {
            
            var msgIpAddress = msg.tx.ipAddress;
            logger.debug("handling expired message sent to: " + msgIpAddress);

            if (msgIpAddress === this.ipAddress){
                // broadcast
                if(Object.keys(this.devices).length > 0){
                    // it feels weird to call timeout on devices that did respond but it seems to be handled in _handleTimeout so I'll leave it that way for now
                    for(var ipAddress in this.devices){
                        this._handleTimeout(msg, ipAddress)
                    }
                } 
                else {
                    this._handleTimeout(msg, this.ipAddress) // Special case during device discovery where we haven't discovered anything
                }
            }
            else{
                // unicast
                this._handleTimeout(msg, msgIpAddress);
            }
            
            delete this._sentQueue[msg.tx.ipAddress];
        });


        // now see if we can send a new message

        // check if we have any messages to send and if we are blocked by a broadcast message
        if (this._messageQueue.length > 0 && !(this.ipAddress in this._sentQueue)){

            // TODO: turn this into a loop so we can send more than 1 message at a time
            // TODO: do we need to check enforce a 200ms silent period if sending to the same device or was that only a limitation of the previous design?

            var nextMessage = this._messageQueue[0];
            var nextMessageIp = nextMessage.tx.ipAddress;
        
            if (nextMessageIp in this._sentQueue){
                // already sending a message to this device
                logger.debug("alreadying sending a unicast message to " + nextMessageIp);
                // continue;
            }
            else if (nextMessageIp === this.ipAddress && Object.keys(this._sentQueue).length > 0){
                // we can't send a broadcast message at the same time as any other messages, so we just have to wait
                logger.debug("can't send a broadcast message until the _sentQueue is clear");
                // break;
            }
            else{

                logger.debug("sending message to: " + nextMessageIp);

                // message is clear to send
                if (this.devices[nextMessageIp]){
                    this.devices[nextMessageIp].activeMessage = nextMessage;
                }
                
                this._sentQueue[nextMessageIp] = nextMessage;
                this._messageQueue.shift(); // remove first element
                nextMessage.expirationTimeMs = (new Date()).getTime() + nextMessage.timeoutMs;
                this._send(nextMessage);
            }

        }

        // now we need to schedule when to run this timer again

        logger.debug("_sentQueue.length: " + Object.keys(this._sentQueue).length + ".  _messageQueue.length: " + Object.keys(this._messageQueue).length);

        if (Object.keys(this._sentQueue).length === 0){
            // TODO: I don't think it should be possible to have message left over in _messageQueue while _sentQueue is empty, because if it is empty then why didn't it send the messages? 
            // But it would be a good idea to have a path to correct that issue if it does happen
            if (Object.keys(this._messageQueue).length > 0){
                logger.error("_sentQueue is empty but somehow _messageQueue is not empty");
            }
            
            if (Object.keys(this.devices).length > 0) {
                setImmediate(function(){ this.emit(EMCB_UDP_EVENT_QUEUE_DRAINED) }.bind(this)) // Let someone outside know that our send queue is now empty
            }
            logger.debug("_sentQueue empty so stopping _processQueues");
            return;
        }

        // get the lowest expiration time in ms
        var nextMessageExpirationMs;
        var sentList = Object.values(this._sentQueue);

        if (sentList.length === 1){
            nextMessageExpirationMs = sentList[0].expirationTimeMs;
        }
        else{
            nextMessageExpirationMs = sentList.reduce((a, b) => Math.min(a.expirationTimeMs, b.expirationTimeMs));
        }

        // make sure we don't go negative
        nextMessageExpirationMs = Math.max(nextMessageExpirationMs - now, 0) + 1;

        // This isn't really nessary, but just gives us an extra safety net in case something goes wrong with the above calculations
        nextMessageExpirationMs = Math.min(nextMessageExpirationMs, 10000);

        logger.debug("scheduling _processQueues for " + nextMessageExpirationMs + "ms");

        this._processQueuesTimer = setTimeout(() => {
            logger.debug("running _processQueues now because we have reached our timeout");
            this._processQueuesTimer = undefined;
            this._processQueues();
        }, nextMessageExpirationMs)
    }

    _send(activeMessage){
        if (typeof activeMessage.tx.sequenceNumber === "function"){
            activeMessage.tx.sequenceNumber = activeMessage.tx.sequenceNumber()
        }

        if(activeMessage.tx.sequenceNumber === undefined) {    // Can't use cute syntax like sequenceNumberOverride || this._sequenceNumber because we expect the override to generally be 0.
            activeMessage.tx.sequenceNumber = this._sequenceNumber
            this._sequenceNumber = emcbUDPutils.incrementSequenceNumber(this._sequenceNumber)
        } // else its already a number and we should use it

        activeMessage.tx.message = emcbUDPutils.createEMCBudpBuffer(activeMessage.tx.sequenceNumber, activeMessage.tx.messageCode, activeMessage.tx.messageData, activeMessage.tx.udpKey)

        // Colorize the logString so we stand a chance to see what is going on
        var color = this.devices[activeMessage.tx.ipAddress] ? this.devices[activeMessage.tx.ipAddress].chalkColor : "reset"
        var idDevice = this.devices[activeMessage.tx.ipAddress] ? this.devices[activeMessage.tx.ipAddress].idDevice : undefined
        logger.verbose(chalk[color](`>>>> SENDING ${(EMCB_UDP_MESSAGE_CODES[activeMessage.tx.messageCode] ? EMCB_UDP_MESSAGE_CODES[activeMessage.tx.messageCode] : "").padStart(30, ">")} (${activeMessage.tx.message.length.toString().padStart(3, " ")} bytes)  to  ${ activeMessage.tx.ipAddress }:${this.port}` + (activeMessage.tx.ipAddress === this.ipAddress ? " (BROADCAST)" : "") + (idDevice ? ` [${idDevice}]` : "")))
        logger.debug(chalk[color](emcbUDPutils.packetToString(">>>", activeMessage.tx.message)))

        this.lastMessageSendTime = (new Date()).getTime()

        this.udpSocket.send(activeMessage.tx.message, this.port, activeMessage.tx.ipAddress, function(error) {
            if(error){
                logger.error(activeMessage)

                if(activeMessage){
                    activeMessage.reject(error) // Call the promise reject
                    //TODO: Figure out how to clean up the activeMessage in broadcast/deviceMaster - so fare, we've never seen this error hit...
                    activeMessage = undefined
                }
                // throw error
            }
        });
    }

    _handleTimeout(activeMessage, ipAddress){
        logger.debug("_handleTimeout(", ipAddress, ")");
        // For now, we consider ANY responses a success and no response at all a failure
        // We create a list of devices that timedout so that we can update the response and keep track of consecutive timeouts for resyncing purposes

        if(!(activeMessage.responses && ipAddress in activeMessage.responses) && !(activeMessage.errors && ipAddress in activeMessage.errors)){
            if(!("timeouts" in activeMessage)){
                activeMessage.timeouts = {}
            }

            activeMessage.timeouts[ipAddress] = new Error(EMCB_UDP_ERROR_TIMEOUT + ` for ${EMCB_UDP_MESSAGE_CODES[activeMessage.tx.messageCode]}`)
            activeMessage.timeouts[ipAddress].device = this.devices[ipAddress]

            this.emit(EMCB_UDP_ERROR_TIMEOUT, activeMessage.timeouts[ipAddress])

            if(this.devices[ipAddress]){    // In the unique case of a broadcast message without any devices yet discovered, we don't want this to barf.
                this.devices[ipAddress].consecutiveErrorsAndTimeouts++

                logger.debug(chalk[this.devices[ipAddress].chalkColor](`Received Timeout ${this.devices[ipAddress].consecutiveErrorsAndTimeouts} for ${this.devices[ipAddress].idDevice}`))

                // If we've had a bunch of consecutive timeouts in a row, we probably need to reset the sequence number for the device
                if(this.devices[ipAddress].consecutiveErrorsAndTimeouts%11 === 10){
                    logger.verbose(chalk[this.devices[ipAddress].chalkColor](`${this.devices[ipAddress].idDevice} = ${ipAddress} seems to have lost its way... Attempting to resync our sequence numbers`))

                    // We are out of sync - try to syncronize!
                    var lostDeviceIPAddress = ipAddress //ipAddress is created by the for loop and will get trampled if we don't locally scope here
                    var lostDevice = this.devices[lostDeviceIPAddress];
                    var lostDeviceColor = lostDevice.chalkColor;
                    lostDevice.useMasterSequenceNumber = false
                    lostDevice.getNextSequenceNumber()
                        .then(data => {
                            logger.debug(chalk[lostDeviceColor]("--------------------------------- Got the next sequence number for " + lostDevice.idDevice + " = " + lostDeviceIPAddress + " - attempting to resync"))
                            return lostDevice.setNextSequenceNumber(this._sequenceNumber)
                                            .then(data => {
                                                logger.verbose(chalk[lostDeviceColor]("---------------------------------" + lostDevice.idDevice + " = " + lostDeviceIPAddress + " resynced! ----------------------------"))
                                                lostDevice.useMasterSequenceNumber = true
                                            })
                                            .catch(err => {
                                                logger.warn(chalk[lostDeviceColor]("----------" + lostDevice.idDevice + " Unable to Set Sequence Number from timeout... ----------------"))
                                                logger.warn(chalk[lostDeviceColor](err))
                                            })
                        })
                        .catch(err => {
                            logger.verbose(chalk[lostDeviceColor]("----------" + lostDevice.idDevice + " Unable to Get Sequence Number from timeout... ----------------"))
                        })

                }

            }


            if(this.devices[ipAddress] && this.devices[ipAddress].consecutiveErrorsAndTimeouts === 100){
                logger.error(chalk[this.devices[ipAddress].chalkColor](`Can't re-establish connectivity with ${ipAddress} - destroying device instance`))
				var device = this.devices[ipAddress]
				delete this.devices[ipAddress]

                this.emit(EMCB_UDP_EVENT_DEVICE_REMOVED, {device: device})

                // Kick off a Discover Devices just to check and make sure nothing has gone too haywire
                this.discoverDevices()
            }
        }

        var retObj = {}

        if(Object.keys(activeMessage.responses || {}).length > 0)
            retObj.responses = activeMessage.responses

        if(Object.keys(activeMessage.errors || {}).length > 0)
            retObj.errors = activeMessage.errors

        if(Object.keys(activeMessage.timeouts || {}).length > 0)
            retObj.timeouts = activeMessage.timeouts

        if(Object.keys(activeMessage.timeouts || {}).length ===  activeMessage.expectedNumResponses) { // We've got all the responses we expect
            activeMessage.reject(retObj)
        } 
        else if(Object.keys(activeMessage.responses || {}).length + Object.keys(activeMessage.errors || {}).length + Object.keys(activeMessage.timeouts || {}).length === activeMessage.expectedNumResponses){	// If we have all of our data, resolve the promise!
            activeMessage.fulfill(retObj)
        } 
        else if(activeMessage.expectedNumResponses === Number.MAX_SAFE_INTEGER) {
            
			if(Object.keys(this.devices).length === 0){ // We are trying to discover devices and it isn't working out...
				// we have no devices
                activeMessage.reject(new Error(EMCB_UDP_ERROR_TIMEOUT + " - No Devices discovered!"))
			}
            else if(Object.keys(this.devices).length <= Object.keys(activeMessage.responses || {}).length + Object.keys(activeMessage.errors || {}).length + Object.keys(activeMessage.timeouts || {}).length) { // We found some devices, lets fulfill!
				// message's responses+errors+timeouts >= device list
                activeMessage.fulfill(retObj)
			} 
            else{
                // message's responses+errors+timeouts < device list
                logger.debug("waiting for more responses/timeouts");
            }
		}

    }

    _onPacket(msg, rinfo){
        // Do some basic logging and preflight checks to start
        var color = this.devices[rinfo.address] ? this.devices[rinfo.address].chalkColor : "reset"

        // Log all UDP traffic that we receive
        logger.debug(chalk[color](`<<< RECEIVED ${"".padStart(30, "<")} (${msg.length.toString().padStart(3, " ")} bytes) from ${rinfo.address}:${rinfo.port} ` + (this.devices[rinfo.address] && this.devices[rinfo.address].idDevice ? `[${this.devices[rinfo.address].idDevice}] ` : "")))
        logger.debug(chalk[color](emcbUDPutils.packetToString("<<<", msg)))

        if(msg.length > EMCB_UDP_LONGEST_IMPLEMENTED_MESSAGE_LENGTH){
            // Message is too long, we can ignore
            logger.warn("Received message length > " + EMCB_UDP_LONGEST_IMPLEMENTED_MESSAGE_LENGTH)
            return
        }

        var start = msg.slice(0,4)
        if(start != EMCB_UDP_HEADER_START_SLAVE){
            // Not the start of a packet per our API spec, we can ignore
            logger.warn("First 4 bytes of message do not equal " + EMCB_UDP_HEADER_START_SLAVE)
            return;
        }

        var applicationLayerParsedMessage = emcbUDPutils.parsePacketIntoApplicationLayer(msg)
        if(!applicationLayerParsedMessage){
            logger.warn("Unable to parse Message into our Application layer")
            return;
        }

        // The header is checked and there are at least enough bytes to think we have a message.  Still outstanding are validating the sequence number, hash, and parsing the message
        applicationLayerParsedMessage.rinfo = rinfo

        var activeMessage;

        if (this.ipAddress in this._sentQueue){
            // broadcast message
            activeMessage = this._sentQueue[this.ipAddress];
        }
        else if (rinfo.address in this.devices && this.devices[rinfo.address].activeMessage !== undefined){
            //unicast message
            activeMessage = this.devices[rinfo.address].activeMessage;
        }
        else{
            // this can happen if the response comes in after the timeout
            //TODO: Should we keep a queue of 3 or so messages? and pop it off here based on sequence number?
            logger.warn(chalk[color](`<<< NO ACTIVE MESSAGE for ${(EMCB_UDP_MESSAGE_CODES[applicationLayerParsedMessage.messageCode] ? EMCB_UDP_MESSAGE_CODES[applicationLayerParsedMessage.messageCode] : "0x" + applicationLayerParsedMessage.messageCode.toString(16)).padStart(30)} response (likely due to timeout)` + (this.idDevice ? ` for [${this.idDevice}]` : "") + `.`));
            this.unhandledMessages++
            return;
        }

        // Make sure we are parsing a message that we sent
        if(activeMessage.tx.messageCode !== applicationLayerParsedMessage.messageCode){
            logger.warn(`Expected Message Code 0x${activeMessage.tx.messageCode.toString(16).toUpperCase()} but got 0x${applicationLayerParsedMessage.messageCode.toString(16).toUpperCase()}`)
            return;
        }

        // Check the message signature
        if(emcbUDPutils.checkSignature(applicationLayerParsedMessage.cryptographicHashedData, applicationLayerParsedMessage.cryptographicHash, activeMessage.tx.udpKey) !== true){
            logger.warn("CheckSignature FAILED validation")
            return;
        }

        // Message should checkout for parsing
        var parsedData
        try{
            parsedData = emcbUDPutils.parsers[applicationLayerParsedMessage.messageCode](activeMessage.tx, applicationLayerParsedMessage.messageData)
        } catch(ex){
			if(emcbUDPutils.parsers[applicationLayerParsedMessage.messageCode] === undefined){
				parsedData = applicationLayerParsedMessage.messageData
			} else{
				parsedData = new Error(ex)
			}
        }


        logger.verbose(chalk[color](`<<< HANDLING ${(EMCB_UDP_MESSAGE_CODES[applicationLayerParsedMessage.messageCode] ? EMCB_UDP_MESSAGE_CODES[applicationLayerParsedMessage.messageCode] : "0x" + applicationLayerParsedMessage.messageCode.toString(16)).padStart(30)} (${msg.length.toString().padStart(3, " ")} bytes)  in  ${(new Date()).getTime() - this.lastMessageSendTime}ms`))
        logger.debug(chalk[color](util.inspect(parsedData)))

        if(this.devices[rinfo.address] === undefined && parsedData.idDevice){
            // This looks like a message for us that we should be processing, but we don't have a device instance, so we create it
			logger.verbose("Creating EmcbUDPdeviceMaster Instance for " + rinfo.address)
			this.createDevice(parsedData.idDevice, rinfo.address, false)
        }

        if(!(parsedData instanceof Error)){
            // Let the instance take care of any business it needs to
            // The data was appropriately parsedData
            // NOTE: This does not mean that the message actually did anything useful (see the rejection bit below)

			activeMessage.responses[rinfo.address] = clonedeep(parsedData)  // Deep copy so that mutations in Promises don't muck around with our event emitters parsedData
			activeMessage.responses[rinfo.address].device = this.devices[rinfo.address]
			parsedData.device = this.devices[rinfo.address]

			if(this.devices[rinfo.address]){
				this.devices[rinfo.address].consecutiveErrorsAndTimeouts = 0 // Clear our consecutive timeouts flag

				if(this.devices[rinfo.address][activeMessage.tx.messageCode] && typeof this.devices[rinfo.address][activeMessage.tx.messageCode] == "function"){
					var deviceParserResponse = this.devices[rinfo.address][activeMessage.tx.messageCode](parsedData)
					if(deviceParserResponse instanceof Error){
						parsedData = deviceParserResponse
						delete activeMessage.responses[rinfo.address]	// If we got an error from the parser - don't double count it as a response!
					}
					// If there is a parser, it is up to that parser to emit any successful events for the individual device and the master!
					// If there is an error, it will be taken care of below.
				} else {
					this.devices[rinfo.address]._emit(activeMessage.tx.messageCode, parsedData)
				}
			}
        }

        if(parsedData instanceof Error) {
            logger.error("Received error from parser for " + rinfo.address)
            logger.error(util.inspect(parsedData))

            parsedData.device = this.devices[rinfo.address]

            if(!("errors" in activeMessage)){
                activeMessage.errors = {}
            }

            activeMessage.errors[rinfo.address] = parsedData

            this.emit(EMCB_UDP_ERROR_PARSER, parsedData)
        }

        if(Object.keys(activeMessage.responses || {}).length + Object.keys(activeMessage.errors || {}).length === activeMessage.expectedNumResponses){

            logger.debug("expected number of responses reached: " + activeMessage.expectedNumResponses);

            // Fullfill/reject the promise returned when the message was created by the outside
            var retObj = {}

            if(Object.keys(activeMessage.responses || {}).length > 0)
                retObj.responses = activeMessage.responses

            if(Object.keys(activeMessage.errors || {}).length > 0)
				retObj.errors = activeMessage.errors

			if(Object.keys(activeMessage.timeouts || {}).length > 0)
				retObj.timeouts = activeMessage.timeouts

			// Don't need to worry due to the if above

            if(retObj.responses)
                activeMessage.fulfill(retObj)
            else
                activeMessage.reject(retObj)


            if (this.ipAddress in this._sentQueue){ 
                // broadcast message
                logger.debug("removing message for " + this.ipAddress + " from _sentQueue");
                delete this._sentQueue[this.ipAddress];
            }
            else if (rinfo.address in this.devices){
                //unicast message
                logger.debug("removing message for " + rinfo.address + " from _sentQueue");
                delete this._sentQueue[rinfo.address];
                this.devices[rinfo.address].activeMessage = undefined;
            }
            else{
                logger.error("Could not find message to delete from _sentQueue");
            }

			// we have all of our responses, so go ahead and update our queue
            logger.debug("running _processQueues now because we received all our expected responses");
			if (this._processQueuesTimer){
                clearTimeout(this._processQueuesTimer);
            }
            this._processQueuesTimer = setTimeout(() => { this._processQueues() }, 0);
        }
    }
}

module.exports = EmcbUDPbroadcastMaster
