const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../config')
const db = require('../db')
const logger = require('../logger')

function verifyJWT(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' })
  }

  const token = header.slice(7)
  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Токен недействителен или истёк' })
  }

  const user = db.prepare('SELECT id, email, is_admin, is_banned FROM users WHERE id = ?').get(payload.userId)
  if (!user) return res.status(401).json({ error: 'Пользователь не найден' })
  if (user.is_banned) {
    logger.warn('Banned user attempted access', { userId: user.id, email: user.email })
    return res.status(403).json({ error: 'Аккаунт заблокирован' })
  }

  req.user = user
  next()
}

module.exports = { verifyJWT }
