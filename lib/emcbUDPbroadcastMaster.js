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

        this._messageQueue        = []              // This queue stores all messages that are to be sent from the master and sends at the rate     //TODO: Right now we have a single messageQueue for both broadcast and unicast devices.  When you have many EMCBs on the network, this architecture becomes very inefficient.  The important thing in our Application Layer is that a single device isn't receiving commands faster than 200ms.  Unicast packets could be fanned out in bulk, greatly improving performance around device discovery and other fan out unicast commands
        this._messageQueueTimer   = undefined       // Timer that will expire after 50ms to queue our next message

        this.activeMessage        = undefined       //TODO: Some of these should probably be private?

        this.unhandledMessages    = 0

        this.lastMessageSendTime  = (new Date()).getTime()

        this.devices              = {}   //[ipAddress] = EmcbUDPdeviceMaster instance

        this.udpSocket            = dgram.createSocket("udp4");


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
				sequenceNumber  : this._sequenceNumber
			})

			if(newDevice.udpKey) {	// If we don't have a udpKey for the device, we won't successfully create one and we don't need to store anything about it
				this.devices[ipAddress] = newDevice

				if(unicastGetNextSequenceNumber === true){
					newDevice.getNextSequenceNumber()
				}

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
    //  - this._setupAndRunQueueTimer() is called
    //      - if a message is already "in flight" and/or we are in our "silent period", we do nothing and wait for the this._messageQueueTimer to expire and re-call this._setupAndRunQueueTimer()
    //  - once there is no timer, we call _send() (mulitple times in the case of unicast messages if they are for individual devices) which actually sends the message
    //      - if there are no messages in our this._messageQueue, we kill the this._messageQueueTimer and call the onQueueDrained callback (if we have it)
    //      - otherwise we actually send the message over the wire and establish our activeMessage
    //  - when data comes in, it will hit the shared udpSocket.on('message', ()) callback function, which then forwards to this._onPacket
    //  - We can then do the final validation steps, parse the message, and fulfill our promise / emit any events that we need to (for both the broadcast and relevant unicast masters)!
    //  - if this._messageQueueTimer exipres and we still have activeMessage, we consider it a timeout and kill the current request before moving on to another one
    send(messageCode, messageData, ipAddress, udpKey, sequenceNumberOverride, expectedNumResponses){
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
            })

            setImmediate(() => { this._setupAndRunQueueTimer() })

        }.bind(this))
    }


    //TODO: Review how to avoid exporting these "private" functions that depend on "this" - unfortunately, all of the "right" ways of doing this are a bit of work...
    _setupAndRunQueueTimer(){
        if(this._messageQueueTimer === undefined){
            // console.log("Processing queue with contents [" + this._messageQueue.reduce((accumulator, activeMessage) => (accumulator || "") + `${EMCB_UDP_MESSAGE_CODES[activeMessage.tx.messageCode]} for ${activeMessage.tx.ipAddress}, `, undefined) + "]")

            // We send greedily, but ensure that we throttle how quickly we send additional messages
            // ORDER OF OPERATIONS HERE IS IMPORTANT - some of the code below will end up calling _setupAndRunQueueTimer underneath the hood
            this._messageQueueTimer = setTimeout(() => {
                this._messageQueueTimer = undefined;
                this._setupAndRunQueueTimer();
            }, EMCB_UDP_MESSAGE_THROTTLE_TIME_MS)

            // If we have gotten back here, and we still have a broadcast this.activeMessage, it means that somebody didn't respond to a broadcast command
            if(this.activeMessage){
                if(Object.keys(this.devices).length > 0){
                    for(var ipAddress in this.devices){
                        this._handleTimeout(this.activeMessage, ipAddress)
                    }
                } else {
                    this._handleTimeout(this.activeMessage, this.ipAddress) // Special case during device discovery where we haven't discovered anything
                }
                this.activeMessage = undefined
            } else {
                // We also check to make sure there aren't any lingering unicast commands
                for(var ipAddress in this.devices){
                    if(this.devices[ipAddress].activeMessage !== undefined){
                        this._handleTimeout(this.devices[ipAddress].activeMessage, ipAddress)
                        this.devices[ipAddress].activeMessage = undefined
                    }
                }
            }


            if(this._messageQueue.length === 0){
                // logger.silly(`this._messageQueue is empty - killing timer`)
                clearTimeout(this._messageQueueTimer)   // No need to keep this running if there is nothing ready to send
                this._messageQueueTimer = undefined;
                if (Object.keys(this.devices).length > 0) {
                    setImmediate(function(){ this.emit(EMCB_UDP_EVENT_QUEUE_DRAINED) }.bind(this))       // Let someone outside know that our send queue is now empty
                }
                return;
            }

            // Try to get as many unicast messages in flight as we can!
            //TODO: I'm not sure how well this will scale since we are using a single timeout timer...  Initial testing suggests its <0.2ms between transmits so for 255 devices, we'd be looking at ~50ms of transmit time out of our 200ms EMCB_UDP_MESSAGE_THROTTLE_TIME_MS this._messageQueueTimer
            // Alternatively, send a single broadcast command
            var sentUnicast = false
            while(this._messageQueue.length > 0){
                var activeMessage = this._messageQueue[0]

                // logger.silly(`activeMessage = ${EMCB_UDP_MESSAGE_CODES[activeMessage.tx.messageCode]} for ${activeMessage.tx.ipAddress}`)

                if(this.devices[activeMessage.tx.ipAddress]) {
                    if(this.devices[activeMessage.tx.ipAddress].activeMessage === undefined) {
                        // Pull the message off the queue and send it!
                        this.devices[activeMessage.tx.ipAddress].activeMessage = this._messageQueue.shift()
                        this._send(this.devices[activeMessage.tx.ipAddress].activeMessage)
                        sentUnicast = true;
                        continue;
                    } else {
                        // We've already got an active unicast message going to this device, we can't send anything else until our silent period is done!
                        break;
                    }
                }

                if(activeMessage.tx.ipAddress === this.ipAddress){
                    if(sentUnicast === true){
                        // We can't send a broadcast while there is an active unicast...
                        break;
                    }

                    // Broadcast Message
                    this.activeMessage = this._messageQueue.shift()

                    this._send(this.activeMessage)
                    // Now that we've sent a broadcast, no unicast is allowed until our silent period is done!
                    break;
                }
            }

            // logger.silly("New Message Queue contents [" + this._messageQueue.reduce((accumulator, activeMessage) => (accumulator || "") + `${EMCB_UDP_MESSAGE_CODES[activeMessage.tx.messageCode]} for ${activeMessage.tx.ipAddress}, `, undefined) + "]")

        }
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
                    this.devices[lostDeviceIPAddress].useMasterSequenceNumber = false
                    this.devices[lostDeviceIPAddress].getNextSequenceNumber()
                        .then(data => {
                            logger.debug(chalk[this.devices[lostDeviceIPAddress].chalkColor]("--------------------------------- Got the next sequence number for " + this.devices[lostDeviceIPAddress].idDevice + " = " + lostDeviceIPAddress + " - attempting to resync"))
                            return this.devices[lostDeviceIPAddress].setNextSequenceNumber(this._sequenceNumber)
                                            .then(data => {
                                                logger.verbose(chalk[this.devices[lostDeviceIPAddress].chalkColor]("---------------------------------" + this.devices[lostDeviceIPAddress].idDevice + " = " + lostDeviceIPAddress + " resynced! ----------------------------"))
                                                this.devices[lostDeviceIPAddress].useMasterSequenceNumber = true
                                            })
                                            .catch(err => {
                                                logger.warn(chalk[this.devices[lostDeviceIPAddress].chalkColor]("----------" + this.devices[lostDeviceIPAddress].idDevice + " Unable to Set Sequence Number from timeout... ----------------"))
                                                logger.warn(chalk[this.devices[lostDeviceIPAddress].chalkColor](err))
                                            })
                        })
                        .catch(err => {
                            logger.verbose(chalk[this.devices[lostDeviceIPAddress].chalkColor]("----------" + this.devices[lostDeviceIPAddress].idDevice + " Unable to Get Sequence Number from timeout... ----------------"))
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
        } else if(Object.keys(activeMessage.responses || {}).length + Object.keys(activeMessage.errors || {}).length + Object.keys(activeMessage.timeouts || {}).length === activeMessage.expectedNumResponses){	// If we have all of our data, resolve the promise!
            activeMessage.fulfill(retObj)
        } else if(activeMessage.expectedNumResponses === Number.MAX_SAFE_INTEGER) {
			if(Object.keys(this.devices).length === 0){ // We are trying to discover devices and it isn't working out...
				activeMessage.reject(new Error(EMCB_UDP_ERROR_TIMEOUT + " - No Devices discovered!"))
			} else if(Object.keys(this.devices).length <= Object.keys(activeMessage.responses || {}).length + Object.keys(activeMessage.errors || {}).length + Object.keys(activeMessage.timeouts || {}).length) { // We found some devices, lets fulfill!
				activeMessage.fulfill(retObj)
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

        var activeMessage = this.activeMessage  // This will be set for broadcast commands

        if(activeMessage === undefined && this.devices[rinfo.address]){
            activeMessage = this.devices[rinfo.address].activeMessage
        }

        if(activeMessage === undefined){
            //TODO: Should we keep a queue of 3 or so messages? and pop it off here based on sequence number?
            logger.warn(chalk[color](`<<< NO ACTIVE MESSAGE for ${(EMCB_UDP_MESSAGE_CODES[applicationLayerParsedMessage.messageCode] ? EMCB_UDP_MESSAGE_CODES[applicationLayerParsedMessage.messageCode] : "0x" + applicationLayerParsedMessage.messageCode.toString(16)).padStart(30)} response (likely due to timeout)` + (this.idDevice ? ` for [${this.idDevice}]` : "") + `.  Guessing this message took ${(new Date()).getTime() - this.lastMessageSendTime + EMCB_UDP_MESSAGE_THROTTLE_TIME_MS}ms to reach us`))
            this.unhandledMessages++
            return
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

            // Clean up the active Messages
            this.activeMessage = undefined
			this.devices[rinfo.address].activeMessage = undefined

			// If we have all of our responses, go ahead and let the next message execute faster than our "throttle" time (at least for now - a better implementation would have per message timeouts anyway...)
			clearTimeout(this._messageQueueTimer)
			this._messageQueueTimer = undefined
			setImmediate(function(){ this._setupAndRunQueueTimer() }.bind(this))
        }
    }
}

module.exports = EmcbUDPbroadcastMaster
