const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { verifyAdmin } = require('../middleware/adminAuth')
const db = require('../db')
const logger = require('../logger')

// ── Пользователи ─────────────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', verifyAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, email, name, department, is_admin, is_banned, onboarding_done, created_at
    FROM users ORDER BY created_at DESC
  `).all()
  res.json(users)
})

// PATCH /api/admin/users/:id/ban
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

// ── Логи ─────────────────────────────────────────────────────────────────────

router.get('/logs', verifyAdmin, (req, res) => {
  const logPath = path.join(__dirname, '..', 'logs', 'app.log')
  if (!fs.existsSync(logPath)) return res.json({ lines: [] })

  const content = fs.readFileSync(logPath, 'utf8')
  const lines = content.trim().split('\n').filter(Boolean).slice(-100)
  res.json({ lines })
})

// ── SMTP ─────────────────────────────────────────────────────────────────────

router.get('/settings', verifyAdmin, (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'smtp_%'").all()
  const settings = Object.fromEntries(
    rows.map(r => [r.key, r.key === 'smtp_pass' ? '••••••••' : r.value])
  )
  res.json(settings)
})

router.put('/settings/smtp', verifyAdmin, (req, res) => {
  const allowed = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from']
  const upsert = db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  )
  db.transaction((data) => {
    for (const [k, v] of Object.entries(data)) {
      if (allowed.includes(k) && v !== undefined) upsert.run(k, String(v))
    }
  })(req.body)
  logger.info('SMTP settings updated', { by: req.user.id })
  res.json({ success: true })
})

const MAGIC_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 дней

// ── Magic links / CSV ─────────────────────────────────────────────────────────

router.get('/magic-link/:id', verifyAdmin, (req, res) => {
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' })

  const now = Date.now()
  let link = db.prepare('SELECT * FROM magic_links WHERE user_id = ?').get(user.id)

  // Перевыпустить ссылку, если истекла или была использована/отозвана
  const needReissue = !link || (link.expires_at && now > link.expires_at) || link.revoked || link.used_at
  if (needReissue) {
    if (link) {
      db.prepare('DELETE FROM magic_links WHERE user_id = ?').run(user.id)
    }
    const id = uuidv4()
    const magic_token = uuidv4()
    const expires_at = now + MAGIC_LINK_TTL_MS
    db.prepare(
      "INSERT INTO magic_links (id, user_id, magic_token, expires_at) VALUES (?, ?, ?, ?)"
    ).run(id, user.id, magic_token, expires_at)
    link = db.prepare('SELECT * FROM magic_links WHERE id = ?').get(id)
    logger.info('Magic link created', { userId: user.id, email: user.email, by: req.user.id })
  }

  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
  res.json({ token: link.magic_token, magic_url: `${origin}/login?magic=${link.magic_token}` })
})

router.get('/users/csv', verifyAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, email, name, department FROM users WHERE is_admin = 0 ORDER BY created_at DESC'
  ).all()
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
  const now = Date.now()

  const getOrCreateToken = db.transaction((userId) => {
    let link = db.prepare('SELECT * FROM magic_links WHERE user_id = ?').get(userId)
    const needReissue = !link || (link.expires_at && now > link.expires_at) || link.revoked || link.used_at
    if (needReissue) {
      if (link) db.prepare('DELETE FROM magic_links WHERE user_id = ?').run(userId)
      const id = uuidv4()
      const magic_token = uuidv4()
      const expires_at = now + MAGIC_LINK_TTL_MS
      db.prepare(
        "INSERT INTO magic_links (id, user_id, magic_token, expires_at) VALUES (?, ?, ?, ?)"
      ).run(id, userId, magic_token, expires_at)
      link = { magic_token }
    }
    return link.magic_token
  })

  const csvEscape = (val) => {
    if (val == null) return ''
    const s = String(val)
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? '"' + s.replace(/"/g, '""') + '"'
      : s
  }

  const header = 'Имя,Email,Отдел,Magic_Link'
  const rows = users.map(u => {
    const token = getOrCreateToken(u.id)
    return [
      csvEscape(u.name || ''),
      csvEscape(u.email),
      csvEscape(u.department || ''),
      csvEscape(`${origin}/login?magic=${token}`),
    ].join(',')
  })

  logger.info('CSV export', { count: users.length, by: req.user.id })
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="bso-users.csv"')
  res.send('﻿' + [header, ...rows].join('\n'))
})

// ── Seed (dev only) ───────────────────────────────────────────────────────────

router.post('/seed', verifyAdmin, (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Seed недоступен в production' })
  }

  const depts = db.prepare("SELECT name FROM departments WHERE is_active = 1").all().map(d => d.name)
  const fallbackDepts = ['Логистика', 'Склад', 'IT-отдел', 'Финансы', 'HR']
  const activeDepts = depts.length ? depts : fallbackDepts

  const names = [
    'Алексей Громов', 'Мария Соколова', 'Дмитрий Волков', 'Екатерина Лебедева',
    'Сергей Новиков', 'Ольга Петрова', 'Никита Морозов', 'Анна Козлова',
    'Павел Зайцев', 'Юлия Смирнова',
  ]
  // Только дочерние хобби (с parent_id) для назначения пользователям
  const allHobbies = db.prepare('SELECT id FROM hobbies WHERE parent_id IS NOT NULL').all().map(h => h.id)

  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (id, email, name, department, avatar_url, badge_id, onboarding_done) VALUES (?, ?, ?, ?, ?, ?, 1)'
  )
  const insertHobby = db.prepare('INSERT OR IGNORE INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)')

  const inserted = db.transaction(() => {
    let count = 0
    for (const name of names) {
      const id = uuidv4()
      const email = `${name.toLowerCase().replace(/\s/g, '.')}@bso-cc.ru`
      const dept = activeDepts[Math.floor(Math.random() * activeDepts.length)]
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
      insertUser.run(id, email, name, dept, avatar, 'allrounder')
      const picked = [...allHobbies].sort(() => 0.5 - Math.random()).slice(0, 5 + Math.floor(Math.random() * 3))
      for (const hid of picked) insertHobby.run(id, hid)
      count++
    }
    return count
  })()

  logger.info('Seed executed', { inserted, by: req.user.id })
  res.json({ success: true, inserted })
})

// ════════════════════════════════════════════════════════════════════════════
// СПРАВОЧНИКИ
// ════════════════════════════════════════════════════════════════════════════

// ── Departments ───────────────────────────────────────────────────────────────

// GET /api/admin/departments
router.get('/departments', verifyAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM departments ORDER BY sort_order, name').all())
})

// POST /api/admin/departments
router.post('/departments', verifyAdmin, (req, res) => {
  const { name, sort_order = 0 } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Название обязательно' })

  const id = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-zа-яё_0-9]/gi, '') + '_' + Date.now()
  try {
    db.prepare(
      'INSERT INTO departments (id, name, sort_order) VALUES (?, ?, ?)'
    ).run(id, name.trim(), sort_order)
    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(id)
    logger.info('Department created', { id, name: name.trim(), by: req.user.id })
    res.status(201).json(dept)
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Отдел с таким названием уже существует' })
    throw e
  }
})

// PUT /api/admin/departments/:id
router.put('/departments/:id', verifyAdmin, (req, res) => {
  const { name, sort_order, is_active } = req.body
  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id)
  if (!dept) return res.status(404).json({ error: 'Отдел не найден' })

  try {
    db.prepare(`
      UPDATE departments SET
        name       = COALESCE(?, name),
        sort_order = COALESCE(?, sort_order),
        is_active  = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name?.trim() ?? null, sort_order ?? null, is_active ?? null, req.params.id)
    const updated = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id)
    logger.info('Department updated', { id: req.params.id, by: req.user.id })
    res.json(updated)
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Отдел с таким названием уже существует' })
    throw e
  }
})

// DELETE /api/admin/departments/:id
router.delete('/departments/:id', verifyAdmin, (req, res) => {
  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id)
  if (!dept) return res.status(404).json({ error: 'Отдел не найден' })

  const usersCount = db.prepare(
    "SELECT COUNT(*) as cnt FROM users WHERE department = ?"
  ).get(dept.name).cnt

  if (usersCount > 0) {
    // Soft-disable вместо удаления, если есть пользователи
    db.prepare('UPDATE departments SET is_active = 0 WHERE id = ?').run(req.params.id)
    logger.warn('Department soft-disabled (has users)', { id: req.params.id, usersCount, by: req.user.id })
    return res.status(409).json({
      error: `В отделе ${usersCount} сотрудников. Отдел деактивирован, но не удалён.`,
      soft_disabled: true,
    })
  }

  db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id)
  logger.warn('Department deleted', { id: req.params.id, name: dept.name, by: req.user.id })
  res.json({ success: true })
})

// ── Hobbies ───────────────────────────────────────────────────────────────────

// GET /api/admin/hobbies
router.get('/hobbies', verifyAdmin, (req, res) => {
  const hobbies = db.prepare(`
    SELECT * FROM hobbies
    ORDER BY CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END, sort_order, label
  `).all()
  res.json(hobbies)
})

// POST /api/admin/hobbies
router.post('/hobbies', verifyAdmin, (req, res) => {
  const { parent_id = null, label, emoji = '', sort_order = 0 } = req.body
  if (!label?.trim()) return res.status(400).json({ error: 'Название обязательно' })

  if (parent_id) {
    const parent = db.prepare('SELECT id FROM hobbies WHERE id = ?').get(parent_id)
    if (!parent) return res.status(400).json({ error: 'Родительская категория не найдена' })
  }

  const id = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-zа-яё_0-9]/gi, '') + '_' + Date.now()
  db.prepare(
    'INSERT INTO hobbies (id, parent_id, label, emoji, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(id, parent_id, label.trim(), emoji, sort_order)

  const hobby = db.prepare('SELECT * FROM hobbies WHERE id = ?').get(id)
  logger.info('Hobby created', { id, label: label.trim(), parent_id, by: req.user.id })
  res.status(201).json(hobby)
})

// PUT /api/admin/hobbies/:id
router.put('/hobbies/:id', verifyAdmin, (req, res) => {
  const hobby = db.prepare('SELECT * FROM hobbies WHERE id = ?').get(req.params.id)
  if (!hobby) return res.status(404).json({ error: 'Хобби не найдено' })

  const { label, emoji, sort_order, is_active } = req.body
  db.prepare(`
    UPDATE hobbies SET
      label      = COALESCE(?, label),
      emoji      = COALESCE(?, emoji),
      sort_order = COALESCE(?, sort_order),
      is_active  = COALESCE(?, is_active)
    WHERE id = ?
  `).run(label?.trim() ?? null, emoji ?? null, sort_order ?? null, is_active ?? null, req.params.id)

  const updated = db.prepare('SELECT * FROM hobbies WHERE id = ?').get(req.params.id)
  logger.info('Hobby updated', { id: req.params.id, by: req.user.id })
  res.json(updated)
})

// DELETE /api/admin/hobbies/:id
router.delete('/hobbies/:id', verifyAdmin, (req, res) => {
  const hobby = db.prepare('SELECT * FROM hobbies WHERE id = ?').get(req.params.id)
  if (!hobby) return res.status(404).json({ error: 'Хобби не найдено' })

  if (hobby.parent_id === null) {
    // Родительская категория — проверяем наличие детей
    const childCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM hobbies WHERE parent_id = ?'
    ).get(req.params.id).cnt

    if (childCount > 0) {
      // Soft-disable вместо удаления
      db.prepare('UPDATE hobbies SET is_active = 0 WHERE id = ? OR parent_id = ?').run(req.params.id, req.params.id)
      logger.warn('Hobby category soft-disabled (has children)', { id: req.params.id, childCount, by: req.user.id })
      return res.status(409).json({
        error: `Категория содержит ${childCount} подкатегорий. Категория и все подкатегории деактивированы.`,
        soft_disabled: true,
      })
    }
  }

  db.prepare('DELETE FROM hobbies WHERE id = ?').run(req.params.id)
  logger.warn('Hobby deleted', { id: req.params.id, label: hobby.label, by: req.user.id })
  res.json({ success: true })
})

// ── Reaction types ────────────────────────────────────────────────────────────

// GET /api/admin/reaction-types
router.get('/reaction-types', verifyAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM reaction_types ORDER BY sort_order, label').all())
})

// POST /api/admin/reaction-types
router.post('/reaction-types', verifyAdmin, (req, res) => {
  const { emoji, label, sort_order = 0 } = req.body
  if (!emoji?.trim() || !label?.trim()) return res.status(400).json({ error: 'emoji и label обязательны' })

  const id = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-zа-яё_0-9]/gi, '') + '_' + Date.now()
  db.prepare(
    'INSERT INTO reaction_types (id, emoji, label, sort_order) VALUES (?, ?, ?, ?)'
  ).run(id, emoji.trim(), label.trim(), sort_order)

  const rt = db.prepare('SELECT * FROM reaction_types WHERE id = ?').get(id)
  logger.info('Reaction type created', { id, label: label.trim(), by: req.user.id })
  res.status(201).json(rt)
})

// PUT /api/admin/reaction-types/:id
router.put('/reaction-types/:id', verifyAdmin, (req, res) => {
  const rt = db.prepare('SELECT * FROM reaction_types WHERE id = ?').get(req.params.id)
  if (!rt) return res.status(404).json({ error: 'Тип реакции не найден' })

  const { emoji, label, sort_order, is_active } = req.body
  db.prepare(`
    UPDATE reaction_types SET
      emoji      = COALESCE(?, emoji),
      label      = COALESCE(?, label),
      sort_order = COALESCE(?, sort_order),
      is_active  = COALESCE(?, is_active)
    WHERE id = ?
  `).run(emoji?.trim() ?? null, label?.trim() ?? null, sort_order ?? null, is_active ?? null, req.params.id)

  const updated = db.prepare('SELECT * FROM reaction_types WHERE id = ?').get(req.params.id)
  logger.info('Reaction type updated', { id: req.params.id, by: req.user.id })
  res.json(updated)
})

// DELETE /api/admin/reaction-types/:id
router.delete('/reaction-types/:id', verifyAdmin, (req, res) => {
  const rt = db.prepare('SELECT * FROM reaction_types WHERE id = ?').get(req.params.id)
  if (!rt) return res.status(404).json({ error: 'Тип реакции не найден' })

  db.prepare('DELETE FROM reaction_types WHERE id = ?').run(req.params.id)
  logger.warn('Reaction type deleted', { id: req.params.id, label: rt.label, by: req.user.id })
  res.json({ success: true })
})

// ════════════════════════════════════════════════════════════════════════════
// LLM / AI настройки
// ════════════════════════════════════════════════════════════════════════════

const LLM_KEYS = ['llm_provider', 'llm_api_key', 'llm_model', 'llm_base_url']

// GET /api/admin/settings/llm
router.get('/settings/llm', verifyAdmin, (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'llm_%'").all()
  const settings = Object.fromEntries(
    rows.map(r => [r.key, r.key === 'llm_api_key' ? '••••••••' : r.value])
  )
  res.json(settings)
})

// PUT /api/admin/settings/llm
router.put('/settings/llm', verifyAdmin, (req, res) => {
  const upsert = db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  )
  db.transaction((data) => {
    for (const [k, v] of Object.entries(data)) {
      if (LLM_KEYS.includes(k) && v !== undefined && v !== null) upsert.run(k, String(v))
    }
  })(req.body)
  logger.info('LLM settings updated', { provider: req.body.llm_provider, model: req.body.llm_model, by: req.user.id })
  res.json({ success: true })
})

// GET /api/admin/settings/llm/models — динамически загружает список моделей от провайдера
router.get('/settings/llm/models', verifyAdmin, async (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'llm_%'").all()
  const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]))

  const provider = cfg.llm_provider || 'openai'
  const apiKey   = cfg.llm_api_key
  const baseUrl  = cfg.llm_base_url?.replace(/\/$/, '')

  if (!apiKey || apiKey === '••••••••') {
    return res.status(400).json({ error: 'API-ключ не задан. Сохраните настройки.' })
  }

  try {
    let models = []

    if (provider === 'anthropic') {
      const url = baseUrl ? `${baseUrl}/v1/models` : 'https://api.anthropic.com/v1/models'
      const r = await fetch(url, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        return res.status(r.status).json({ error: err.error?.message || `Anthropic error ${r.status}` })
      }
      const data = await r.json()
      models = (data.data || []).map(m => m.id).filter(id => id.startsWith('claude')).sort()

    } else if (provider === 'openai') {
      const url = baseUrl ? `${baseUrl}/v1/models` : 'https://api.openai.com/v1/models'
      const r = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        return res.status(r.status).json({ error: err.error?.message || `OpenAI error ${r.status}` })
      }
      const data = await r.json()
      models = (data.data || [])
        .map(m => m.id)
        .filter(id => /^(gpt-|o1|o3|o4)/.test(id))
        .sort()

    } else if (provider === 'google') {
      const base = baseUrl || 'https://generativelanguage.googleapis.com'
      const url = `${base}/v1beta/models?key=${apiKey}`
      const r = await fetch(url)
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        return res.status(r.status).json({ error: err.error?.message || `Google error ${r.status}` })
      }
      const data = await r.json()
      models = (data.models || [])
        .map(m => m.name.replace(/^models\//, ''))
        .filter(id => id.startsWith('gemini'))
        .sort()

    } else {
      // cursor или custom — OpenAI-совместимый
      const url = baseUrl ? `${baseUrl}/v1/models` : 'https://api.cursor.sh/v1/models'
      const r = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        return res.status(r.status).json({ error: err.error?.message || `API error ${r.status}` })
      }
      const data = await r.json()
      models = (data.data || []).map(m => m.id).sort()
    }

    logger.info('LLM models loaded', { provider, count: models.length, by: req.user.id })
    res.json({ provider, models })

  } catch (e) {
    logger.error('LLM models fetch failed', { error: e.message })
    res.status(502).json({ error: `Не удалось подключиться к провайдеру: ${e.message}` })
  }
})

// ── Аналитика реакций ────────────────────────────────────────────────────────

// GET /api/admin/stats/reactions — «Звезды вечера»
router.get('/stats/reactions', verifyAdmin, (req, res) => {
  // Топ-10 по суммарным реакциям
  const topTotal = db.prepare(`
    SELECT r.to_user_id as user_id, u.name, u.avatar_url, COUNT(*) as total
    FROM reactions r
    JOIN users u ON u.id = r.to_user_id
    GROUP BY r.to_user_id
    ORDER BY total DESC
    LIMIT 10
  `).all()

  // Лидеры по каждому типу реакции
  const emojiTypes = db.prepare(
    'SELECT id, emoji, label FROM reaction_types WHERE is_active = 1 ORDER BY sort_order, label'
  ).all()

  const topByEmoji = emojiTypes.map(rt => {
    const leaders = db.prepare(`
      SELECT r.to_user_id as user_id, u.name, u.avatar_url, COUNT(*) as count
      FROM reactions r
      JOIN users u ON u.id = r.to_user_id
      WHERE r.emoji_type = ?
      GROUP BY r.to_user_id
      ORDER BY count DESC
      LIMIT 3
    `).all(rt.id)

    return {
      reaction_type_id: rt.id,
      emoji: rt.emoji,
      label: rt.label,
      leaders,
    }
  }).filter(e => e.leaders.length > 0)

  res.json({ topTotal, topByEmoji })
})

module.exports = router
