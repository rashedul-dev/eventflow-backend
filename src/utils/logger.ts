import winston from "winston"
import path from "path"
import { config } from "../config"

const logDir = path.join(__dirname, "../../logs")

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ""
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}${metaStr}`
  }),
)

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`
  }),
)

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transports only in non-test environment
    ...(config.isTest
      ? []
      : [
          new winston.transports.File({
            filename: path.join(logDir, "error.log"),
            level: "error",
          }),
          new winston.transports.File({
            filename: path.join(logDir, "combined.log"),
          }),
        ]),
  ],
})

// Stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim())
  },
}
