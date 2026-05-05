require('dotenv').config()

const allowedExtraEmails = (process.env.ALLOWED_EXTRA_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

function isEmailAllowed(email) {
  const lower = email.toLowerCase()
  const domain = lower.split('@')[1]
  if (domain === process.env.ALLOWED_DOMAIN) return true
  if (allowedExtraEmails.includes(lower)) return true
  return false
}

function isAdminEmail(email) {
  return adminEmails.includes(email.toLowerCase())
}

module.exports = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  SMTP: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'BSO Tinder <noreply@bso-cc.ru>',
  },
  isEmailAllowed,
  isAdminEmail,
}
