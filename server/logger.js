const { createLogger, format, transports } = require('winston')
const path = require('path')

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
      return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
    })
  ),
  transports: [
    new transports.File({
      filename: path.join(__dirname, 'logs', 'app.log'),
      maxsize: 5 * 1024 * 1024,
    }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.timestamp({ format: 'HH:mm:ss' }),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
        return `[${timestamp}] ${level} ${message}${metaStr}`
      })
    ),
  }))
}

module.exports = logger
