const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const { verifyJWT } = require('../middleware/auth')
const db = require('../db')
const logger = require('../logger')
const { generateMatch } = require('../ai')
const MAX_MATCH_RESULTS = 50

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

function getUserWithHobbies(uid) {
  const user = db.prepare(`
    SELECT id, email, name, last_name, first_name, middle_name, position,
           department, birthday_day, birthday_month, avatar_url, badge_id,
           gender, experience_months, about_short, work_details, current_interests,
           last_movies, last_books, last_songs, zodiac_sign, fav_color,
           pitch, badge_title, badge_emoji, badge_reason
    FROM users
    WHERE id = ? AND is_banned = 0
  `).get(uid)
  if (!user) return null
  return { ...user, hobbies: getHobbies(uid) }
}

function getMatchLevel(score) {
  if (score >= 90) return { id: 'full', label: 'Полный матч' }
  if (score >= 70) return { id: 'strong', label: 'Сильный матч' }
  if (score >= 50) return { id: 'moderate', label: 'Умеренный матч' }
  return { id: 'none', label: 'Матча нет' }
}

const ZODIAC_ELEMENTS = {
  fire:  new Set(['aries', 'leo', 'sagittarius']),
  earth: new Set(['taurus', 'virgo', 'capricorn']),
  air:   new Set(['gemini', 'libra', 'aquarius']),
  water: new Set(['cancer', 'scorpio', 'pisces']),
}

function genreOverlap(aStr, bStr, cap) {
  const a = (aStr || '').split(',').map(s => s.trim()).filter(Boolean)
  const b = new Set((bStr || '').split(',').map(s => s.trim()).filter(Boolean))
  return Math.min(cap, a.filter(g => b.has(g)).length * 2)
}

function expBracket(months) {
  if (!months) return -1
  if (months < 6) return 0
  if (months < 12) return 1
  if (months < 24) return 2
  if (months < 60) return 3
  return 4
}

function computeOfflineMatch(a, b) {
  const aHobbies = a.hobbies || []
  const bHobbies = b.hobbies || []
  const bIds = new Set(bHobbies.map(h => h.id))
  const aIds = new Set(aHobbies.map(h => h.id))
  const shared = aHobbies.filter(h => bIds.has(h.id))

  const minHobbyCount = Math.max(Math.min(aHobbies.length, bHobbies.length), 1)
  const hobbyScore = Math.min(75, Math.round((shared.length / minHobbyCount) * 75))

  const aParents = new Set(aHobbies.map(h => h.parent_id).filter(Boolean))
  const bParents = new Set(bHobbies.map(h => h.parent_id).filter(Boolean))
  let categoryBonus = 0
  aParents.forEach(parentId => { if (bParents.has(parentId)) categoryBonus += 4 })
  categoryBonus = Math.min(15, categoryBonus)

  let birthdayBonus = 0
  if (a.birthday_day && b.birthday_day && a.birthday_day === b.birthday_day) birthdayBonus += 5
  if (a.birthday_month && b.birthday_month && a.birthday_month === b.birthday_month) birthdayBonus += 5

  // Жанры фильмов/книг/музыки
  const movieBonus = genreOverlap(a.last_movies, b.last_movies, 8)
  const bookBonus  = genreOverlap(a.last_books,  b.last_books,  8)
  const musicBonus = genreOverlap(a.last_songs,  b.last_songs,  8)

  // Зодиак: точное совпадение +8, одна стихия +4
  let zodiacBonus = 0
  if (a.zodiac_sign && b.zodiac_sign) {
    if (a.zodiac_sign === b.zodiac_sign) {
      zodiacBonus = 8
    } else {
      const elem = Object.entries(ZODIAC_ELEMENTS).find(([, s]) => s.has(a.zodiac_sign))?.[0]
      if (elem && ZODIAC_ELEMENTS[elem].has(b.zodiac_sign)) zodiacBonus = 4
    }
  }

  // Любимый цвет +3, отдел +5, стаж одна скобка +3
  const colorBonus = (a.fav_color && a.fav_color === b.fav_color) ? 3 : 0
  const deptBonus  = (a.department && a.department === b.department) ? 5 : 0
  const expBonus   = expBracket(a.experience_months) >= 0 &&
                     expBracket(a.experience_months) === expBracket(b.experience_months) ? 3 : 0

  const score = Math.min(100,
    hobbyScore + categoryBonus + birthdayBonus +
    movieBonus + bookBonus + musicBonus +
    zodiacBonus + colorBonus + deptBonus + expBonus
  )
  const level = getMatchLevel(score)
  const sharedText = shared.length
    ? `Общие темы: ${shared.slice(0, 3).map(h => h.label).join(', ')}.`
    : 'Вы уникальны. Пока точных совпадений нет, попробуйте расширить интересы.'

  return {
    score,
    level,
    sharedHobbies: shared,
    uniqueA: aHobbies.filter(h => !bIds.has(h.id)),
    uniqueB: bHobbies.filter(h => !aIds.has(h.id)),
    pitch: score >= 50
      ? `${level.label}. ${sharedText} Это хороший повод начать разговор на корпоративном мероприятии.`
      : sharedText,
  }
}

function groupMatchesByDepartment(matches) {
  const map = new Map()
  for (const match of matches) {
    const department = match.user.department || 'Без отдела'
    if (!map.has(department)) map.set(department, { department, count: 0, matches: [] })
    const group = map.get(department)
    group.count += 1
    group.matches.push(match)
  }
  return Array.from(map.values()).sort((a, b) => a.department.localeCompare(b.department, 'ru'))
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

  // Нет хобби — не ошибка, просто score=0 и дефолтный айсбрейкер
  const result = (aHobbies.length && bHobbies.length)
    ? computeMatch(aHobbies, bHobbies)
    : {
        score: 0,
        shared: [],
        uniqueA: aHobbies,
        uniqueB: bHobbies,
        icebreaker: pickRandom(ICEBREAKERS.low)(),
      }

  const [pairAId, pairBId] = userAId < userBId ? [userAId, userBId] : [userBId, userAId]
  const sharedHobbyIds = JSON.stringify(result.shared.map(h => h.id))
  const existing = db.prepare(`
    SELECT id FROM matches
    WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)
  `).get(pairAId, pairBId, pairBId, pairAId)

  const matchId = existing?.id ?? uuidv4()
  if (existing) {
    db.prepare(`
      UPDATE matches
      SET user_a_id = ?, user_b_id = ?, score = ?, icebreaker = ?, shared_hobby_ids = ?
      WHERE id = ?
    `).run(pairAId, pairBId, result.score, result.icebreaker, sharedHobbyIds, matchId)
  } else {
    db.prepare(`
      INSERT INTO matches (id, user_a_id, user_b_id, score, icebreaker, shared_hobby_ids)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(matchId, pairAId, pairBId, result.score, result.icebreaker, sharedHobbyIds)
  }

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

// POST /api/match/ai — AI-улучшение конкретного матча по запросу
router.post('/ai', verifyJWT, async (req, res) => {
  const { userBId } = req.body
  if (!userBId) return res.status(400).json({ error: 'Передайте userBId' })
  const userA = getUserWithHobbies(req.user.id)
  const userB = getUserWithHobbies(userBId)
  if (!userA || !userB) return res.status(404).json({ error: 'Пользователь не найден' })
  const result = await generateMatch(userA, userB)
  if (!result) return res.status(503).json({ error: 'AI недоступен' })
  res.json(result)
})

// POST /api/match/me — пересчитать текущие совпадения без сохранения результата
router.post('/me', verifyJWT, (req, res) => {
  const currentUser = getUserWithHobbies(req.user.id)
  if (!currentUser) return res.status(404).json({ error: 'Пользователь не найден' })

  const candidates = db.prepare(`
    SELECT id
    FROM users
    WHERE id != ? AND is_banned = 0 AND is_admin = 0 AND onboarding_done = 1
  `).all(req.user.id)

  const matches = candidates
    .map(row => getUserWithHobbies(row.id))
    .filter(Boolean)
    .map(user => {
      const result = computeOfflineMatch(currentUser, user)
      return {
        user: {
          id: user.id,
          name: [user.last_name, user.first_name].filter(Boolean).join(' ') || user.name || user.email,
          department: user.department,
          position: user.position,
          avatar_url: user.avatar_url,
          badge_id: user.badge_id,
          badge_title: user.badge_title,
          badge_emoji: user.badge_emoji,
          pitch: user.pitch,
          about_short: user.about_short,
          work_details: user.work_details,
          current_interests: user.current_interests,
        },
        score: result.score,
        level: result.level,
        pitch: result.pitch,
        sharedHobbies: result.sharedHobbies,
      }
    })
    .filter(match => match.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCH_RESULTS)

  logger.info('Matches computed', { userId: req.user.id, count: matches.length })
  res.json({
    groups: groupMatchesByDepartment(matches),
    total: matches.length,
    emptyMessage: matches.length ? '' : 'Вы уникальны. Пока точных совпадений нет, попробуйте расширить интересы.',
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
