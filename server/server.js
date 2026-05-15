require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { PORT, FRONTEND_ORIGIN, NODE_ENV, APP_ENV, JWT_SECRET } = require('./config')
const logger = require('./logger')

if (APP_ENV === 'prod' && (!JWT_SECRET || JWT_SECRET.length < 32)) {
  console.error('FATAL: JWT_SECRET must be set and >= 32 chars in prod. Server will not start.')
  process.exit(1)
}

// Инициализация БД при импорте
require('./db')

const app = express()

// Доверять первому прокси (nginx) для корректного определения IP клиента
app.set('trust proxy', 1)

app.use(helmet({ contentSecurityPolicy: false }))

app.use(cors({
  origin: NODE_ENV === 'production' ? FRONTEND_ORIGIN : true,
  credentials: true,
}))

// Глобальный rate-limit: 120 запросов в минуту с IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
})
app.use('/api/', globalLimiter)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Лог каждого запроса
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip })
  next()
})

// Роуты
app.use('/api/auth',      require('./routes/auth'))
app.use('/api/users',     require('./routes/users'))
app.use('/api/match',     require('./routes/match'))
app.use('/api/admin',     require('./routes/admin'))
app.use('/api/reactions', require('./routes/reactions'))

// Публичный справочник отделов (без авторизации — нужен до онбординга)
const db = require('./db')
app.get('/api/departments', (_req, res) => {
  res.json(db.prepare(
    'SELECT id, name, sort_order, is_active FROM departments WHERE is_active = 1 ORDER BY sort_order, name'
  ).all())
})

// Health-check с проверкой БД
app.get('/api/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get()
    res.json({ status: 'ok', db: 'ok', env: APP_ENV, nodeEnv: NODE_ENV })
  } catch (err) {
    logger.error('Health check DB error', { error: err.message })
    res.status(503).json({ status: 'degraded', db: 'error', error: err.message })
  }
})

// 404
app.use((_req, res) => res.status(404).json({ error: 'Роут не найден' }))

// Глобальный обработчик ошибок
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack })
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

app.listen(PORT, () => {
  logger.info(`BSO Tinder API started`, { port: PORT, env: NODE_ENV })
})

module.exports = app
