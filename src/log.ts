import {default as winston, format, transports} from "winston";
import config from "config";

const logger = winston.createLogger({
    level: config.get("log.level"),
    format: format.combine(
        format.timestamp({
            format: 'MM:DD HH:mm:ss:SSS'
        }),
        format.errors({ stack: true }),
        format.colorize(),
        format.printf((info) => `${info.timestamp} [${info.module}] [${info.level}] ${info.message}`)
    ),
    transports: [
        new transports.Console(),
    ]
});

export default function(module: string) {
    return logger.child({module})
};