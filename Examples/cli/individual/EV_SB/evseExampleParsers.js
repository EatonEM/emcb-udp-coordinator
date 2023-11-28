
module.exports = {
    parseGetEvseDeviceStateResponse: function (response){
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
    },
    parseGetAppliedEvseControlSettings: function(response){
        // clone the object
        var response = Object.assign({}, response); // shallow copy
        delete response.device;
        delete response.raw;
    
        response.enabled = (response.enabled == 1 ? true : (response.enabled == 0 ? false : null));
        response.authorized = (response.authorized == 1 ? true : (response.authorized == 0 ? false : null));
    
        // 0 means no software limit set, but hardware is still limited to 32 amps
        if (response.maxCurrentAmps == 0){
            response.maxCurrentAmps = 32;
        }
    
        if (response.maxEnergyWatts == 0){
            response.maxEnergyWatts = "none";
        }
    
        return response;
    },
    parseGetEvseConfigSettingsAndModeResponse: function (response){

        // clone the object
        var response = Object.assign({}, response); // shallow copy
        response.apiConfiguration = Object.assign({}, response.apiConfiguration); // shallow copy
        delete response.device;
        delete response.raw;
    
        var modes = {
            1 : "no-restrictions", //Enabled and 100% charge rate, default out of the box mode
            2 : "offline-no-restrictions", //Enabled and 100% charge rate, reverts once back online
            3 : "manual-override",
            4 : "cloud-api",
            5 : "charge-windows",
            6 : "api-override-enable",
            7 : "api-override-disable",
            8 : "ocpp",
        }
    
        var offlineModes = {
            1 : "no-restrictions",
            2 : "no-change"
        }
    
        if (response.mode in modes){
            response.mode = modes[response.mode];
        }
        else{
            response.mode = "unknown";
        }
    
        if (response.offlineMode in offlineModes){
            response.offlineMode = offlineModes[response.offlineMode];
        }
        else{
            response.offlineMode = "unknown";
        }
    
        var enabled = response.apiConfiguration.enabled;
        response.apiConfiguration.enabled = (enabled == 1? true : (enabled == 0? false : "unknown"));
    
        // 0 means no software limit set, but hardware is still limited to 32 amps
        if (response.apiConfiguration.maxCurrentAmps == 0){
            response.apiConfiguration.maxCurrentAmps = 32
        }
    
        if (response.apiConfiguration.maxEnergyWatts == 0){
            response.apiConfiguration.maxEnergyWatts = "none"
        }
    
        return response;
    },
    parsePatchEvseConfigSettingsAndModeResponse: function (response){
        // clone the object
        var response = Object.assign({}, response); // shallow copy
        delete response.device;
    
        return response;
    }
};

