import winston, { transports } from "winston";
const colorizer: winston.Logform.Colorizer = winston.format.colorize();

/*
{
  crit: 0,
  error: 1,
  warning: 2,
  debug: 3,
  info: 4
}
*/

const fileLogger: winston.Logger = winston.createLogger({
    levels: { crit: 0, error: 1, warning: 2, debug: 3, info: 4},
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple(),
        winston.format.printf((msg: winston.Logform.TransformableInfo) =>
            `${msg.timestamp} - ${msg.level}: ${msg.message}`
        )
    ),
    transports:[
            new transports.File({filename: 'logs/info.log', level : 'info'}),
            new transports.File({filename: 'logs/debug.log', level : 'debug'}),
            new transports.File({filename: 'logs/error.log', level : 'error'}),
            new transports.File({filename: 'logs/warning.log', level : 'warn'}),
            new transports.File({filename: 'logs/critical.log', level : 'crit'})
    ]

})

const consoleLogger: winston.Logger = winston.createLogger({
    levels: { crit: 0, error: 1, warning: 2, debug: 3, info: 4},
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.prettyPrint(),
        winston.format.simple(),
        winston.format.printf(msg =>
            colorizer.colorize(msg.level, `${msg.timestamp}: ${msg.message}`)
        )
    ),
    transports:[
        new transports.Console()
    ]
});

function debug(message: string) : void{
    fileLogger.debug(message);
    consoleLogger.debug(message);
}

function error(message: string) : void{
    fileLogger.error(message);
    consoleLogger.error(message);
}

function info(message: string) : void{
    fileLogger.info(message);
    consoleLogger.info(message);
}

function warn(message: string) : void{
    fileLogger.warn(message);
    consoleLogger.warn(message);
}

function critical(message: string) : void{
    fileLogger.crit(message);
    consoleLogger.crit(message);
    process.exit(-2);
}

const logger = {
    debug,
    error,
    info,
    warn,
    critical
}



export  { logger };