const { createLogger, format, transports } = require("winston");
require("winston-mongodb");

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    }),

    new transports.MongoDB({
      db: process.env.MONGO_URI,
      collection: "systemlogs",
      level: "info",
      options: { useUnifiedTopology: true },
      tryReconnect: true,
      capped: true,            
      cappedMax: 1000000      
    })
  ],
  exitOnError: false,
});

module.exports = logger;
