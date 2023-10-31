// NOTE: This command will only work on EV Smart Breaker Charger

const {
    EmcbUDPbroadcastMaster,
    EMCB_UDP_EVENT_DEVICE_DISCOVERED
} = require('../../../..'); // If running this example somewhere outside of a `git clone` of the `emcb-udp-master` module, replace with `require("emcb-udp-master")`

const UDPKeys = require("../../../_config.js")

var EMCBs = new EmcbUDPbroadcastMaster({
    broadcastUDPKey : UDPKeys.broadcast,
    unicastUDPKeys  : UDPKeys.unicast
})
const argv = require('minimist')(process.argv.slice(2));
var deviceID = argv._[0];
var deviceIP = argv._[1];

console.log("Establishing connection to device " + deviceID + " at ip: " + deviceIP);
var device = EMCBs.createDevice(deviceID, deviceIP, true);

function parseGetEvseDeviceStateResponse(response){
    // clone the object
    var response = Object.assign({}, response); // shallow copy
    response.errorData = [...response.errorData]; // shallow copy
    delete response.device;
    delete response.raw;

    var states = {
        0 : "A: idle",
        1 : "B1: connected, waiting on charger",
        2 : "B2: connected, waiting on car",
        3 : "C: charging",
        4 : "E: fault",
        5 : "F: fault",
    }

    var errorCodes = {
        0 :  "NO_ERROR",
        2 :  "ERROR_VENT_NOT_SUPPORTED",
        4 :  "ERROR_STATE_MACHINE_BAD_STATE",
        5 :  "ERROR_STATE_MACHINE_INTERNAL",
        6 :  "ERROR_STATE_MACHINE_INTERNAL_FATAL",
        7 :  "ERROR_GROUND_FAULT",
        8 :  "ERROR_GROUND_FAULT_TEST_FAILED",
        9 :  "ERROR_PILOT_DIODE_SHORT",
        10 : "ERROR_PILOT_NEG_12_VOLTS",
        11 : "ERROR_PILOT_VOLTAGE_INVALID",
        12 : "ERROR_ADC_FAILURE",
        13 : "ERROR_WATCHDOG_FAILURE",
        16 : "ERROR_CLP_CONFIG_FAILURE",
        30 : "ERROR_INTERNAL_EEPROM_INCONSISTENCY",
        34 : "ERROR_OVER_LIMITED_CURRENT",
        48 : "ERROR_INVALID_INDEX",
        51 : "ERROR_CONTACTOR_IN_WRONG_STATE",
        55 : "ERROR_SOLENOID_OPEN_FAIL",
        56 : "ERROR_SOLENOID_CLOSE_FAIL",
        58 : "ERROR_SOLENOID_POWER_WAIT_FAIL",
        59 : "ERROR_SOLENOID_POWER_FAIL",
        60 : "ERROR_GF_IMMEDIATE",
        61 : "ERROR_GF_IDLE",
        62 : "ERROR_P12V",
        63 : "ERROR_N12V",
        64 : "ERROR_P5V",
        65 : "ERROR_SUPPLY_VOLTAGE",
        66 : "ERROR_GMI",
        67 : "ERROR_HW_UNSUPPORTED"
    }

    if (response.state in states){
        response.state = states[response.state];
    }
    else{
        response.state = "unknown";
    }

    if (response.errorCode in errorCodes){
        response.error = errorCodes[response.errorCode];
    }
    else{
        response.error = "ERROR_UNKNOWN";
    }

    delete response.errorCode;

    response.permanentError = (response.permanentError == 1 ? true : (response.permanentError == 0 ? false : null));

    return response;
}


EMCBs.on(EMCB_UDP_EVENT_DEVICE_DISCOVERED, (data) => {
    console.log('Device connected from address: ' + data.device.ipAddress);
    console.log("Sending: Get EVSE device state");

    data.device.getEvseDeviceState()
        .then(data => {
            for (const [ip, response] of Object.entries(data.responses)) {
                console.log("Response from " + ip + ":");
                console.log(parseGetEvseDeviceStateResponse(response));
            }
        })
        .catch(err => {
            console.error("Failed to get EVSE device state")
            console.error(err)
        })
        .then(() => {
            process.exit()
        })
})
    