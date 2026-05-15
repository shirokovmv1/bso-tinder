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
const MAX_POSITION_LENGTH = 120
const MAX_NAME_PART_LENGTH = 80
const MAX_AVATAR_DATA_URL_LENGTH = 7_000_000
const MAX_TEXT_LENGTH = 1000
const MIN_HOBBIES = 6
const ALLOWED_AVATAR_MIME = ['jpeg', 'jpg', 'png', 'webp', 'gif']

function isValidAvatarValue(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.startsWith('data:image/')) {
    const mime = trimmed.slice('data:image/'.length).split(/[;,]/)[0].toLowerCase()
    if (!ALLOWED_AVATAR_MIME.includes(mime)) return false
    return trimmed.length <= MAX_AVATAR_DATA_URL_LENGTH
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed.length <= 2048
  return false
}

function cleanText(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  return String(value).trim()
}

function buildDisplayName({ name, last_name, first_name, middle_name, fallback }) {
  const fullName = [last_name, first_name, middle_name]
    .map(v => String(v ?? '').trim())
    .filter(Boolean)
    .join(' ')
  return fullName || String(name ?? fallback ?? '').trim()
}

function isValidLongText(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.length <= MAX_TEXT_LENGTH)
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

function getUserHobbiesBatch(userIds) {
  if (!userIds.length) return {}
  const placeholders = userIds.map(() => '?').join(',')
  const rows = db.prepare(`
    SELECT uh.user_id, ${HOBBY_FIELDS}
    FROM user_hobbies uh
    JOIN hobbies h ON h.id = uh.hobby_id
    WHERE uh.user_id IN (${placeholders})
    ORDER BY h.sort_order, h.label
  `).all(...userIds)

  const map = {}
  for (const row of rows) {
    if (!map[row.user_id]) map[row.user_id] = []
    const { user_id, ...hobby } = row
    map[user_id].push(hobby)
  }
  return map
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
    SELECT id, email, name, last_name, first_name, middle_name, position,
           department, birthday_day, birthday_month, avatar_url, badge_id,
           gender, experience_months, about_short, work_details, current_interests,
           last_movies, last_books, last_songs, zodiac_sign, fav_color,
           pitch, badge_title, badge_emoji, badge_reason,
           onboarding_done, created_at
    FROM users
    WHERE is_banned = 0 AND onboarding_done = 1 AND is_admin = 0
    ORDER BY name
  `).all()

  const userIds = users.map(u => u.id)
  const reactionMap = getReactionCounts(userIds)
  const hobbiesMap = getUserHobbiesBatch(userIds)

  const result = users.map(u => ({
    ...u,
    hobbies: hobbiesMap[u.id] ?? [],
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
    SELECT id, email, name, last_name, first_name, middle_name, position,
           department, birthday_day, birthday_month, avatar_url, badge_id,
           gender, experience_months, about_short, work_details, current_interests,
           last_movies, last_books, last_songs, zodiac_sign, fav_color,
           pitch, badge_title, badge_emoji, badge_reason,
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
    last_name,
    first_name,
    middle_name,
    position,
    birthday_day,
    birthday_month,
    about_short,
    work_details,
    current_interests,
    last_movies,
    last_books,
    last_songs,
    zodiac_sign,
    fav_color,
  } = req.body
  const normalizedAvatar = avatarUrl !== undefined ? avatarUrl : avatar_url
  const normalizedBadgeId = badgeId !== undefined ? badgeId : badge_id

  const nextText = {
    name: cleanText(name),
    last_name: cleanText(last_name),
    first_name: cleanText(first_name),
    middle_name: cleanText(middle_name),
    position: cleanText(position),
    about_short: cleanText(about_short),
    work_details: cleanText(work_details),
    current_interests: cleanText(current_interests),
    last_movies: cleanText(last_movies),
    last_books: cleanText(last_books),
    last_songs: cleanText(last_songs),
    zodiac_sign: cleanText(zodiac_sign),
    fav_color: cleanText(fav_color),
  }

  const displayName = buildDisplayName({
    name: nextText.name,
    last_name: nextText.last_name,
    first_name: nextText.first_name,
    middle_name: nextText.middle_name,
    fallback: undefined,
  })

  if (name !== undefined || first_name !== undefined || last_name !== undefined || middle_name !== undefined) {
    if (!displayName || displayName.length < MIN_NAME_LENGTH) {
      return res.status(400).json({ error: `name должен быть строкой длиной не менее ${MIN_NAME_LENGTH} символов` })
    }
  }
  if (department !== undefined) {
    if (typeof department !== 'string' || department.trim().length < 2 || department.trim().length > MAX_DEPARTMENT_LENGTH) {
      return res.status(400).json({ error: `department должен быть строкой длиной 2..${MAX_DEPARTMENT_LENGTH}` })
    }
  }
  if (normalizedAvatar !== undefined && !isValidAvatarValue(normalizedAvatar)) {
    return res.status(400).json({ error: 'avatar_url должен быть data:image/jpeg|png|webp|gif (до 5MB) или http/https URL' })
  }
  if (![about_short, work_details, current_interests, last_movies, last_books, last_songs].every(isValidLongText)) {
    return res.status(400).json({ error: `Текстовые поля анкеты должны быть не длиннее ${MAX_TEXT_LENGTH} символов` })
  }
  if ([zodiac_sign, fav_color].some(value => value !== undefined && value !== null && String(value).trim().length > 80)) {
    return res.status(400).json({ error: 'zodiac_sign и fav_color должны быть не длиннее 80 символов' })
  }
  if (birthday_day !== undefined && birthday_day !== null && (!Number.isInteger(Number(birthday_day)) || Number(birthday_day) < 1 || Number(birthday_day) > 31)) {
    return res.status(400).json({ error: 'birthday_day должен быть числом 1..31' })
  }
  if (birthday_month !== undefined && birthday_month !== null && (!Number.isInteger(Number(birthday_month)) || Number(birthday_month) < 1 || Number(birthday_month) > 12)) {
    return res.status(400).json({ error: 'birthday_month должен быть числом 1..12' })
  }
  if (gender !== undefined && gender !== null && !['m', 'f'].includes(gender)) {
    return res.status(400).json({ error: 'gender должен быть "m" или "f"' })
  }
  if (experience_months !== undefined && experience_months !== null) {
    const exp = Number(experience_months)
    if (!Number.isInteger(exp) || exp < 0 || exp > 600) {
      return res.status(400).json({ error: 'experience_months должен быть целым числом 0..600' })
    }
  }
  if (position !== undefined && position !== null && String(position).trim().length > MAX_POSITION_LENGTH) {
    return res.status(400).json({ error: `position должен быть не длиннее ${MAX_POSITION_LENGTH} символов` })
  }
  if (middle_name !== undefined && middle_name !== null && String(middle_name).trim().length > MAX_NAME_PART_LENGTH) {
    return res.status(400).json({ error: `middle_name должен быть не длиннее ${MAX_NAME_PART_LENGTH} символов` })
  }

  if (name !== undefined || department !== undefined || normalizedAvatar !== undefined ||
      normalizedBadgeId !== undefined || gender !== undefined || experience_months !== undefined ||
      last_name !== undefined || first_name !== undefined || middle_name !== undefined ||
      position !== undefined || birthday_day !== undefined || birthday_month !== undefined ||
      about_short !== undefined || work_details !== undefined || current_interests !== undefined ||
      last_movies !== undefined || last_books !== undefined || last_songs !== undefined ||
      zodiac_sign !== undefined || fav_color !== undefined) {
    db.prepare(`
      UPDATE users SET
        name               = COALESCE(?, name),
        last_name          = COALESCE(?, last_name),
        first_name         = COALESCE(?, first_name),
        middle_name        = COALESCE(?, middle_name),
        position           = COALESCE(?, position),
        department         = COALESCE(?, department),
        birthday_day       = COALESCE(?, birthday_day),
        birthday_month     = COALESCE(?, birthday_month),
        avatar_url         = COALESCE(?, avatar_url),
        badge_id           = COALESCE(?, badge_id),
        gender             = COALESCE(?, gender),
        experience_months  = COALESCE(?, experience_months),
        about_short        = COALESCE(?, about_short),
        work_details       = COALESCE(?, work_details),
        current_interests  = COALESCE(?, current_interests),
        last_movies        = COALESCE(?, last_movies),
        last_books         = COALESCE(?, last_books),
        last_songs         = COALESCE(?, last_songs),
        zodiac_sign        = COALESCE(?, zodiac_sign),
        fav_color          = COALESCE(?, fav_color),
        onboarding_done    = CASE WHEN ? IS NOT NULL AND ? IS NOT NULL THEN 1 ELSE onboarding_done END
      WHERE id = ?
    `).run(
      displayName || null,
      nextText.last_name ?? null,
      nextText.first_name ?? null,
      nextText.middle_name ?? null,
      nextText.position ?? null,
      department ?? null,
      birthday_day !== undefined ? birthday_day : null,
      birthday_month !== undefined ? birthday_month : null,
      normalizedAvatar ?? null,
      normalizedBadgeId ?? null,
      gender ?? null,
      experience_months !== undefined ? experience_months : null,
      nextText.about_short ?? null,
      nextText.work_details ?? null,
      nextText.current_interests ?? null,
      nextText.last_movies ?? null,
      nextText.last_books ?? null,
      nextText.last_songs ?? null,
      nextText.zodiac_sign ?? null,
      nextText.fav_color ?? null,
      displayName || null, department ?? null,
      req.user.id
    )
  }

  if (Array.isArray(hobbyIds)) {
    if (hobbyIds.length < MIN_HOBBIES) {
      return res.status(400).json({ error: `Выберите минимум ${MIN_HOBBIES} интересов` })
    }
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
      ).run(
        String(final.pitch ?? '').slice(0, 500),
        String(final.badge_title ?? '').slice(0, 100),
        String(final.badge_emoji ?? '').slice(0, 20),
        String(final.badge_reason ?? '').slice(0, 200),
        req.user.id
      )
      logger.info('pitch saved', { userId: req.user.id, source: result ? 'llm' : 'template' })
    }).catch(e => logger.error('AI pitch save failed', { error: e.message }))
  }

  logger.info('User profile updated', { userId: req.user.id })
  res.json({ ...updated, hobbies: getUserHobbies(req.user.id) })
})

// POST /api/users/me/pitch — AI генерирует персональный питч от первого лица
router.post('/me/pitch', verifyJWT, async (req, res) => {
  const user = db.prepare(`
    SELECT id, name, last_name, first_name, department, position, experience_months,
           about_short, work_details, current_interests, gender
    FROM users WHERE id = ? AND is_banned = 0
  `).get(req.user.id)
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })

  const hobbies = getUserHobbies(req.user.id).map(h => h.label)
  const displayName = [user.last_name, user.first_name].filter(Boolean).join(' ') || user.name || ''
  const expStr = user.experience_months ? `${user.experience_months} мес.` : null

  const cfg = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'llm_%'").all()
  const llm = Object.fromEntries(cfg.map(r => [r.key, r.value]))

  if (!llm.llm_api_key || !llm.llm_model) {
    return res.status(503).json({ error: 'AI недоступен — не настроен LLM' })
  }

  const prompt = `Ты помогаешь сотруднику написать личный питч для корпоративного нетворкинга. Пиши от первого лица, тепло и живо.

Данные:
- Имя: ${displayName || '—'}
- Отдел: ${user.department || '—'}
- Должность: ${user.position || '—'}
- Стаж: ${expStr || '—'}
- О себе: ${user.about_short || '—'}
- Моя страсть / проекты: ${user.work_details || '—'}
- Сейчас увлечён(а): ${user.current_interests || '—'}
- Интересы: ${hobbies.join(', ') || '—'}

Напиши питч: 4-6 предложений от первого лица. Начни с "Привет! Я [имя]." Упомяни чем занимаешься, что тебя зажигает и зачем пришёл на мероприятие. Без канцелярщины и корпоративного новояза.

Верни только текст питча, без JSON, без markdown.`

  try {
    const provider = llm.llm_provider || 'openai'
    const baseUrl = llm.llm_base_url?.replace(/\/$/, '')
    let text

    if (provider === 'anthropic') {
      const url = baseUrl ? `${baseUrl}/v1/messages` : 'https://api.anthropic.com/v1/messages'
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'x-api-key': llm.llm_api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: llm.llm_model, max_tokens: 512, messages: [{ role: 'user', content: prompt }] }),
      })
      if (!r.ok) throw new Error(`Anthropic ${r.status}`)
      text = (await r.json()).content?.[0]?.text
    } else {
      const url = baseUrl
        ? `${baseUrl}/v1/chat/completions`
        : provider === 'cursor' ? 'https://api.cursor.sh/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${llm.llm_api_key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: llm.llm_model, max_tokens: 512, messages: [{ role: 'user', content: prompt }] }),
      })
      if (!r.ok) throw new Error(`${provider} ${r.status}`)
      text = (await r.json()).choices?.[0]?.message?.content
    }

    if (!text) throw new Error('Пустой ответ от модели')
    logger.info('User pitch generated', { userId: req.user.id })
    res.json({ pitch: text.trim() })
  } catch (e) {
    logger.error('User pitch failed', { error: e.message })
    res.status(503).json({ error: 'AI недоступен' })
  }
})

module.exports = router
