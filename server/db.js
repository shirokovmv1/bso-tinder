const Database = require('better-sqlite3')
const path = require('path')
const logger = require('./logger')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db')
const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Схема
db.exec(`
  CREATE TABLE IF NOT EXISTS hobbies (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    emoji TEXT NOT NULL,
    category TEXT NOT NULL
  );

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

  CREATE TABLE IF NOT EXISTS user_hobbies (
    user_id TEXT NOT NULL,
    hobby_id TEXT NOT NULL,
    PRIMARY KEY (user_id, hobby_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
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

// Seed справочника хобби
const HOBBIES = [
  { id: 'gym',       label: 'Зал',          emoji: '🏋️', category: 'sport'    },
  { id: 'football',  label: 'Футбол',        emoji: '⚽',  category: 'sport'    },
  { id: 'cycling',   label: 'Велосипед',     emoji: '🚴',  category: 'sport'    },
  { id: 'running',   label: 'Бег',           emoji: '🏃',  category: 'sport'    },
  { id: 'swimming',  label: 'Плавание',      emoji: '🏊',  category: 'sport'    },
  { id: 'yoga',      label: 'Йога',          emoji: '🧘',  category: 'sport'    },
  { id: 'drawing',   label: 'Рисование',     emoji: '🎨',  category: 'creative' },
  { id: 'photo',     label: 'Фото',          emoji: '📸',  category: 'creative' },
  { id: 'music',     label: 'Музыка',        emoji: '🎸',  category: 'creative' },
  { id: 'cooking',   label: 'Готовка',       emoji: '👨‍🍳', category: 'creative' },
  { id: 'crafts',    label: 'Хэндмейд',      emoji: '🧶',  category: 'creative' },
  { id: 'dancing',   label: 'Танцы',         emoji: '💃',  category: 'creative' },
  { id: 'gaming',    label: 'Гейминг',       emoji: '🎮',  category: 'tech'     },
  { id: 'coding',    label: 'Код',           emoji: '💻',  category: 'tech'     },
  { id: 'printing',  label: '3D-печать',     emoji: '🖨️', category: 'tech'     },
  { id: 'drones',    label: 'Дроны',         emoji: '🚁',  category: 'tech'     },
  { id: 'smarthome', label: 'Умный дом',     emoji: '🏠',  category: 'tech'     },
  { id: 'podcasts',  label: 'Подкасты',      emoji: '🎙️', category: 'tech'     },
  { id: 'camping',   label: 'Кемпинг',       emoji: '🏕️', category: 'nature'   },
  { id: 'fishing',   label: 'Рыбалка',       emoji: '🎣',  category: 'nature'   },
  { id: 'garden',    label: 'Сад',           emoji: '🌱',  category: 'nature'   },
  { id: 'hiking',    label: 'Туризм',        emoji: '🥾',  category: 'nature'   },
  { id: 'bikehike',  label: 'Велопоход',     emoji: '🚵',  category: 'nature'   },
  { id: 'mushrooms', label: 'Грибы',         emoji: '🍄',  category: 'nature'   },
  { id: 'streetfood',label: 'Стритфуд',      emoji: '🍕',  category: 'social'   },
  { id: 'boardgames',label: 'Настолки',      emoji: '🎲',  category: 'social'   },
  { id: 'movies',    label: 'Кино',          emoji: '🎬',  category: 'social'   },
  { id: 'travel',    label: 'Путешествия',   emoji: '✈️',  category: 'social'   },
  { id: 'volunteer', label: 'Волонтёрство',  emoji: '🤝',  category: 'social'   },
  { id: 'parties',   label: 'Вечеринки',     emoji: '🥳',  category: 'social'   },
]

const seedHobby = db.prepare(
  'INSERT OR IGNORE INTO hobbies (id, label, emoji, category) VALUES (?, ?, ?, ?)'
)
const seedAll = db.transaction(() => {
  for (const h of HOBBIES) seedHobby.run(h.id, h.label, h.emoji, h.category)
})
seedAll()

logger.info('Database initialised', { path: DB_PATH, hobbies: HOBBIES.length })

module.exports = db
