const logger        = require("winston");
const {toBigIntLE}  = require('bigint-buffer');
const {Int64LE}     = require("int64-buffer");

const {

    EMCB_UDP_IMPLEMENTED_PROTOCOL_VERSION,

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
	EMCB_UDP_MESSAGE_CODE_SET_METER_MODE,
    EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION,
    EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED,
    EMCB_UDP_MESSAGE_CODE_SET_EVSE_CONFIG_SETTINGS,

    // Enums / Parsed Data Constant
    EMCB_UDP_ACK,

    EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_RATE_LIMITED,
    EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_BAD_SEQUENCE_NUMBER,

    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_FEEDBACK_MISMATCH,

    EMCB_UDP_ERROR_INVALID_DATA_LENGTH
} = require('./emcbUDPconstants.js')

function parseAck(tx, rx){
	if(rx.length != 1){
		return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 1, got " + rx.length);
	}

	return {
		ack:       rx[0],  //rx.readUInt8LE isn't a function :)
	}
}

module.exports = {

    [EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER]: function(tx, rx){
        if(rx.length != 28){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 28, got " + rx.length);
        }

        if(tx === undefined){
            return new Error("Unable to parse message - tx is undefined")
        }

        var nextSeqNumber = rx.readUInt32LE(0)
        var idDevice      = rx.slice(4,20).toString()
        var protocolRev   = rx.readUInt32LE(20);
        var nonce         = rx.slice(24)

        var sentNonce = tx.messageData;

        if(nonce.equals(sentNonce) !== true){
            return new Error(`Sent Nonce 0x${sentNonce.toString('hex')} != received Nonce 0x${nonce.toString('hex')}`)
        }

        if(protocolRev != EMCB_UDP_IMPLEMENTED_PROTOCOL_VERSION){
            logger.error(`WARNING - This implementation was built for Protocol Revision ${EMCB_UDP_IMPLEMENTED_PROTOCOL_VERSION} but got ${protocolRev} from the device!  Unless this was a MINOR update, expect MAJOR broken functionality!`)
        }

        return {
            nextSequenceNumber: nextSeqNumber,
            idDevice:           idDevice,
            protocolRevision:   protocolRev
        }
    },

    [EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS]: function(tx,rx){
        if(rx.length != 268){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 268, got " + rx.length);
        }

        return{
            breaker: this[EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION](tx, rx.slice(0,1)),
            meter: this[EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA](tx, rx.slice(1))
        }
    },

    [EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION]: function(tx, rx){
        var state = parseAck(tx, rx).ack
        var stateString
        switch(state){
            case EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN:
                stateString = "Open"
                break;
            case EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED:
                stateString = "Closed"
                break;
            case EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_FEEDBACK_MISMATCH:
                stateString = "Feedback Mismatch"
                break;
        }

        return {
            state:       state,
            stateString: stateString,
        }
    },

    [EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA]: function(tx, rx){
        if(rx.length != 267){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 267, got " + rx.length);
		}

		var parsedData = {
            "updateNum":    rx[0],                              //0-0 Integer Update number. Starts at 0 on boot and increments when periodic data is updated on the device.
            "frequency":    rx.readUInt32LE(1),                 //1-4 Integer Line frequency. mHz.
            "period":       rx.readUInt16LE(5),                 //5-6 Integer Period. The Number of seconds over which the returned was accumulated.  // was a UINT8 in protocol version 1.07

            "mJp0":         Int64LE(rx.slice(7,15)),            //7-14 INT64 Phase 0 Cumulative active energy. milliJoules = milliWatt-Second.
            "mVARsp0":      Int64LE(rx.slice(15,23)),           //15-22 INT64 Phase 0 Cumulative reactive energy. mVARs.
            "mVAsp0":       toBigIntLE(rx.slice(23,31)),        //23-30 UINT64 Phase 0 Cumulative apparent energy. mVAs.

            "LNmVp0":       rx.readUInt32LE(31),                //31-34 Integer Phase 0 voltage RMS. mV.
            "mAp0":         rx.readUInt32LE(35),                //35-38 Integer Phase 0 current RMS. mA.

            "q1mJp0":       toBigIntLE(rx.slice(39,47)),        //39-46 UINT64 Quadrant 1 Phase 0 Cumulative Active energy. mJ.
            "q2mJp0":       toBigIntLE(rx.slice(47,55)),        //47-54 UINT64 Quadrant 2 Phase 0 Cumulative Active energy. mJ.
            "q3mJp0":       toBigIntLE(rx.slice(55,63)),        //55-62 UINT64 Quadrant 3 Phase 0 Cumulative Active energy. mJ.
            "q4mJp0":       toBigIntLE(rx.slice(63,71)),        //63-70 UINT64 Quadrant 4 Phase 0 Cumulative Active energy. mJ.

            "q1mVARsp0":    toBigIntLE(rx.slice(71,79)),        //71 -78 UINT64 Quadrant 1 Phase 0 Cumulative Reactive energy. mVARs.
            "q2mVARsp0":    toBigIntLE(rx.slice(79,87)),        //79 -86 UINT64 Quadrant 2 Phase 0 Cumulative Reactive energy. mVARs.
            "q3mVARsp0":    toBigIntLE(rx.slice(87,95)),        //87 -94 UINT64 Quadrant 3 Phase 0 Cumulative Reactive energy. mVARs.
            "q4mVARsp0":    toBigIntLE(rx.slice(95,103)),       //95-102 UINT64 Quadrant 4 Phase 0 Cumulative Reactive energy. mVARs.

            "q1mVAsp0":     toBigIntLE(rx.slice(103,111)),      //103-110 UINT64 Quadrant 1 Phase 0 Cumulative Apparent energy. mVAs.
            "q2mVAsp0":     toBigIntLE(rx.slice(111,119)),      //111-118 UINT64 Quadrant 2 Phase 0 Cumulative Apparent energy. mVAs.
            "q3mVAsp0":     toBigIntLE(rx.slice(119,127)),      //119-126 UINT64 Quadrant 3 Phase 0 Cumulative Apparent energy. mVAs.
            "q4mVAsp0":     toBigIntLE(rx.slice(127,135)),      //127-134 UINT64 Quadrant 4 Phase 0 Cumulative Apparent energy. mVAs.

            "mJp1":         Int64LE(rx.slice(135,143)),         //135-142 INT64 Phase 1 Cumulative active energy. mJ.
            "mVARsp1":      Int64LE(rx.slice(143,151)),         //143-150 INT64 Phase 1 Cumulative reactive energy. mVARs.
            "mVAsp1":       toBigIntLE(rx.slice(151,159)),      //151-158 UINT64 Phase 1 Cumulative apparent energy. mVAs.

            "LNmVp1":       rx.readUInt32LE(159),               //159-162 Integer Phase 1 voltage RMS. mV.
            "mAp1":         rx.readUInt32LE(163),               //163-166 Integer Phase 1 current RMS. mA.

            "q1mJp1":       toBigIntLE(rx.slice(167,175)),            //167-174 UINT64 Quadrant 1 Phase 1 Cumulative Active energy. mJ.
            "q2mJp1":       toBigIntLE(rx.slice(175,183)),            //175-182 UINT64 Quadrant 2 Phase 1 Cumulative Active energy. mJ.
            "q3mJp1":       toBigIntLE(rx.slice(183,191)),            //183-190 UINT64 Quadrant 3 Phase 1 Cumulative Active energy. mJ.
            "q4mJp1":       toBigIntLE(rx.slice(191,199)),            //191-198 UINT64 Quadrant 4 Phase 1 Cumulative Active energy. mJ.

            "q1mVARsp1":    toBigIntLE(rx.slice(199,207)),            //199-206 UINT64 Quadrant 1 Phase 1 Cumulative Reactive energy. mVARs.
            "q2mVARsp1":    toBigIntLE(rx.slice(207,215)),            //207-214 UINT64 Quadrant 2 Phase 1 Cumulative Reactive energy. mVARs.
            "q3mVARsp1":    toBigIntLE(rx.slice(215,223)),            //215-222 UINT64 Quadrant 3 Phase 1 Cumulative Reactive energy. mVARs.
            "q4mVARsp1":    toBigIntLE(rx.slice(223,231)),            //223-230 UINT64 Quadrant 4 Phase 1 Cumulative Reactive energy. mVARs.

            "q1mVAsp1":     toBigIntLE(rx.slice(231,239)),            //231-238 UINT64 Quadrant 1 Phase 1 Cumulative Apparent energy. mVAs.
            "q2mVAsp1":     toBigIntLE(rx.slice(239,247)),            //239-246 UINT64 Quadrant 2 Phase 1 Cumulative Apparent energy. mVAs.
            "q3mVAsp1":     toBigIntLE(rx.slice(247,255)),            //247-254 UINT64 Quadrant 3 Phase 1 Cumulative Apparent energy. mVAs.
            "q4mVAsp1":     toBigIntLE(rx.slice(255,263)),            //255-262 UINT64 Quadrant 4 Phase 1 Cumulative Apparent energy. mVAs.

            "LLp01mV":      rx.readUInt32LE(263),               	  //263-266 Integer Phase-phase voltage RMS. mV.
		}

		// Most code doesn't know how to handle bigint just yet, so we go ahead and convert to strings for now...
		return JSON.parse(JSON.stringify(parsedData,function(key, value){
            if (typeof value === 'bigint') {
                return value.toString();
            } else {
                return value;
            }
        }, "\t"))

    },

    [EMCB_UDP_MESSAGE_CODE_GET_EVSE_APPLIED_CONTROL_SETTINGS]: function(tx, rx){

        if(rx.length != 7){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 7, got " + rx.length);
		}

        var enabled = rx[0];
        var authorized = rx[1];
        var maxCurrent = rx[2];
        var maxEnergy = rx.readInt32LE(3);

        return {
            enabled : enabled,
            authorized : authorized,
            maxCurrentAmps : maxCurrent,
            maxEnergyWatts : maxEnergy
        };
    },

    [EMCB_UDP_MESSAGE_CODE_GET_EVSE_DEVICE_STATE]: function(tx, rx){

        if(rx.length != 11){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 11, got " + rx.length);
		}

        var state = rx[0];
        var permanentError = rx[1];
        var errorCode = rx[2];
        var errorData = [rx.readUInt16LE(3), rx.readUInt16LE(5), rx.readUInt16LE(7), rx.readUInt16LE(9)]

        return {
            state: state,
            permanentError: permanentError,
            errorCode: errorCode,
            errorData: errorData
        }
    },

    [EMCB_UDP_MESSAGE_CODE_GET_EVSE_CONFIG_SETTINGS]: function(tx, rx){

        if(rx.length != 8){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 8, got " + rx.length);
		}

        if (Buffer.compare(rx, Buffer.from("ffffffffffffffff", "hex")) == 0){
            return new Error("Device experienced an internal error when trying to read EV settings");
        }

        var mode = rx[0];
        var offlineMode = rx[1];
        var apiConfigEnabled = rx[2];
        var apiConfigMaxCurrent = rx[3];
        var apiConfigMaxEnergy = rx.readInt32LE(4);

        return {
            mode: mode,
            offlineMode: offlineMode,
            apiConfiguration: {
                enabled : apiConfigEnabled,
                maxCurrentAmps : apiConfigMaxCurrent,
                maxEnergyWatts : apiConfigMaxEnergy
            }
        }
    },

    [EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER]: function(tx, rx){
        if(tx === undefined){
            return new Error("Unable to parse message - tx is undefined")
        }

        var ack = parseAck(tx, rx).ack
        var ackString
        var nextSequenceNumber
        switch(ack){
            case EMCB_UDP_ACK:
                ackString = "Acknowledged"
                nextSequenceNumber = tx.messageData.readUInt32LE(0)
                break;
            case EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_RATE_LIMITED:
                ackString = "Rate Limited"
                break;
            case EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_BAD_SEQUENCE_NUMBER:
                ackString = "Bad Sequence Number"
                break;
        }

        return {
            ack:                ack,
            ackString:          ackString,
            nextSequenceNumber: nextSequenceNumber,
        }
	},

    [EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION]: function(tx, rx){
        if(rx.length != 2){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 2, got " + rx.length);
        }

        var state = this[EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION](undefined, rx.slice(1)) //parse out the state

        return {
            ack:         rx[0],
            state:       state.state,
            stateString: state.stateString
        }
	},

	[EMCB_UDP_MESSAGE_CODE_SET_METER_MODE]: parseAck,

    [EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED]: parseAck,

    [EMCB_UDP_MESSAGE_CODE_SET_EVSE_CONFIG_SETTINGS]: parseAck,
}
