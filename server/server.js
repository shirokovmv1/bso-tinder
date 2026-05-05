require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { PORT, FRONTEND_ORIGIN, NODE_ENV } = require('./config')
const logger = require('./logger')

// Инициализация БД при импорте
require('./db')

const app = express()

app.use(cors({
  origin: NODE_ENV === 'production' ? FRONTEND_ORIGIN : true,
  credentials: true,
}))

app.use(express.json({ limit: '2mb' }))
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

// Публичный справочник отделов (для онбординга)
const { verifyJWT } = require('./middleware/auth')
const db = require('./db')
app.get('/api/departments', verifyJWT, (_req, res) => {
  res.json(db.prepare(
    'SELECT id, name, sort_order, is_active FROM departments WHERE is_active = 1 ORDER BY sort_order, name'
  ).all())
})

// Health-check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: NODE_ENV }))

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
