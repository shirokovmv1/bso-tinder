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

db.exec(`
  CREATE TABLE IF NOT EXISTS kv_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

function ensureMatchesCascadeMigration() {
  const hasMatchesTable = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'matches'"
  ).get()
  if (!hasMatchesTable) return

  const fkList = db.pragma('foreign_key_list(matches)')
  if (fkList.length >= 2) return

  logger.info('Migrating matches table to add ON DELETE CASCADE FKs...')
  db.pragma('foreign_keys = OFF')

  db.exec(`
    CREATE TABLE IF NOT EXISTS matches_new (
      id TEXT PRIMARY KEY,
      user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      icebreaker TEXT,
      shared_hobby_ids TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      CHECK (user_a_id != user_b_id)
    );
  `)

  // Переносим только валидные записи, где оба пользователя существуют.
  db.exec(`
    INSERT INTO matches_new (id, user_a_id, user_b_id, score, icebreaker, shared_hobby_ids, created_at)
    SELECT m.id, m.user_a_id, m.user_b_id, m.score, m.icebreaker, m.shared_hobby_ids, m.created_at
    FROM matches m
    JOIN users ua ON ua.id = m.user_a_id
    JOIN users ub ON ub.id = m.user_b_id
    WHERE m.user_a_id != m.user_b_id;
  `)

  db.exec('DROP TABLE matches;')
  db.exec('ALTER TABLE matches_new RENAME TO matches;')
  db.pragma('foreign_keys = ON')

  logger.info('Matches migration complete')
}

ensureMatchesCascadeMigration()

// ── Безопасное добавление колонок в users ────────────────────────────────────

const userCols = db.pragma('table_info(users)').map(c => c.name)

const newUserCols = [
  ['gender',            'ALTER TABLE users ADD COLUMN gender TEXT'],
  ['experience_months', 'ALTER TABLE users ADD COLUMN experience_months INTEGER'],
  ['last_name',         'ALTER TABLE users ADD COLUMN last_name TEXT'],
  ['first_name',        'ALTER TABLE users ADD COLUMN first_name TEXT'],
  ['middle_name',       'ALTER TABLE users ADD COLUMN middle_name TEXT'],
  ['position',          'ALTER TABLE users ADD COLUMN position TEXT'],
  ['birthday_day',      'ALTER TABLE users ADD COLUMN birthday_day INTEGER'],
  ['birthday_month',    'ALTER TABLE users ADD COLUMN birthday_month INTEGER'],
  ['about_short',       'ALTER TABLE users ADD COLUMN about_short TEXT'],
  ['work_details',      'ALTER TABLE users ADD COLUMN work_details TEXT'],
  ['current_interests', 'ALTER TABLE users ADD COLUMN current_interests TEXT'],
  ['last_movies',       'ALTER TABLE users ADD COLUMN last_movies TEXT'],
  ['last_books',        'ALTER TABLE users ADD COLUMN last_books TEXT'],
  ['last_songs',        'ALTER TABLE users ADD COLUMN last_songs TEXT'],
  ['zodiac_sign',       'ALTER TABLE users ADD COLUMN zodiac_sign TEXT'],
  ['fav_color',         'ALTER TABLE users ADD COLUMN fav_color TEXT'],
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

// ── Справочник интересов v2 ──────────────────────────────────────────────────

const PARENT_CATS_V2 = [
  { id: 'cat_sport',   label: 'Спорт и активность',      emoji: '⚽', sort_order: 0 },
  { id: 'cat_culture', label: 'Культура и впечатления',  emoji: '🎬', sort_order: 1 },
  { id: 'cat_home',    label: 'Дом, еда и быт',          emoji: '🏡', sort_order: 2 },
  { id: 'cat_nature',  label: 'Природа и поездки',       emoji: '🌿', sort_order: 3 },
  { id: 'cat_games',   label: 'Игры и общение',          emoji: '🎲', sort_order: 4 },
  { id: 'cat_tech',    label: 'Технологии и навыки',     emoji: '💻', sort_order: 5 },
]

const HOBBIES_V2 = [
  // cat_sport
  { id: 'gym',         label: 'Зал / фитнес',           emoji: '🏋️', cat: 'cat_sport',   sort_order: 0 },
  { id: 'football',    label: 'Футбол',                  emoji: '⚽',  cat: 'cat_sport',   sort_order: 1 },
  { id: 'volleyball',  label: 'Волейбол',                emoji: '🏐',  cat: 'cat_sport',   sort_order: 2 },
  { id: 'running',     label: 'Бег',                     emoji: '🏃',  cat: 'cat_sport',   sort_order: 3 },
  { id: 'cycling',     label: 'Велосипед',               emoji: '🚴',  cat: 'cat_sport',   sort_order: 4 },
  { id: 'swimming',    label: 'Плавание',                emoji: '🏊',  cat: 'cat_sport',   sort_order: 5 },
  { id: 'yoga',        label: 'Йога / растяжка',        emoji: '🧘',  cat: 'cat_sport',   sort_order: 6 },
  { id: 'walks',       label: 'Прогулки',                emoji: '🚶',  cat: 'cat_sport',   sort_order: 7 },
  { id: 'dancing',     label: 'Танцы',                   emoji: '💃',  cat: 'cat_sport',   sort_order: 8 },
  { id: 'tabletennis', label: 'Настольный теннис',       emoji: '🏓',  cat: 'cat_sport',   sort_order: 9 },
  { id: 'padel',       label: 'Падл',                    emoji: '🎾',  cat: 'cat_sport',   sort_order: 10 },
  // cat_culture
  { id: 'movies',      label: 'Кино',                    emoji: '🎬',  cat: 'cat_culture', sort_order: 0 },
  { id: 'series',      label: 'Сериалы',                 emoji: '📺',  cat: 'cat_culture', sort_order: 1 },
  { id: 'music',       label: 'Музыка',                  emoji: '🎸',  cat: 'cat_culture', sort_order: 2 },
  { id: 'concerts',    label: 'Концерты',                emoji: '🎤',  cat: 'cat_culture', sort_order: 3 },
  { id: 'theater',     label: 'Театр',                   emoji: '🎭',  cat: 'cat_culture', sort_order: 4 },
  { id: 'books',       label: 'Книги',                   emoji: '📚',  cat: 'cat_culture', sort_order: 5 },
  { id: 'exhibitions', label: 'Выставки / музеи',        emoji: '🖼️', cat: 'cat_culture', sort_order: 6 },
  { id: 'podcasts',    label: 'Подкасты',                emoji: '🎙️', cat: 'cat_culture', sort_order: 7 },
  { id: 'festivals',   label: 'Фестивали',               emoji: '🎡',  cat: 'cat_culture', sort_order: 8 },
  { id: 'standup',     label: 'Стендап',                 emoji: '🎤',  cat: 'cat_culture', sort_order: 9 },
  { id: 'instruments', label: 'Играю на инструментах',   emoji: '🎸',  cat: 'cat_culture', sort_order: 10 },
  // cat_home
  { id: 'cooking',     label: 'Готовка',                 emoji: '👨‍🍳', cat: 'cat_home',    sort_order: 0 },
  { id: 'baking',      label: 'Выпечка',                 emoji: '🥐',  cat: 'cat_home',    sort_order: 1 },
  { id: 'coffee',      label: 'Кофе / чай',             emoji: '☕',  cat: 'cat_home',    sort_order: 2 },
  { id: 'restaurants', label: 'Рестораны / кафе',       emoji: '🍽️', cat: 'cat_home',    sort_order: 3 },
  { id: 'streetfood',  label: 'Стритфуд',               emoji: '🍕',  cat: 'cat_home',    sort_order: 4 },
  { id: 'garden',      label: 'Сад / огород',           emoji: '🌱',  cat: 'cat_home',    sort_order: 5 },
  { id: 'homecomfort', label: 'Домашний уют',           emoji: '🏡',  cat: 'cat_home',    sort_order: 6 },
  { id: 'diy',         label: 'Ремонт / DIY',           emoji: '🔧',  cat: 'cat_home',    sort_order: 7 },
  { id: 'crafts',      label: 'Рукоделие',              emoji: '🧶',  cat: 'cat_home',    sort_order: 8 },
  { id: 'pets',        label: 'Домашние животные',      emoji: '🐾',  cat: 'cat_home',    sort_order: 9 },
  // cat_nature
  { id: 'travel',      label: 'Путешествия',            emoji: '✈️',  cat: 'cat_nature',  sort_order: 0 },
  { id: 'hiking',      label: 'Походы',                 emoji: '🥾',  cat: 'cat_nature',  sort_order: 1 },
  { id: 'fishing',     label: 'Рыбалка',               emoji: '🎣',  cat: 'cat_nature',  sort_order: 2 },
  { id: 'camping',     label: 'Кемпинг',               emoji: '🏕️', cat: 'cat_nature',  sort_order: 3 },
  { id: 'mushrooms',   label: 'Грибы / ягоды',         emoji: '🍄',  cat: 'cat_nature',  sort_order: 4 },
  { id: 'dacha',       label: 'Дача',                  emoji: '🌻',  cat: 'cat_nature',  sort_order: 5 },
  { id: 'bikehike',    label: 'Велопоходы',            emoji: '🚵',  cat: 'cat_nature',  sort_order: 6 },
  { id: 'roadtrip',    label: 'Автопутешествия',       emoji: '🚗',  cat: 'cat_nature',  sort_order: 7 },
  { id: 'naturewalk',  label: 'Прогулки на природе',   emoji: '🌿',  cat: 'cat_nature',  sort_order: 8 },
  { id: 'excursions',  label: 'Экскурсии',             emoji: '🗺️', cat: 'cat_nature',  sort_order: 9 },
  // cat_games
  { id: 'boardgames',  label: 'Настолки',              emoji: '🎲',  cat: 'cat_games',   sort_order: 0 },
  { id: 'quiz',        label: 'Квиз',                  emoji: '🧠',  cat: 'cat_games',   sort_order: 1 },
  { id: 'gaming',      label: 'Гейминг',               emoji: '🎮',  cat: 'cat_games',   sort_order: 2 },
  { id: 'karaoke',     label: 'Караоке',               emoji: '🎤',  cat: 'cat_games',   sort_order: 3 },
  { id: 'parties',     label: 'Вечеринки',             emoji: '🥳',  cat: 'cat_games',   sort_order: 4 },
  { id: 'teamgames',   label: 'Командные игры',        emoji: '🏅',  cat: 'cat_games',   sort_order: 5 },
  { id: 'volunteer',   label: 'Волонтёрство',          emoji: '🤝',  cat: 'cat_games',   sort_order: 6 },
  { id: 'newpeople',   label: 'Новые знакомства',      emoji: '👋',  cat: 'cat_games',   sort_order: 7 },
  { id: 'clubs',       label: 'Клубы по интересам',   emoji: '🏛️', cat: 'cat_games',   sort_order: 8 },
  { id: 'intgames',    label: 'Интеллектуальные игры', emoji: '♟️', cat: 'cat_games',   sort_order: 9 },
  // cat_tech
  { id: 'coding',      label: 'Код / программирование', emoji: '💻', cat: 'cat_tech',    sort_order: 0 },
  { id: 'ai',          label: 'AI / нейросети',        emoji: '🤖',  cat: 'cat_tech',    sort_order: 1 },
  { id: 'gadgets',     label: 'Гаджеты',               emoji: '📱',  cat: 'cat_tech',    sort_order: 2 },
  { id: 'photovideo',  label: 'Фото / видео',          emoji: '📸',  cat: 'cat_tech',    sort_order: 3 },
  { id: 'design',      label: 'Дизайн',                emoji: '🎨',  cat: 'cat_tech',    sort_order: 4 },
  { id: 'printing',    label: '3D-печать',             emoji: '🖨️', cat: 'cat_tech',    sort_order: 5 },
  { id: 'drones',      label: 'Дроны',                 emoji: '🚁',  cat: 'cat_tech',    sort_order: 6 },
  { id: 'auto',        label: 'Авто / техника',        emoji: '🚘',  cat: 'cat_tech',    sort_order: 7 },
  { id: 'finance',     label: 'Финансы',               emoji: '💰',  cat: 'cat_tech',    sort_order: 8 },
  { id: 'learning',    label: 'Обучение / курсы',      emoji: '📖',  cat: 'cat_tech',    sort_order: 9 },
]

function seedHobbiesV2() {
  const upsertParent = db.prepare(`
    INSERT INTO hobbies (id, parent_id, label, emoji, sort_order, is_active)
    VALUES (?, NULL, ?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET
      parent_id = NULL,
      label = excluded.label,
      emoji = excluded.emoji,
      sort_order = excluded.sort_order,
      is_active = 1
  `)
  const upsertChild = db.prepare(`
    INSERT INTO hobbies (id, parent_id, label, emoji, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET
      parent_id = excluded.parent_id,
      label = excluded.label,
      emoji = excluded.emoji,
      sort_order = excluded.sort_order,
      is_active = 1
  `)
  db.transaction(() => {
    for (const p of PARENT_CATS_V2) upsertParent.run(p.id, p.label, p.emoji, p.sort_order)
    for (const h of HOBBIES_V2) upsertChild.run(h.id, h.cat, h.label, h.emoji, h.sort_order)
  })()
}

// ── Миграция: мягкое обновление справочника интересов v2 ─────────────────────
;(function migrateHobbiesV2() {
  const flag = db.prepare("SELECT value FROM kv_meta WHERE key = 'hobbies_catalog_v3_safe'").get()
  if (flag) return
  logger.info('Migrating hobbies to v2 catalogue without clearing user choices...')
  seedHobbiesV2()
  db.prepare("INSERT OR REPLACE INTO kv_meta (key, value) VALUES ('hobbies_catalog_v3_safe', '1')").run()
  logger.info('Hobbies v2 migration complete')
})()

// ── Seed хобби (только если таблица пустая) ─────────────────────────────────

const hobbyCount = db.prepare('SELECT COUNT(*) as cnt FROM hobbies').get().cnt
if (hobbyCount === 0) {
  seedHobbiesV2()
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

// ── Индексы для горячих запросов ─────────────────────────────────────────────
db.exec(`
  DELETE FROM matches
  WHERE rowid NOT IN (
    SELECT MIN(rowid)
    FROM matches
    GROUP BY
      CASE WHEN user_a_id < user_b_id THEN user_a_id ELSE user_b_id END,
      CASE WHEN user_a_id < user_b_id THEN user_b_id ELSE user_a_id END
  );
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_reactions_to_from
  ON reactions(to_user_id, from_user_id);

  CREATE INDEX IF NOT EXISTS idx_matches_user_pair
  ON matches(user_a_id, user_b_id);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_unique_normalized_pair
  ON matches(
    CASE WHEN user_a_id < user_b_id THEN user_a_id ELSE user_b_id END,
    CASE WHEN user_a_id < user_b_id THEN user_b_id ELSE user_a_id END
  );

  CREATE INDEX IF NOT EXISTS idx_user_hobbies_user_hobby
  ON user_hobbies(user_id, hobby_id);

  CREATE INDEX IF NOT EXISTS idx_users_admin_department
  ON users(is_admin, department);
`)

// ── Миграция magic_links: добавить поля TTL и одноразовости ─────────────────

const magicCols = db.pragma('table_info(magic_links)').map(c => c.name)
const newMagicCols = [
  ['expires_at', 'ALTER TABLE magic_links ADD COLUMN expires_at INTEGER'],
  ['used_at',    'ALTER TABLE magic_links ADD COLUMN used_at TEXT'],
  ['revoked',    'ALTER TABLE magic_links ADD COLUMN revoked INTEGER DEFAULT 0'],
]
for (const [col, sql] of newMagicCols) {
  if (!magicCols.includes(col)) db.exec(sql)
}

logger.info('Database initialised', { path: DB_PATH })

module.exports = db
