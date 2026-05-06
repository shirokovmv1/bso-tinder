const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const rateLimit = require('express-rate-limit')
const { verifyJWT } = require('../middleware/auth')
const db = require('../db')
const logger = require('../logger')

const reactionsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много реакций. Подождите немного.' },
})

// GET /api/reactions/types — публичный справочник типов реакций
router.get('/types', verifyJWT, (_req, res) => {
  res.json(db.prepare(
    'SELECT id, emoji, label, sort_order FROM reaction_types WHERE is_active = 1 ORDER BY sort_order, label'
  ).all())
})

// GET /api/reactions/received — реакции, полученные текущим пользователем
router.get('/received', verifyJWT, (req, res) => {
  const rows = db.prepare(`
    SELECT r.id, r.from_user_id, r.emoji_type, r.created_at,
           u.name as from_name, u.avatar_url as from_avatar,
           rt.emoji, rt.label
    FROM reactions r
    JOIN users u  ON u.id = r.from_user_id
    JOIN reaction_types rt ON rt.id = r.emoji_type
    WHERE r.to_user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id)
  res.json(rows)
})

// GET /api/reactions/sent — реакции, отправленные текущим пользователем
router.get('/sent', verifyJWT, (req, res) => {
  const rows = db.prepare(`
    SELECT from_user_id, to_user_id, emoji_type FROM reactions WHERE from_user_id = ?
  `).all(req.user.id)
  res.json(rows)
})

// POST /api/reactions — отправить реакцию
router.post('/', verifyJWT, reactionsLimiter, (req, res) => {
  const { to_user_id, reaction_type_id } = req.body
  if (!to_user_id || !reaction_type_id) {
    return res.status(400).json({ error: 'to_user_id и reaction_type_id обязательны' })
  }
  if (to_user_id === req.user.id) {
    return res.status(400).json({ error: 'Нельзя реагировать на себя' })
  }

  const target = db.prepare('SELECT id FROM users WHERE id = ? AND is_banned = 0').get(to_user_id)
  if (!target) return res.status(404).json({ error: 'Пользователь не найден' })

  const rt = db.prepare('SELECT id FROM reaction_types WHERE id = ? AND is_active = 1').get(reaction_type_id)
  if (!rt) return res.status(400).json({ error: 'Тип реакции не найден' })

  // Если уже отправлена такая же — удаляем (toggle)
  const existing = db.prepare(
    'SELECT id FROM reactions WHERE from_user_id = ? AND to_user_id = ? AND emoji_type = ?'
  ).get(req.user.id, to_user_id, reaction_type_id)

  if (existing) {
    db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id)
    return res.json({ action: 'removed' })
  }

  const id = uuidv4()
  db.prepare(
    'INSERT INTO reactions (id, from_user_id, to_user_id, emoji_type) VALUES (?, ?, ?, ?)'
  ).run(id, req.user.id, to_user_id, reaction_type_id)

  logger.info('Reaction sent', { from: req.user.id, to: to_user_id, type: reaction_type_id })
  res.status(201).json({ action: 'added', id })
})

module.exports = router
