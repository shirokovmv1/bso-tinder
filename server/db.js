const Database = require('better-sqlite3')
const path = require('path')
const logger = require('./logger')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db')
const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Базовые таблицы ──────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    department TEXT,
    avatar_url TEXT,
    badge_id TEXT,
    onboarding_done INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    user_a_id TEXT NOT NULL,
    user_b_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    icebreaker TEXT,
    shared_hobby_ids TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS magic_links (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL UNIQUE,
    magic_token TEXT NOT NULL UNIQUE,
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

// ── Безопасное добавление колонок в users ────────────────────────────────────

const userCols = db.pragma('table_info(users)').map(c => c.name)

const newUserCols = [
  ['gender',            'ALTER TABLE users ADD COLUMN gender TEXT'],
  ['experience_months', 'ALTER TABLE users ADD COLUMN experience_months INTEGER'],
  ['pitch',             'ALTER TABLE users ADD COLUMN pitch TEXT'],
  ['badge_title',       'ALTER TABLE users ADD COLUMN badge_title TEXT'],
  ['badge_emoji',       'ALTER TABLE users ADD COLUMN badge_emoji TEXT'],
  ['badge_reason',      'ALTER TABLE users ADD COLUMN badge_reason TEXT'],
]
for (const [col, sql] of newUserCols) {
  if (!userCols.includes(col)) db.exec(sql)
}

// ── Таблица departments ──────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    is_active  INTEGER DEFAULT 1
  );
`)

const DEPARTMENTS = [
  'Логистика', 'Склад', 'Транспортный отдел', 'IT-отдел', 'Финансы',
  'HR', 'Отдел продаж', 'Закупки', 'Таможня', 'Безопасность',
]
const seedDept = db.prepare(
  'INSERT OR IGNORE INTO departments (id, name, sort_order) VALUES (?, ?, ?)'
)
db.transaction(() => {
  DEPARTMENTS.forEach((name, i) => seedDept.run(name.toLowerCase().replace(/\s/g, '_'), name, i))
})()

// ── Таблица hobbies (иерархическая) ─────────────────────────────────────────

const hobbyCols = db.pragma('table_info(hobbies)').map(c => c.name)

if (hobbyCols.includes('category') && !hobbyCols.includes('parent_id')) {
  // Миграция: плоская схема → иерархическая
  logger.info('Migrating hobbies table to hierarchical schema...')

  db.pragma('foreign_keys = OFF')

  db.exec(`
    CREATE TABLE IF NOT EXISTS hobbies_new (
      id         TEXT PRIMARY KEY,
      parent_id  TEXT NULL REFERENCES hobbies_new(id) ON DELETE CASCADE,
      label      TEXT NOT NULL,
      emoji      TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active  INTEGER DEFAULT 1
    );
  `)

  // Родительские категории (parent_id = NULL)
  const CATEGORY_MAP = {
    sport:    { id: 'cat_sport',    label: 'Спорт',       emoji: '⚽' },
    creative: { id: 'cat_creative', label: 'Творчество',  emoji: '🎨' },
    tech:     { id: 'cat_tech',     label: 'Технологии',  emoji: '💻' },
    nature:   { id: 'cat_nature',   label: 'Природа',     emoji: '🌿' },
    social:   { id: 'cat_social',   label: 'Общение',     emoji: '🤝' },
  }
  const insertParent = db.prepare(
    'INSERT OR IGNORE INTO hobbies_new (id, parent_id, label, emoji, sort_order) VALUES (?, NULL, ?, ?, ?)'
  )
  Object.values(CATEGORY_MAP).forEach((cat, i) => {
    insertParent.run(cat.id, cat.label, cat.emoji, i)
  })

  // Перенос старых хобби как дочерних (id сохраняем!)
  const oldHobbies = db.prepare('SELECT * FROM hobbies').all()
  const insertChild = db.prepare(
    'INSERT OR IGNORE INTO hobbies_new (id, parent_id, label, emoji, sort_order) VALUES (?, ?, ?, ?, ?)'
  )
  oldHobbies.forEach((h, i) => {
    const cat = CATEGORY_MAP[h.category]
    const parentId = cat ? cat.id : null
    insertChild.run(h.id, parentId, h.label, h.emoji, i)
  })

  // Переносим user_hobbies данные во временный слот (FK выключены)
  // Удаляем старую таблицу, переименовываем новую
  db.exec(`
    DROP TABLE IF EXISTS hobbies;
    ALTER TABLE hobbies_new RENAME TO hobbies;
  `)

  db.pragma('foreign_keys = ON')
  logger.info('Hobbies migration complete')

} else if (hobbyCols.length === 0) {
  // Таблица hobbies не существует — создаём сразу в новой схеме
  db.exec(`
    CREATE TABLE IF NOT EXISTS hobbies (
      id         TEXT PRIMARY KEY,
      parent_id  TEXT NULL REFERENCES hobbies(id) ON DELETE CASCADE,
      label      TEXT NOT NULL,
      emoji      TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active  INTEGER DEFAULT 1
    );
  `)
}

// user_hobbies — создаём после hobbies, чтобы FK был валиден
db.exec(`
  CREATE TABLE IF NOT EXISTS user_hobbies (
    user_id  TEXT NOT NULL,
    hobby_id TEXT NOT NULL,
    PRIMARY KEY (user_id, hobby_id),
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
  );
`)

// ── Seed хобби (только если таблица пустая) ─────────────────────────────────

const hobbyCount = db.prepare('SELECT COUNT(*) as cnt FROM hobbies').get().cnt
if (hobbyCount === 0) {
  const CATEGORY_MAP = {
    sport:    'cat_sport',
    creative: 'cat_creative',
    tech:     'cat_tech',
    nature:   'cat_nature',
    social:   'cat_social',
  }
  const PARENT_CATS = [
    { id: 'cat_sport',    label: 'Спорт',      emoji: '⚽', sort_order: 0 },
    { id: 'cat_creative', label: 'Творчество', emoji: '🎨', sort_order: 1 },
    { id: 'cat_tech',     label: 'Технологии', emoji: '💻', sort_order: 2 },
    { id: 'cat_nature',   label: 'Природа',    emoji: '🌿', sort_order: 3 },
    { id: 'cat_social',   label: 'Общение',    emoji: '🤝', sort_order: 4 },
  ]
  const HOBBIES = [
    { id: 'gym',        label: 'Зал',         emoji: '🏋️', category: 'sport',    sort_order: 0 },
    { id: 'football',   label: 'Футбол',       emoji: '⚽',  category: 'sport',    sort_order: 1 },
    { id: 'cycling',    label: 'Велосипед',    emoji: '🚴',  category: 'sport',    sort_order: 2 },
    { id: 'running',    label: 'Бег',          emoji: '🏃',  category: 'sport',    sort_order: 3 },
    { id: 'swimming',   label: 'Плавание',     emoji: '🏊',  category: 'sport',    sort_order: 4 },
    { id: 'yoga',       label: 'Йога',         emoji: '🧘',  category: 'sport',    sort_order: 5 },
    { id: 'drawing',    label: 'Рисование',    emoji: '🎨',  category: 'creative', sort_order: 0 },
    { id: 'photo',      label: 'Фото',         emoji: '📸',  category: 'creative', sort_order: 1 },
    { id: 'music',      label: 'Музыка',       emoji: '🎸',  category: 'creative', sort_order: 2 },
    { id: 'cooking',    label: 'Готовка',      emoji: '👨‍🍳', category: 'creative', sort_order: 3 },
    { id: 'crafts',     label: 'Хэндмейд',     emoji: '🧶',  category: 'creative', sort_order: 4 },
    { id: 'dancing',    label: 'Танцы',        emoji: '💃',  category: 'creative', sort_order: 5 },
    { id: 'gaming',     label: 'Гейминг',      emoji: '🎮',  category: 'tech',     sort_order: 0 },
    { id: 'coding',     label: 'Код',          emoji: '💻',  category: 'tech',     sort_order: 1 },
    { id: 'printing',   label: '3D-печать',    emoji: '🖨️', category: 'tech',     sort_order: 2 },
    { id: 'drones',     label: 'Дроны',        emoji: '🚁',  category: 'tech',     sort_order: 3 },
    { id: 'smarthome',  label: 'Умный дом',    emoji: '🏠',  category: 'tech',     sort_order: 4 },
    { id: 'podcasts',   label: 'Подкасты',     emoji: '🎙️', category: 'tech',     sort_order: 5 },
    { id: 'camping',    label: 'Кемпинг',      emoji: '🏕️', category: 'nature',   sort_order: 0 },
    { id: 'fishing',    label: 'Рыбалка',      emoji: '🎣',  category: 'nature',   sort_order: 1 },
    { id: 'garden',     label: 'Сад',          emoji: '🌱',  category: 'nature',   sort_order: 2 },
    { id: 'hiking',     label: 'Туризм',       emoji: '🥾',  category: 'nature',   sort_order: 3 },
    { id: 'bikehike',   label: 'Велопоход',    emoji: '🚵',  category: 'nature',   sort_order: 4 },
    { id: 'mushrooms',  label: 'Грибы',        emoji: '🍄',  category: 'nature',   sort_order: 5 },
    { id: 'streetfood', label: 'Стритфуд',     emoji: '🍕',  category: 'social',   sort_order: 0 },
    { id: 'boardgames', label: 'Настолки',     emoji: '🎲',  category: 'social',   sort_order: 1 },
    { id: 'movies',     label: 'Кино',         emoji: '🎬',  category: 'social',   sort_order: 2 },
    { id: 'travel',     label: 'Путешествия',  emoji: '✈️',  category: 'social',   sort_order: 3 },
    { id: 'volunteer',  label: 'Волонтёрство', emoji: '🤝',  category: 'social',   sort_order: 4 },
    { id: 'parties',    label: 'Вечеринки',    emoji: '🥳',  category: 'social',   sort_order: 5 },
  ]

  const insertParent = db.prepare(
    'INSERT OR IGNORE INTO hobbies (id, parent_id, label, emoji, sort_order) VALUES (?, NULL, ?, ?, ?)'
  )
  const insertChild = db.prepare(
    'INSERT OR IGNORE INTO hobbies (id, parent_id, label, emoji, sort_order) VALUES (?, ?, ?, ?, ?)'
  )
  db.transaction(() => {
    for (const p of PARENT_CATS) insertParent.run(p.id, p.label, p.emoji, p.sort_order)
    for (const h of HOBBIES) insertChild.run(h.id, CATEGORY_MAP[h.category], h.label, h.emoji, h.sort_order)
  })()
}

// ── Таблица reaction_types ───────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS reaction_types (
    id         TEXT PRIMARY KEY,
    emoji      TEXT NOT NULL,
    label      TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active  INTEGER DEFAULT 1
  );
`)

const seedReactionType = db.prepare(
  'INSERT OR IGNORE INTO reaction_types (id, emoji, label, sort_order) VALUES (?, ?, ?, ?)'
)
db.transaction(() => {
  seedReactionType.run('like',      '👍', 'Лайк',             0)
  seedReactionType.run('heart',     '❤️', 'Сердце',           1)
  seedReactionType.run('fire',      '🔥', 'Огонь',            2)
  seedReactionType.run('handshake', '🤝', 'Хочу познакомиться', 3)
  seedReactionType.run('star',      '⭐', 'Звезда',           4)
})()

// ── Таблица reactions ────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS reactions (
    id           TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji_type   TEXT NOT NULL DEFAULT 'like',
    created_at   TEXT DEFAULT (datetime('now')),
    UNIQUE (from_user_id, to_user_id, emoji_type),
    CHECK (from_user_id != to_user_id)
  );
`)

logger.info('Database initialised', { path: DB_PATH })

module.exports = db
