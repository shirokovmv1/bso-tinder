const express = require('express')
const router = express.Router()
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const rateLimit = require('express-rate-limit')
const db = require('../db')
const logger = require('../logger')
const { isEmailAllowed, isAdminEmail, JWT_SECRET, JWT_EXPIRES_IN, SMTP, ALLOW_DEV_LOGIN } = require('../config')

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
})

function getTransporter() {
  // Пытаемся взять актуальные настройки из БД (позволяет менять SMTP из админки)
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'smtp_%'").all()
  const overrides = Object.fromEntries(rows.map(r => [r.key, r.value]))

  return nodemailer.createTransport({
    host:   overrides.smtp_host   || SMTP.host,
    port:   parseInt(overrides.smtp_port || String(SMTP.port), 10),
    secure: (overrides.smtp_secure || String(SMTP.secure)) === 'true',
    auth: {
      user: overrides.smtp_user || SMTP.user,
      pass: overrides.smtp_pass || SMTP.pass,
    },
  })
}

// POST /api/auth/send-otp
router.post('/send-otp', otpLimiter, (req, res) => {
  const { email } = req.body
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email обязателен' })
  }

  const normalised = email.trim().toLowerCase()

  if (!isEmailAllowed(normalised)) {
    logger.warn('OTP denied: email not allowed', { email: normalised })
    return res.status(403).json({ error: 'Этот email не в списке разрешённых корпоративных адресов' })
  }

  const code = String(Math.floor(1000 + Math.random() * 9000))
  const expiresAt = Date.now() + 10 * 60 * 1000

  db.prepare('INSERT OR REPLACE INTO otp_codes (email, code, expires_at, attempts) VALUES (?, ?, ?, 0)')
    .run(normalised, code, expiresAt)

  const from = SMTP.from
  const transporter = getTransporter()

  transporter.sendMail({
    from,
    to: normalised,
    subject: '🔐 Ваш код входа в БСО Корпоратив',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#1A1A1A;color:#fff;border-radius:16px;padding:32px">
        <h2 style="color:#FF6B00;margin:0 0 16px">БСО Корпоратив</h2>
        <p style="margin:0 0 24px;color:#9A9A9A">Ваш код для входа:</p>
        <div style="font-size:48px;font-weight:bold;letter-spacing:12px;color:#FF6B00;text-align:center;margin:24px 0">${code}</div>
        <p style="color:#6A6A6A;font-size:13px;margin:0">Код действует 10 минут. Не передавайте его никому.</p>
      </div>
    `,
  }).then(() => {
    logger.info('OTP sent', { email: normalised })
    res.json({ success: true, message: 'Код отправлен на вашу почту' })
  }).catch(err => {
    logger.error('OTP email failed', { email: normalised, error: err.message })
    // В dev-режиме выводим код в лог чтобы тестировать без SMTP
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[DEV] OTP code', { email: normalised, code })
      return res.json({ success: true, message: '[DEV] Код в логах сервера' })
    }
    res.status(500).json({ error: 'Не удалось отправить письмо. Попробуйте позже.' })
  })
})

// POST /api/auth/verify-otp
router.post('/verify-otp', otpLimiter, (req, res) => {
  const { email, code } = req.body
  if (!email || !code) {
    return res.status(400).json({ error: 'Email и код обязательны' })
  }

  const normalised = email.trim().toLowerCase()
  const record = db.prepare('SELECT * FROM otp_codes WHERE email = ?').get(normalised)

  if (!record) {
    return res.status(400).json({ error: 'Сначала запросите код' })
  }

  if (Date.now() > record.expires_at) {
    db.prepare('DELETE FROM otp_codes WHERE email = ?').run(normalised)
    return res.status(400).json({ error: 'Код истёк. Запросите новый.' })
  }

  if (record.code !== String(code).trim()) {
    const attempts = record.attempts + 1
    if (attempts >= 3) {
      db.prepare('DELETE FROM otp_codes WHERE email = ?').run(normalised)
      logger.warn('OTP max attempts reached', { email: normalised })
      return res.status(400).json({ error: 'Превышено количество попыток. Запросите новый код.' })
    }
    db.prepare('UPDATE otp_codes SET attempts = ? WHERE email = ?').run(attempts, normalised)
    logger.warn('OTP wrong code', { email: normalised, attempt: attempts })
    return res.status(400).json({ error: `Неверный код. Осталось попыток: ${3 - attempts}` })
  }

  // Код верный — удаляем
  db.prepare('DELETE FROM otp_codes WHERE email = ?').run(normalised)

  // Создаём или получаем пользователя
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalised)
  if (!user) {
    const id = uuidv4()
    const isAdmin = isAdminEmail(normalised) ? 1 : 0
    db.prepare(
      'INSERT INTO users (id, email, is_admin) VALUES (?, ?, ?)'
    ).run(id, normalised, isAdmin)
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    logger.info('New user created', { email: normalised, id, isAdmin: !!isAdmin })
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, isAdmin: !!user.is_admin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  logger.info('Login success', { email: normalised, userId: user.id })

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      avatarUrl: user.avatar_url,
      badgeId: user.badge_id,
      onboardingDone: !!user.onboarding_done,
      isAdmin: !!user.is_admin,
    },
  })
})

// POST /api/auth/dev-login — упрощённый вход только в TEST (admin/admin)
router.post('/dev-login', (req, res) => {
  if (!ALLOW_DEV_LOGIN) {
    return res.status(404).json({ error: 'Not found' })
  }

  const { login, password } = req.body
  if (login !== 'admin' || password !== 'admin') {
    logger.warn('Dev-login: wrong credentials', { login })
    return res.status(401).json({ error: 'Неверный логин или пароль' })
  }

  // Находим или создаём тестового администратора
  let user = db.prepare("SELECT * FROM users WHERE email = 'admin'").get()
  if (!user) {
    const id = uuidv4()
    db.prepare(
      "INSERT INTO users (id, email, name, is_admin, onboarding_done) VALUES (?, 'admin', 'Admin', 1, 1)"
    ).run(id)
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    logger.info('Dev-login: admin user created', { id })
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, isAdmin: true },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  logger.info('Dev-login success', { userId: user.id })
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      avatarUrl: user.avatar_url,
      badgeId: user.badge_id,
      onboardingDone: true,
      isAdmin: true,
    },
  })
})

// POST /api/auth/magic-login — вход по одноразовой/бессрочной magic-ссылке
router.post('/magic-login', (req, res) => {
  const { token } = req.body
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Токен обязателен' })
  }

  const link = db.prepare('SELECT * FROM magic_links WHERE magic_token = ?').get(token.trim())
  if (!link) {
    logger.warn('Magic login: invalid token', { token: token.slice(0, 8) + '…' })
    return res.status(400).json({ error: 'Ссылка недействительна' })
  }

  const now = Date.now()
  if (link.expires_at && now > link.expires_at) {
    logger.warn('Magic login: expired token', { userId: link.user_id })
    return res.status(400).json({ error: 'Ссылка истекла. Запросите новую у администратора.' })
  }
  if (link.used_at || link.revoked) {
    logger.warn('Magic login: already used token', { userId: link.user_id })
    return res.status(400).json({ error: 'Ссылка уже была использована. Запросите новую у администратора.' })
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(link.user_id)
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' })
  }
  if (user.is_banned) {
    logger.warn('Magic login: banned user', { userId: user.id, email: user.email })
    return res.status(403).json({ error: 'Учётная запись заблокирована' })
  }

  const jwt_token = jwt.sign(
    { userId: user.id, email: user.email, isAdmin: !!user.is_admin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  db.prepare("UPDATE magic_links SET used_at = datetime('now'), revoked = 1 WHERE id = ?").run(link.id)

  logger.info('Magic link login success', { userId: user.id, email: user.email })

  res.json({
    token: jwt_token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      avatarUrl: user.avatar_url,
      badgeId: user.badge_id,
      onboardingDone: !!user.onboarding_done,
      isAdmin: !!user.is_admin,
    },
  })
})

module.exports = router
