const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const { verifyJWT } = require('../middleware/auth')
const db = require('../db')
const logger = require('../logger')

const ICEBREAKERS = {
  high: [
    (s) => `Вы оба ${s[0].emoji} ${s[0].label}! Кто из вас продвинулся дальше?`,
    (s) => `${s[0].emoji} ${s[0].label} — ваша общая страсть. Уже договорились о совместной вылазке?`,
    (s) => `Целых ${s.length} общих интереса! Начнём с ${s[0].emoji} ${s[0].label}?`,
  ],
  medium: [
    (s) => `Общее: ${s.map(h => `${h.emoji} ${h.label}`).join(' и ')}. Есть о чём поговорить!`,
    (s) => `${s[0].emoji} ${s[0].label} объединяет вас — самое время познакомиться!`,
  ],
  low: [
    () => 'Разные интересы — лучший повод узнать что-то новое. Кто первый расскажет о своём хобби?',
    () => 'Новые знакомства начинаются с различий. Удивите друг друга!',
  ],
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function computeMatch(aHobbies, bHobbies) {
  const bIds = new Set(bHobbies.map(h => h.id))
  const aIds = new Set(aHobbies.map(h => h.id))
  const shared = aHobbies.filter(h => bIds.has(h.id))

  const base = shared.length / Math.max(aHobbies.length, bHobbies.length) * 60

  // Бонус по категориям через parent_id (только для дочерних хобби)
  const aParents = new Set(aHobbies.map(h => h.parent_id).filter(Boolean))
  const bParents = new Set(bHobbies.map(h => h.parent_id).filter(Boolean))
  let catBonus = 0
  aParents.forEach(p => { if (bParents.has(p)) catBonus += 10 })

  const score = Math.min(100, Math.round(base + catBonus))
  const tier = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'
  const icebreaker = shared.length > 0
    ? pickRandom(ICEBREAKERS[tier])(shared)
    : pickRandom(ICEBREAKERS.low)()

  return {
    score,
    shared,
    uniqueA: aHobbies.filter(h => !bIds.has(h.id)),
    uniqueB: bHobbies.filter(h => !aIds.has(h.id)),
    icebreaker,
  }
}

function getHobbies(uid) {
  return db.prepare(`
    SELECT h.id, h.parent_id, h.label, h.emoji
    FROM user_hobbies uh
    JOIN hobbies h ON h.id = uh.hobby_id
    WHERE uh.user_id = ?
  `).all(uid)
}

// POST /api/match
router.post('/', verifyJWT, (req, res) => {
  const { userAId, userBId } = req.body
  if (!userAId || !userBId || userAId === userBId) {
    return res.status(400).json({ error: 'Передайте два разных ID пользователей' })
  }

  const userA = db.prepare('SELECT id, name FROM users WHERE id = ? AND is_banned = 0').get(userAId)
  const userB = db.prepare('SELECT id, name FROM users WHERE id = ? AND is_banned = 0').get(userBId)

  if (!userA || !userB) {
    logger.warn('Match failed: user not found', { userAId, userBId })
    return res.status(404).json({ error: 'Один из пользователей не найден' })
  }

  const aHobbies = getHobbies(userAId)
  const bHobbies = getHobbies(userBId)

  if (!aHobbies.length || !bHobbies.length) {
    return res.status(400).json({ error: 'У одного из пользователей нет хобби' })
  }

  const result = computeMatch(aHobbies, bHobbies)

  const matchId = uuidv4()
  db.prepare(`
    INSERT INTO matches (id, user_a_id, user_b_id, score, icebreaker, shared_hobby_ids)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(matchId, userAId, userBId, result.score, result.icebreaker,
         JSON.stringify(result.shared.map(h => h.id)))

  logger.info('Match computed', { matchId, userAId, userBId, score: result.score })

  res.json({
    id: matchId,
    score: result.score,
    icebreaker: result.icebreaker,
    sharedHobbies: result.shared,
    uniqueA: result.uniqueA,
    uniqueB: result.uniqueB,
  })
})

// GET /api/match — последние мэтчи текущего пользователя
router.get('/', verifyJWT, (req, res) => {
  const matches = db.prepare(`
    SELECT m.*, ua.name as user_a_name, ub.name as user_b_name
    FROM matches m
    JOIN users ua ON ua.id = m.user_a_id
    JOIN users ub ON ub.id = m.user_b_id
    WHERE m.user_a_id = ? OR m.user_b_id = ?
    ORDER BY m.created_at DESC
    LIMIT 20
  `).all(req.user.id, req.user.id)

  res.json(matches)
})

module.exports = router
