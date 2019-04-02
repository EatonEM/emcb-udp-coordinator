//"index.js" should require this file, which will setup our global logger.
// From there, everything else should var `logger = require('winston');`, which will return the "default" logger
const logger = require('winston');
const μs     = require('microseconds');
const util   = require('util');
const fs     = require('fs')

// Create a log directory if it does not exist
var dir = './logs';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

//
// If we're not in production then log to the `console` and file system
//TODO: We probably want to make the logs a bit more controllable for implementers...
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new logger.transports.File({
        filename: './logs/logs.txt',
        level: 'silly',
        handleExceptions: true,
        exitOnError: true,
        maxsize: 1024*1024*10,
        format: logger.format.combine(
        //   logger.format.timestamp({
        //     logger.format: 'YYYY-MM-DD HH:mm:ss'
        //   }),
            logger.format.colorize(),
            logger.format(function(info, opts) {
                info.level = `[${(new Date()).toISOString()}]${info.level}`
                return info;
            })(),
            logger.format.errors({ stack: true }),
            logger.format.splat(),
            logger.format.simple()
        )}
    ))

    var lastμs = μs.now()

    logger.add(new logger.transports.Console({
      level: 'info',
      handleExceptions: true,
      exitOnError: true,
      format: logger.format.combine(
        logger.format.colorize(),
        logger.format.splat(),
        logger.format(function(info, opts) {
            info.level = `[+${(μs.since(lastμs)/1000).toFixed(3).toString().padStart(8,' ')}ms]${info.level}`

            lastμs = μs.now()
            return info;
        })(),
        logger.format.simple(),
      ),
    }));

} else {
    //TODO:
}

function formatArgs(args){
    return [util.format.apply(util.format, Array.prototype.slice.call(args))];
}

console.error = function(){
    logger.error.apply(logger, formatArgs(arguments));
};
console.warn = function(){
    logger.warn.apply(logger, formatArgs(arguments));
};
console.log = function(){
    logger.info.apply(logger, formatArgs(arguments));
};
console.info = function(){
    logger.info.apply(logger, formatArgs(arguments));
};
console.verbose = function(){
    logger.verbose.apply(logger, formatArgs(arguments));
}
console.debug = function(){
    logger.debug.apply(logger, formatArgs(arguments));
};
console.silly = function(){
    logger.silly.apply(logger, formatArgs(arguments));
};

module.exports = logger
