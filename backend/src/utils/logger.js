'use strict';

const winston = require('winston');

const nodeEnv = process.env.NODE_ENV || 'development';

const level = nodeEnv === 'production' ? 'info' : 'debug';

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, stack }) => {
        const ts = timestamp ? `[${timestamp}] ` : '';
        if (stack) {
          return `${ts}${level}: ${message}\n${stack}`;
        }
        return `${ts}${level}: ${message}`;
      })
    ),
  }),
];

let logger;

if (nodeEnv === 'production') {
  logger = winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.json()
    ),
    transports,
    defaultMeta: { environment: nodeEnv },
  });
} else {
  logger = winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ level, message, timestamp, stack }) => {
        const ts = timestamp ? `[${timestamp}] ` : '';
        if (stack) {
          return `${ts}${level}: ${message}\n${stack}`;
        }
        return `${ts}${level}: ${message}`;
      })
    ),
    transports,
    defaultMeta: { environment: nodeEnv },
  });
}

module.exports = logger;
