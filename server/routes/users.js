const express = require('express')
const router = express.Router()
const { verifyJWT } = require('../middleware/auth')
const db = require('../db')
const logger = require('../logger')

// Поля хобби для JOIN-запросов
const HOBBY_FIELDS = 'h.id, h.parent_id, h.label, h.emoji, h.sort_order, h.is_active'

function getUserHobbies(userId) {
  return db.prepare(`
    SELECT ${HOBBY_FIELDS}
    FROM user_hobbies uh
    JOIN hobbies h ON h.id = uh.hobby_id
    WHERE uh.user_id = ?
  `).all(userId)
}

// GET /api/users — список всех сотрудников (кроме забаненных)
router.get('/', verifyJWT, (req, res) => {
  const users = db.prepare(`
    SELECT id, email, name, department, avatar_url, badge_id,
           gender, experience_months, pitch, badge_title, badge_emoji, badge_reason,
           onboarding_done, created_at
    FROM users
    WHERE is_banned = 0 AND onboarding_done = 1
    ORDER BY name
  `).all()

  const result = users.map(u => ({
    ...u,
    hobbies: getUserHobbies(u.id),
  }))

  res.json(result)
})

// GET /api/users/me — текущий пользователь
router.get('/me', verifyJWT, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ ...user, hobbies: getUserHobbies(user.id) })
})

// GET /api/users/hobbies/all — справочник хобби (иерархический)
router.get('/hobbies/all', verifyJWT, (req, res) => {
  const hobbies = db.prepare(`
    SELECT id, parent_id, label, emoji, sort_order, is_active
    FROM hobbies
    WHERE is_active = 1
    ORDER BY
      CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
      sort_order,
      label
  `).all()
  res.json(hobbies)
})

// GET /api/users/:id
router.get('/:id', verifyJWT, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, name, department, avatar_url, badge_id,
           gender, experience_months, pitch, badge_title, badge_emoji, badge_reason,
           onboarding_done
    FROM users
    WHERE id = ? AND is_banned = 0
  `).get(req.params.id)

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
  res.json({ ...user, hobbies: getUserHobbies(user.id) })
})

// PUT /api/users/:id — онбординг / обновление профиля
router.put('/:id', verifyJWT, (req, res) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({ error: 'Можно редактировать только свой профиль' })
  }

  const { name, department, avatarUrl, badgeId, hobbyIds, gender, experience_months } = req.body

  if (name !== undefined || department !== undefined || avatarUrl !== undefined ||
      badgeId !== undefined || gender !== undefined || experience_months !== undefined) {
    db.prepare(`
      UPDATE users SET
        name               = COALESCE(?, name),
        department         = COALESCE(?, department),
        avatar_url         = COALESCE(?, avatar_url),
        badge_id           = COALESCE(?, badge_id),
        gender             = COALESCE(?, gender),
        experience_months  = COALESCE(?, experience_months),
        onboarding_done    = CASE WHEN ? IS NOT NULL AND ? IS NOT NULL THEN 1 ELSE onboarding_done END
      WHERE id = ?
    `).run(
      name ?? null,
      department ?? null,
      avatarUrl ?? null,
      badgeId ?? null,
      gender ?? null,
      experience_months !== undefined ? experience_months : null,
      name, department,
      req.user.id
    )
  }

  if (Array.isArray(hobbyIds)) {
    db.prepare('DELETE FROM user_hobbies WHERE user_id = ?').run(req.user.id)
    const insert = db.prepare('INSERT OR IGNORE INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)')
    db.transaction((ids) => {
      for (const hid of ids) insert.run(req.user.id, hid)
    })(hobbyIds)
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  logger.info('User profile updated', { userId: req.user.id })
  res.json({ ...updated, hobbies: getUserHobbies(req.user.id) })
})

module.exports = router
