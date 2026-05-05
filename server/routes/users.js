const express = require('express')
const router = express.Router()
const { verifyJWT } = require('../middleware/auth')
const db = require('../db')
const logger = require('../logger')

// GET /api/users — список всех сотрудников (кроме забаненных)
router.get('/', verifyJWT, (req, res) => {
  const users = db.prepare(`
    SELECT id, email, name, department, avatar_url, badge_id, onboarding_done, created_at
    FROM users
    WHERE is_banned = 0 AND onboarding_done = 1
    ORDER BY name
  `).all()

  const result = users.map(u => ({
    ...u,
    hobbies: db.prepare(`
      SELECT h.id, h.label, h.emoji, h.category
      FROM user_hobbies uh
      JOIN hobbies h ON h.id = uh.hobby_id
      WHERE uh.user_id = ?
    `).all(u.id),
  }))

  res.json(result)
})

// GET /api/users/me — текущий пользователь
router.get('/me', verifyJWT, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  const hobbies = db.prepare(`
    SELECT h.id, h.label, h.emoji, h.category
    FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id
    WHERE uh.user_id = ?
  `).all(user.id)

  res.json({ ...user, hobbies })
})

// GET /api/users/:id
router.get('/:id', verifyJWT, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, department, avatar_url, badge_id, onboarding_done FROM users WHERE id = ? AND is_banned = 0'
  ).get(req.params.id)

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })

  const hobbies = db.prepare(`
    SELECT h.id, h.label, h.emoji, h.category
    FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id
    WHERE uh.user_id = ?
  `).all(user.id)

  res.json({ ...user, hobbies })
})

// PUT /api/users/:id — онбординг / обновление профиля
router.put('/:id', verifyJWT, (req, res) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({ error: 'Можно редактировать только свой профиль' })
  }

  const { name, department, avatarUrl, badgeId, hobbyIds } = req.body

  if (name !== undefined || department !== undefined || avatarUrl !== undefined || badgeId !== undefined) {
    db.prepare(`
      UPDATE users SET
        name        = COALESCE(?, name),
        department  = COALESCE(?, department),
        avatar_url  = COALESCE(?, avatar_url),
        badge_id    = COALESCE(?, badge_id),
        onboarding_done = CASE WHEN ? IS NOT NULL AND ? IS NOT NULL THEN 1 ELSE onboarding_done END
      WHERE id = ?
    `).run(name ?? null, department ?? null, avatarUrl ?? null, badgeId ?? null,
            name, department, req.user.id)
  }

  if (Array.isArray(hobbyIds)) {
    db.prepare('DELETE FROM user_hobbies WHERE user_id = ?').run(req.user.id)
    const insert = db.prepare('INSERT OR IGNORE INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)')
    const insertMany = db.transaction((ids) => {
      for (const hid of ids) insert.run(req.user.id, hid)
    })
    insertMany(hobbyIds)
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  const hobbies = db.prepare(`
    SELECT h.id, h.label, h.emoji, h.category
    FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id
    WHERE uh.user_id = ?
  `).all(req.user.id)

  logger.info('User profile updated', { userId: req.user.id })
  res.json({ ...updated, hobbies })
})

// GET /api/users/hobbies/all — справочник хобби
router.get('/hobbies/all', verifyJWT, (req, res) => {
  res.json(db.prepare('SELECT * FROM hobbies ORDER BY category, label').all())
})

module.exports = router
