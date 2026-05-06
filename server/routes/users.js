const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const { verifyJWT } = require('../middleware/auth')
const db = require('../db')
const logger = require('../logger')
const ai = require('../ai')

// Поля хобби для JOIN-запросов
const HOBBY_FIELDS = 'h.id, h.parent_id, h.label, h.emoji, h.sort_order, h.is_active'
const MIN_NAME_LENGTH = 2
const MAX_DEPARTMENT_LENGTH = 80
const MAX_AVATAR_DATA_URL_LENGTH = 450000

function isValidAvatarValue(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.startsWith('data:image/')) return trimmed.length <= MAX_AVATAR_DATA_URL_LENGTH
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed.length <= 2048
  return false
}

const toggleReactionTx = db.transaction((fromUserId, toUserId, reactionTypeId) => {
  const existing = db.prepare(
    'SELECT id FROM reactions WHERE from_user_id = ? AND to_user_id = ? AND emoji_type = ?'
  ).get(fromUserId, toUserId, reactionTypeId)

  if (existing) {
    db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id)
    return { action: 'removed' }
  }

  const id = uuidv4()
  db.prepare('INSERT INTO reactions (id, from_user_id, to_user_id, emoji_type) VALUES (?, ?, ?, ?)')
    .run(id, fromUserId, toUserId, reactionTypeId)
  return { action: 'added', id }
})

function getUserHobbies(userId) {
  return db.prepare(`
    SELECT ${HOBBY_FIELDS}
    FROM user_hobbies uh
    JOIN hobbies h ON h.id = uh.hobby_id
    WHERE uh.user_id = ?
  `).all(userId)
}

// Агрегированные реакции для одного или нескольких пользователей
function getReactionCounts(userIds) {
  if (!userIds.length) return {}
  const placeholders = userIds.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT r.to_user_id, rt.id as reaction_type_id, rt.emoji, rt.label, COUNT(*) as count
    FROM reactions r
    JOIN reaction_types rt ON rt.id = r.emoji_type
    WHERE r.to_user_id IN (${placeholders})
    GROUP BY r.to_user_id, r.emoji_type
    ORDER BY count DESC
  `).all(...userIds)

  const map = {}
  for (const row of rows) {
    if (!map[row.to_user_id]) map[row.to_user_id] = []
    map[row.to_user_id].push({
      reaction_type_id: row.reaction_type_id,
      emoji: row.emoji,
      label: row.label,
      count: row.count,
    })
  }
  return map
}

// GET /api/users — список всех сотрудников (кроме забаненных)
router.get('/', verifyJWT, (req, res) => {
  const users = db.prepare(`
    SELECT id, email, name, department, avatar_url, badge_id,
           gender, experience_months, pitch, badge_title, badge_emoji, badge_reason,
           onboarding_done, created_at
    FROM users
    WHERE is_banned = 0 AND onboarding_done = 1 AND is_admin = 0
    ORDER BY name
  `).all()

  const reactionMap = getReactionCounts(users.map(u => u.id))

  const result = users.map(u => ({
    ...u,
    hobbies: getUserHobbies(u.id),
    reaction_counts: reactionMap[u.id] ?? [],
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
  const reactionMap = getReactionCounts([user.id])
  res.json({ ...user, hobbies: getUserHobbies(user.id), reaction_counts: reactionMap[user.id] ?? [] })
})

// POST /api/users/:id/react — поставить реакцию (альтернативный маршрут)
router.post('/:id/react', verifyJWT, (req, res) => {
  const toUserId = req.params.id
  const { emoji_type } = req.body   // emoji_type = reaction_type_id (UUID)

  if (!emoji_type) return res.status(400).json({ error: 'emoji_type обязателен' })
  if (toUserId === req.user.id) return res.status(400).json({ error: 'Нельзя реагировать на себя' })

  const target = db.prepare('SELECT id FROM users WHERE id = ? AND is_banned = 0').get(toUserId)
  if (!target) return res.status(404).json({ error: 'Пользователь не найден' })

  const rt = db.prepare('SELECT id FROM reaction_types WHERE id = ? AND is_active = 1').get(emoji_type)
  if (!rt) return res.status(400).json({ error: 'Тип реакции не найден' })

  try {
    const result = toggleReactionTx(req.user.id, toUserId, emoji_type)
    logger.info('Reaction toggled', { from: req.user.id, to: toUserId, type: emoji_type, action: result.action })
    return res.status(result.action === 'added' ? 201 : 200).json(result)
  } catch (err) {
    const isUniqueViolation = err && (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || String(err.message || '').includes('UNIQUE constraint failed'))
    if (isUniqueViolation) {
      logger.warn('Reaction unique conflict handled', { from: req.user.id, to: toUserId, type: emoji_type })
      return res.status(200).json({ action: 'added' })
    }
    logger.error('Reaction toggle failed', { error: err.message, from: req.user.id, to: toUserId, type: emoji_type })
    return res.status(500).json({ error: 'Не удалось обновить реакцию' })
  }
})

// PUT /api/users/:id — онбординг / обновление профиля
router.put('/:id', verifyJWT, async (req, res) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({ error: 'Можно редактировать только свой профиль' })
  }

  const existing = db.prepare('SELECT onboarding_done FROM users WHERE id = ?').get(req.user.id)
  const {
    name,
    department,
    avatarUrl,
    avatar_url,
    badgeId,
    badge_id,
    hobbyIds,
    gender,
    experience_months,
  } = req.body
  const normalizedAvatar = avatarUrl !== undefined ? avatarUrl : avatar_url
  const normalizedBadgeId = badgeId !== undefined ? badgeId : badge_id

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < MIN_NAME_LENGTH) {
      return res.status(400).json({ error: `name должен быть строкой длиной не менее ${MIN_NAME_LENGTH} символов` })
    }
  }
  if (department !== undefined) {
    if (typeof department !== 'string' || department.trim().length < 2 || department.trim().length > MAX_DEPARTMENT_LENGTH) {
      return res.status(400).json({ error: `department должен быть строкой длиной 2..${MAX_DEPARTMENT_LENGTH}` })
    }
  }
  if (normalizedAvatar !== undefined && !isValidAvatarValue(normalizedAvatar)) {
    return res.status(400).json({ error: 'avatar_url должен быть data:image/* (до 300KB) или http/https URL' })
  }

  if (name !== undefined || department !== undefined || normalizedAvatar !== undefined ||
      normalizedBadgeId !== undefined || gender !== undefined || experience_months !== undefined) {
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
      normalizedAvatar ?? null,
      normalizedBadgeId ?? null,
      gender ?? null,
      experience_months !== undefined ? experience_months : null,
      name ?? null, department ?? null,
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

  // Генерируем AI-питч при первом завершении онбординга
  if (updated.onboarding_done && !existing?.onboarding_done) {
    const hobbies = db.prepare(
      'SELECT h.label FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id WHERE uh.user_id = ?'
    ).all(req.user.id).map(h => h.label)

    ai.generatePitch({
      department: updated.department,
      experienceMonths: updated.experience_months,
      hobbies,
    }).then(result => {
      // Если LLM не настроен или упал — используем template-fallback
      const final = result ?? ai.generatePitchAndBadge({
        gender: updated.gender,
        experienceMonths: updated.experience_months,
        department: updated.department,
        hobbies,
      })
      if (!final) return
      db.prepare(
        'UPDATE users SET pitch=?, badge_title=?, badge_emoji=?, badge_reason=? WHERE id=?'
      ).run(final.pitch, final.badge_title, final.badge_emoji, final.badge_reason, req.user.id)
      logger.info('pitch saved', { userId: req.user.id, source: result ? 'llm' : 'template' })
    }).catch(e => logger.error('AI pitch save failed', { error: e.message }))
  }

  logger.info('User profile updated', { userId: req.user.id })
  res.json({ ...updated, hobbies: getUserHobbies(req.user.id) })
})

module.exports = router
