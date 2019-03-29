const logger        = require("winston");
const {toBigIntLE}  = require('bigint-buffer');
const {Int64LE}     = require("int64-buffer");

const {

    EMCB_UDP_IMPLEMENTED_PROTOCOL_VERSION,

    // GET Message Codes
    EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER,
    EMCB_UDP_MESSAGE_CODE_GET_DEVICE_DEBUG_DATA,
    EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS,
    EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION,
    EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA,

    // SET Message Codes
    EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER,
    EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION,
    EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED,

    // Enums / Parsed Data Constant
    EMCB_UDP_ACK,

    EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_RATE_LIMITED,
    EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_BAD_SEQUENCE_NUMBER,

    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_FEEDBACK_MISMATCH,

    EMCB_UDP_ERROR_INVALID_DATA_LENGTH
} = require('./emcbUDPconstants.js')



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


    [EMCB_UDP_MESSAGE_CODE_GET_DEVICE_DEBUG_DATA]: function(tx,rx){
        if(rx.length != 22){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 22, got " + rx.length);
        }

        return {
           time:        new Date(rx.readUInt32LE(0)*1000),
           millis:      rx.readUInt32LE(4),
           micros:      rx.readUInt32LE(8),
           freeMemory:  rx.readUInt32LE(12),
           RSSI:        rx.readInt32LE(16),
           lightLevel:  rx.readUInt16LE(20),
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
        if(rx.length != 1){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 1, got " + rx.length);
        }

        var state = rx[0] //rx.readUInt8LE isn't a function :)
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

            "mJp0":         Int64LE(rx.slice(7,14)),            //7-14 INT64 Phase 0 Cumulative active energy. milliJoules = milliWatt-Second.
            "mVARsp0":      Int64LE(rx.slice(15,22)),           //15-22 INT64 Phase 0 Cumulative reactive energy. mVARs.
            "mVAsp0":       toBigIntLE(rx.slice(23,30)),        //23-30 UINT64 Phase 0 Cumulative apparent energy. mVAs.

            "LNmVp0":       rx.readUInt32LE(31),                //31-34 Integer Phase 0 voltage RMS. mV.
            "mAp0":         rx.readUInt32LE(35),                //35-38 Integer Phase 0 current RMS. mA.

            "q1mJp0":       toBigIntLE(rx.slice(39,46)),        //39-46 UINT64 Quadrant 1 Phase 0 Cumulative Active energy. mJ.
            "q2mJp0":       toBigIntLE(rx.slice(47,54)),        //47-54 UINT64 Quadrant 2 Phase 0 Cumulative Active energy. mJ.
            "q3mJp0":       toBigIntLE(rx.slice(55,62)),        //55-62 UINT64 Quadrant 3 Phase 0 Cumulative Active energy. mJ.
            "q4mJp0":       toBigIntLE(rx.slice(63,70)),        //63-70 UINT64 Quadrant 4 Phase 0 Cumulative Active energy. mJ.

            "q1mVARsp0":    toBigIntLE(rx.slice(71,78)),        //71 -78 UINT64 Quadrant 1 Phase 0 Cumulative Reactive energy. mVARs.
            "q2mVARsp0":    toBigIntLE(rx.slice(79,86)),        //79 -86 UINT64 Quadrant 2 Phase 0 Cumulative Reactive energy. mVARs.
            "q3mVARsp0":    toBigIntLE(rx.slice(87,94)),        //87 -94 UINT64 Quadrant 3 Phase 0 Cumulative Reactive energy. mVARs.
            "q4mVARsp0":    toBigIntLE(rx.slice(95,102)),       //95-102 UINT64 Quadrant 4 Phase 0 Cumulative Reactive energy. mVARs.

            "q1mVAsp0":     toBigIntLE(rx.slice(103,110)),      //103-110 UINT64 Quadrant 1 Phase 0 Cumulative Apparent energy. mVAs.
            "q2mVAsp0":     toBigIntLE(rx.slice(111,118)),      //111-118 UINT64 Quadrant 2 Phase 0 Cumulative Apparent energy. mVAs.
            "q3mVAsp0":     toBigIntLE(rx.slice(119,126)),      //119-126 UINT64 Quadrant 3 Phase 0 Cumulative Apparent energy. mVAs.
            "q4mVAsp0":     toBigIntLE(rx.slice(127,134)),      //127-134 UINT64 Quadrant 4 Phase 0 Cumulative Apparent energy. mVAs.

            "mJp1":         Int64LE(rx.slice(135,142)),         //135-142 INT64 Phase 1 Cumulative active energy. mJ.
            "mVARsp1":      Int64LE(rx.slice(143,150)),         //143-150 INT64 Phase 1 Cumulative reactive energy. mVARs.
            "mVAsp1":       toBigIntLE(rx.slice(151,158)),      //151-158 UINT64 Phase 1 Cumulative apparent energy. mVAs.

            "LNmVp1":       rx.readUInt32LE(159),               //159-162 Integer Phase 1 voltage RMS. mV.
            "mAp1":         rx.readUInt32LE(163),               //163-166 Integer Phase 1 current RMS. mA.

            "q1mJp1":       toBigIntLE(rx.slice(167,174)),            //167-174 UINT64 Quadrant 1 Phase 1 Cumulative Active energy. mJ.
            "q2mJp1":       toBigIntLE(rx.slice(175,182)),            //175-182 UINT64 Quadrant 2 Phase 1 Cumulative Active energy. mJ.
            "q3mJp1":       toBigIntLE(rx.slice(183,190)),            //183-190 UINT64 Quadrant 3 Phase 1 Cumulative Active energy. mJ.
            "q4mJp1":       toBigIntLE(rx.slice(191,198)),            //191-198 UINT64 Quadrant 4 Phase 1 Cumulative Active energy. mJ.

            "q1mVARsp1":    toBigIntLE(rx.slice(199,206)),            //199-206 UINT64 Quadrant 1 Phase 1 Cumulative Reactive energy. mVARs.
            "q2mVARsp1":    toBigIntLE(rx.slice(207,214)),            //207-214 UINT64 Quadrant 2 Phase 1 Cumulative Reactive energy. mVARs.
            "q3mVARsp1":    toBigIntLE(rx.slice(215,222)),            //215-222 UINT64 Quadrant 3 Phase 1 Cumulative Reactive energy. mVARs.
            "q4mVARsp1":    toBigIntLE(rx.slice(223,230)),            //223-230 UINT64 Quadrant 4 Phase 1 Cumulative Reactive energy. mVARs.

            "q1mVAsp1":     toBigIntLE(rx.slice(231,238)),            //231-238 UINT64 Quadrant 1 Phase 1 Cumulative Apparent energy. mVAs.
            "q2mVAsp1":     toBigIntLE(rx.slice(239,246)),            //239-246 UINT64 Quadrant 2 Phase 1 Cumulative Apparent energy. mVAs.
            "q3mVAsp1":     toBigIntLE(rx.slice(247,254)),            //247-254 UINT64 Quadrant 3 Phase 1 Cumulative Apparent energy. mVAs.
            "q4mVAsp1":     toBigIntLE(rx.slice(255,262)),            //255-262 UINT64 Quadrant 4 Phase 1 Cumulative Apparent energy. mVAs.

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

    [EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER]: function(tx, rx){
        if(rx.length != 1){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 1, got " + rx.length);
        }

        if(tx === undefined){
            return new Error("Unable to parse message - tx is undefined")
        }

        var ack = rx[0] //rx.readUInt8LE isn't a function :)
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

    [EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED]: function(tx, rx){
        if(rx.length != 1){
            return new Error(EMCB_UDP_ERROR_INVALID_DATA_LENGTH + " Expected 1, got " + rx.length);
        }

        return {
            ack: rx[0]  //rx.readUInt8LE isn't a function :)
        }
    },
}
