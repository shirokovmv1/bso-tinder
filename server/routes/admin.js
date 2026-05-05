const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { verifyAdmin } = require('../middleware/adminAuth')
const db = require('../db')
const logger = require('../logger')

// GET /api/admin/users
router.get('/users', verifyAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, email, name, department, is_admin, is_banned, onboarding_done, created_at
    FROM users ORDER BY created_at DESC
  `).all()
  res.json(users)
})

// PATCH /api/admin/users/:id/ban — toggle бан
router.patch('/users/:id/ban', verifyAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
  if (user.is_admin) return res.status(400).json({ error: 'Нельзя заблокировать администратора' })

  const newBanned = user.is_banned ? 0 : 1
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(newBanned, user.id)
  logger.warn('User ban toggled', { targetId: user.id, email: user.email, banned: !!newBanned, by: req.user.id })
  res.json({ id: user.id, is_banned: newBanned })
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', verifyAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
  if (user.is_admin) return res.status(400).json({ error: 'Нельзя удалить администратора' })

  db.prepare('DELETE FROM users WHERE id = ?').run(user.id)
  logger.warn('User deleted', { targetId: user.id, email: user.email, by: req.user.id })
  res.json({ success: true })
})

// GET /api/admin/logs — последние 100 строк
router.get('/logs', verifyAdmin, (req, res) => {
  const logPath = path.join(__dirname, '..', 'logs', 'app.log')
  if (!fs.existsSync(logPath)) return res.json({ lines: [] })

  const content = fs.readFileSync(logPath, 'utf8')
  const lines = content.trim().split('\n').filter(Boolean).slice(-100)
  res.json({ lines })
})

// GET /api/admin/settings — текущие SMTP настройки (пароль скрыт)
router.get('/settings', verifyAdmin, (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'smtp_%'").all()
  const settings = Object.fromEntries(rows.map(r => [r.key, r.key === 'smtp_pass' ? '••••••••' : r.value]))
  res.json(settings)
})

// PUT /api/admin/settings/smtp — обновить SMTP без перезапуска
router.put('/settings/smtp', verifyAdmin, (req, res) => {
  const allowed = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from']
  const upsert = db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  )
  const upsertAll = db.transaction((data) => {
    for (const [k, v] of Object.entries(data)) {
      if (allowed.includes(k) && v !== undefined) upsert.run(k, String(v))
    }
  })
  upsertAll(req.body)
  logger.info('SMTP settings updated', { by: req.user.id })
  res.json({ success: true })
})

// POST /api/admin/seed — демо-данные (только dev)
router.post('/seed', verifyAdmin, (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Seed недоступен в production' })
  }

  const depts = ['Логистика', 'Стройка', 'IT', 'Финансы', 'HR']
  const names = [
    'Алексей Громов', 'Мария Соколова', 'Дмитрий Волков', 'Екатерина Лебедева',
    'Сергей Новиков', 'Ольга Петрова', 'Никита Морозов', 'Анна Козлова',
    'Павел Зайцев', 'Юлия Смирнова',
  ]
  const allHobbies = db.prepare('SELECT id FROM hobbies').all().map(h => h.id)

  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (id, email, name, department, avatar_url, badge_id, onboarding_done) VALUES (?, ?, ?, ?, ?, ?, 1)'
  )
  const insertHobby = db.prepare('INSERT OR IGNORE INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)')

  const seed = db.transaction(() => {
    let count = 0
    for (const name of names) {
      const id = uuidv4()
      const email = `${name.toLowerCase().replace(/\s/g, '.')}@bso-cc.ru`
      const dept = depts[Math.floor(Math.random() * depts.length)]
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
      insertUser.run(id, email, name, dept, avatar, 'allrounder')
      const picked = allHobbies.sort(() => 0.5 - Math.random()).slice(0, 5 + Math.floor(Math.random() * 3))
      for (const hid of picked) insertHobby.run(id, hid)
      count++
    }
    return count
  })

  const inserted = seed()
  logger.info('Seed executed', { inserted, by: req.user.id })
  res.json({ success: true, inserted })
})

module.exports = router
