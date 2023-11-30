//UDP Constants
var constants = {
    // Network Configuration
    EMCB_UDP_PORT                                                : 32866, // "EATON" on a phone keypad

    // Application Layer Constraints
    EMCB_UDP_IMPLEMENTED_PROTOCOL_VERSION                        : 1,
    EMCB_UDP_MESSAGE_THROTTLE_TIME_MS                            : 500,    // TODO: consider renaming this since it's now just being used as a default timeout
    EMCB_UDP_LONGEST_IMPLEMENTED_MESSAGE_LENGTH                  : 310,    // 10 bytes Header + 268 bytes EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS + 32 bytes hash

    // Application Layer Header Constants
    EMCB_UDP_HEADER_START_MASTER                                 : "ETNM", // Start Byte of all Master->Slave requests
    EMCB_UDP_HEADER_START_SLAVE                                  : "ETNS", // Start Byte of all Slave->Master responses

    // Application Layer GET Message Codes
    EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER               : 0x0000,
    EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS                      : 0x00FF,
    EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION     : 0x0100,
    EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA               : 0x0200,
    EMCB_UDP_MESSAGE_CODE_GET_EVSE_APPLIED_CONTROL_SETTINGS      : 0x1100,
    EMCB_UDP_MESSAGE_CODE_GET_EVSE_DEVICE_STATE                  : 0x1200,
    EMCB_UDP_MESSAGE_CODE_GET_EVSE_CONFIG_SETTINGS               : 0x1300,
    
    // Application Layer SET Message Codes
	EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER               : 0x8000,
	EMCB_UDP_MESSAGE_CODE_SET_CLOUD_LOGGING 					 : 0x8001,

	EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION     : 0x8100,
	EMCB_UDP_MESSAGE_CODE_SET_METER_MODE						 : 0x8201,
	EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED       : 0x8300,
    EMCB_UDP_MESSAGE_CODE_SET_EVSE_CONFIG_SETTINGS               : 0x9300,

    // Application Layer Integer Message Codes to strings
    EMCB_UDP_MESSAGE_CODES                                       : {},

    // Application Layer Enums / Parsed Data Constants
    EMCB_UDP_ACK                                                 : 0,

    EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_RATE_LIMITED               : 1,
    EMCB_UDP_SET_NEXT_SEQUENCE_NUMBER_BAD_SEQUENCE_NUMBER        : 2,

    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_OPEN                 : 0,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_CLOSED               : 1,
    EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_FEEDBACK_MISMATCH    : 2,
	EMCB_UDP_BREAKER_REMOTE_HANDLE_POSITION_TOGGLE               : 2,

	EMCB_UDP_METER_MODE_NORMAL									 : 0,
	EMCB_UDP_METER_MODE_CONTINUOUS_WAVEFORM						 : 2,

    // Errors
    EMCB_UDP_ERROR_TIMEOUT                                       : "TIMEOUT",               // EmcbUDPdeviceMaster instance as argument
    EMCB_UDP_ERROR_PARSER                                        : "EMCB_UDP_ERROR_PARSER", // EmcbUDPdeviceMaster instance as argument
    EMCB_UDP_ERROR_INVALID_DATA_LENGTH                           : "Invalid Data Length",   // length as argument

    // EventEmitter Events
    EMCB_UDP_EVENT_QUEUE_DRAINED                                 : "ON_QUEUE_DRAINED",          // No args
    EMCB_UDP_EVENT_DEVICE_DISCOVERED                             : "DEVICE_DISCOVERED",         // EmcbUDPdeviceMaster instance as argument
    EMCB_UDP_EVENT_DEVICE_REMOVED                                : "DEVICE_REMOVED",            // EmcbUDPdeviceMaster instance as argument
    EMCB_UDP_EVENT_DEVICE_IP_ADDRESS_CHANGED                     : "DEVICE_IP_ADDRESS_CHANGED", // EmcbUDPdeviceMaster instance as argument

    // Others
    EMCB_UDP_DEVICE_COLORS                                       : ["red", "green", "yellow", "blue", "magenta", "cyan", "gray", "bgRed", "bgGreen", "bgYellow", "bgBlue", "bgMagenta", "bgCyan", "bgWhite", ]    // Chalk colors to help make our logs easier for a human to parse
}

// Make sure we can turn our message codes back into strings for logging purposes
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_GET_NEXT_SEQUENCE_NUMBER]            = "GET_NEXT_SEQUENCE_NUMBER"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_GET_DEVICE_STATUS]                   = "GET_DEVICE_STATUS"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_GET_BREAKER_REMOTE_HANDLE_POSITION]  = "GET_BREAKER_REMOTE_HANDLE_POSITION"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_GET_METER_TELEMETRY_DATA]            = "GET_METER_TELEMETRY_DATA"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_GET_EVSE_APPLIED_CONTROL_SETTINGS]   = "EMCB_UDP_MESSAGE_CODE_GET_EVSE_APPLIED_CONTROL_SETTINGS"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_GET_EVSE_DEVICE_STATE]               = "EMCB_UDP_MESSAGE_CODE_GET_EVSE_DEVICE_STATE"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_GET_EVSE_CONFIG_SETTINGS]            = "EMCB_UDP_MESSAGE_CODE_GET_EVSE_CONFIG_SETTINGS"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_SET_EVSE_CONFIG_SETTINGS]            = "EMCB_UDP_MESSAGE_CODE_SET_EVSE_CONFIG_SETTINGS"

constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_SET_NEXT_SEQUENCE_NUMBER]            = "SET_NEXT_SEQUENCE_NUMBER"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_SET_CLOUD_LOGGING]					  = "SET_CLOUD_LOGGING"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_SET_BREAKER_REMOTE_HANDLE_POSITION]  = "SET_BREAKER_REMOTE_HANDLE_POSITION"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_SET_METER_MODE]					  = "MESSAGE_CODE_SET_METER_MODE"
constants.EMCB_UDP_MESSAGE_CODES[constants.EMCB_UDP_MESSAGE_CODE_SET_BARGRAPH_LED_TO_USER_DEFINED]    = "SET_BARGRAPH_LED_TO_USER_DEFINED"

module.exports = constants;
