import type { Badge } from './types'

export const BADGES: Badge[] = [
  { id: 'kinoman',         emoji: '🎬', color: '#C62828', title: 'Кинонавигатор',             description: 'Легко находишь истории, которые хочется обсудить вместе.' },
  { id: 'bookworm',        emoji: '📚', color: '#4527A0', title: 'Книжный компас',            description: 'Умеешь превращать идеи из книг в живые разговоры.' },
  { id: 'music_soul',      emoji: '🎵', color: '#00695C', title: 'Музыкальный настрой',       description: 'Создаёшь атмосферу и быстро находишь общий ритм.' },
  { id: 'fire_starter',    emoji: '🔥', color: '#E65100', title: 'Искра команды',             description: 'Заряжаешь людей энергией и помогаешь разговору стартовать.' },
  { id: 'dreamer',         emoji: '🌙', color: '#283593', title: 'Светлая идея',              description: 'Видишь возможности там, где другие видят обычный день.' },
  { id: 'earth_keeper',    emoji: '🌿', color: '#2E7D32', title: 'Надёжная опора',            description: 'С тобой спокойно: ты умеешь делать красиво и по делу.' },
  { id: 'air_thinker',     emoji: '💨', color: '#0277BD', title: 'Генератор идей',            description: 'Быстро находишь новые ходы и делишься ими без лишнего шума.' },
  { id: 'horror_fan',      emoji: '😱', color: '#37474F', title: 'Острый сюжет',              description: 'Любишь эмоции поярче и точно знаешь, чем удивить собеседника.' },
  { id: 'romance_pro',     emoji: '❤️', color: '#AD1457', title: 'Тёплый взгляд',             description: 'Замечаешь хорошее в людях и добавляешь разговору душевности.' },
  { id: 'tech_wizard',     emoji: '⚡', color: '#1565C0', title: 'Технический навигатор',      description: 'Объясняешь сложное просто и помогаешь идеям становиться реальностью.' },
  { id: 'adventurer',      emoji: '🗺️', color: '#F57F17', title: 'Маршрут открыт',            description: 'С тобой легко решиться на новый опыт и хороший разговор.' },
  { id: 'culture_vulture', emoji: '🎭', color: '#6A1B9A', title: 'Культурный проводник',      description: 'У тебя всегда найдётся тема, которая делает встречу интереснее.' },
  { id: 'party_animal',    emoji: '🎉', color: '#D84315', title: 'Ритм встречи',              description: 'Помогаешь людям расслабиться, улыбнуться и включиться в общение.' },
  { id: 'mystery_one',     emoji: '🕵️', color: '#212121', title: 'Интрига вечера',            description: 'О тебе хочется узнать больше уже после первого ответа.' },
  { id: 'zen_master',      emoji: '🧘', color: '#558B2F', title: 'Спокойная сила',            description: 'Держишь баланс и добавляешь уверенности тем, кто рядом.' },
  { id: 'hustler',         emoji: '💼', color: '#F9A825', title: 'Деловой драйв',             description: 'Быстро включаешься, двигаешь задачи и находишь полезные связи.' },
  { id: 'creative_beast',  emoji: '🎨', color: '#7B1FA2', title: 'Творческий импульс',        description: 'Приносишь свежий взгляд и превращаешь обычное в запоминающееся.' },
  { id: 'sport_beast',     emoji: '🏋️', color: '#BF360C', title: 'Энергия движения',          description: 'Твой темп вдохновляет не стоять на месте и пробовать новое.' },
  { id: 'night_owl',       emoji: '🌌', color: '#1A237E', title: 'Вечерний мыслитель',        description: 'Умеешь находить глубокие темы и неожиданные идеи.' },
  { id: 'allrounder',      emoji: '✨', color: '#8E44AD', title: 'Разносторонний участник',   description: 'С тобой легко найти общую тему: интересов хватает на целую команду.' },
]

const FALLBACK = BADGES[BADGES.length - 1]

const ZODIAC_FIRE  = new Set(['aries', 'leo', 'sagittarius'])
const ZODIAC_EARTH = new Set(['taurus', 'virgo', 'capricorn'])
const ZODIAC_AIR   = new Set(['gemini', 'libra', 'aquarius'])
const ZODIAC_WATER = new Set(['cancer', 'scorpio', 'pisces'])
const DARK_COLORS  = new Set(['black', 'purple', 'brown'])
const WARM_COLORS  = new Set(['red', 'orange', 'yellow'])
const SOFT_COLORS  = new Set(['pink', 'purple', 'white'])

export interface BadgeProfile {
  filmGenres?: string[]
  bookGenres?: string[]
  musicGenres?: string[]
  zodiacSign?: string
  favColor?: string
}

function has(arr: string[] | undefined, ...vals: string[]) {
  return vals.some(v => arr?.includes(v))
}
function inSet(s: Set<string>, val?: string) {
  return !!val && s.has(val)
}

export function assignBadge(
  hobbies: { parent_id?: string | null; category?: string }[],
  profile: BadgeProfile = {}
): Badge {
  const { filmGenres = [], bookGenres = [], musicGenres = [], zodiacSign = '', favColor = '' } = profile

  const counts: Record<string, number> = {}
  for (const h of hobbies) {
    const raw = h.parent_id ?? h.category ?? ''
    const key = raw.startsWith('cat_') ? raw.slice(4) : raw
    if (key) counts[key] = (counts[key] ?? 0) + 1
  }
  const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  const topCat   = topEntry?.[0] ?? ''
  const topCount = topEntry?.[1] ?? 0

  const scores: Record<string, number> = {
    kinoman:         (filmGenres.length >= 4 ? 2 : filmGenres.length >= 2 ? 1 : 0) + (topCat === 'culture' ? 1 : 0),
    bookworm:        (bookGenres.length >= 4 ? 2 : bookGenres.length >= 2 ? 1 : 0) + (has(bookGenres, 'classics', 'nonfiction', 'selfdev', 'detective') ? 1 : 0),
    music_soul:      (musicGenres.length >= 4 ? 2 : musicGenres.length >= 2 ? 1 : 0) + (topCat === 'culture' ? 1 : 0),
    fire_starter:    (inSet(ZODIAC_FIRE, zodiacSign) ? 2 : 0) + (has(filmGenres, 'comedy', 'action') ? 1 : 0) + (has(musicGenres, 'pop', 'rap') ? 1 : 0) + (topCat === 'games' ? 1 : 0),
    dreamer:         (inSet(ZODIAC_WATER, zodiacSign) ? 2 : 0) + (has(bookGenres, 'fantasy_book', 'romance_book') ? 1 : 0) + (has(filmGenres, 'fantasy', 'romance') ? 1 : 0) + (inSet(SOFT_COLORS, favColor) ? 1 : 0),
    earth_keeper:    (inSet(ZODIAC_EARTH, zodiacSign) ? 2 : 0) + (['nature', 'home'].includes(topCat) ? 1 : 0) + (['green', 'brown'].includes(favColor) ? 1 : 0),
    air_thinker:     (inSet(ZODIAC_AIR, zodiacSign) ? 2 : 0) + (topCat === 'tech' ? 1 : 0) + (has(bookGenres, 'nonfiction', 'selfdev', 'business') ? 1 : 0),
    horror_fan:      (has(filmGenres, 'horror') ? 2 : 0) + (has(musicGenres, 'metal', 'rock') ? 1 : 0) + (inSet(DARK_COLORS, favColor) ? 1 : 0),
    romance_pro:     ((has(filmGenres, 'romance') && has(bookGenres, 'romance_book')) ? 2 : 0) + (['pink', 'red'].includes(favColor) ? 1 : 0) + (inSet(ZODIAC_WATER, zodiacSign) ? 1 : 0),
    tech_wizard:     ((topCat === 'tech' && topCount >= 3) ? 2 : 0) + (has(musicGenres, 'electronic', 'indie') ? 1 : 0) + (has(bookGenres, 'business', 'selfdev') ? 1 : 0),
    adventurer:      ((topCat === 'nature' && has(bookGenres, 'adventure')) ? 2 : 0) + (has(filmGenres, 'scifi', 'fantasy') ? 1 : 0) + (topCat === 'sport' ? 1 : 0),
    culture_vulture: ((has(filmGenres, 'drama', 'documentary') && has(bookGenres, 'classics')) ? 2 : 0) + (has(musicGenres, 'jazz', 'classical') ? 1 : 0) + (topCat === 'culture' ? 1 : 0),
    party_animal:    ((has(filmGenres, 'comedy') && has(musicGenres, 'pop', 'rap')) ? 2 : 0) + (topCat === 'games' ? 1 : 0) + (inSet(ZODIAC_FIRE, zodiacSign) ? 1 : 0),
    mystery_one:     ((has(filmGenres, 'thriller') && has(bookGenres, 'detective')) ? 2 : 0) + (inSet(DARK_COLORS, favColor) ? 1 : 0) + (inSet(ZODIAC_WATER, zodiacSign) ? 1 : 0),
    zen_master:      ((has(filmGenres, 'documentary') && has(bookGenres, 'nonfiction')) ? 2 : 0) + (has(musicGenres, 'classical', 'jazz') ? 1 : 0) + (['green', 'white'].includes(favColor) ? 1 : 0),
    hustler:         ((has(bookGenres, 'business') && topCat === 'tech') ? 2 : 0) + (['yellow', 'orange'].includes(favColor) ? 1 : 0) + (inSet(ZODIAC_EARTH, zodiacSign) ? 1 : 0),
    creative_beast:  ((topCat === 'culture' && has(filmGenres, 'anime', 'fantasy')) ? 2 : 0) + (favColor === 'purple' ? 1 : 0) + (has(musicGenres, 'indie', 'electronic') ? 1 : 0),
    sport_beast:     ((topCat === 'sport' && topCount >= 3) ? 2 : 0) + (has(filmGenres, 'action') ? 1 : 0) + (inSet(WARM_COLORS, favColor) ? 1 : 0),
    night_owl:       (has(filmGenres, 'horror', 'thriller') ? 2 : 0) + (['black', 'blue'].includes(favColor) ? 1 : 0) + (has(musicGenres, 'metal', 'electronic') ? 1 : 0),
  }

  const maxScore = Math.max(...Object.values(scores))
  if (maxScore === 0) return FALLBACK

  return BADGES.find(b => (scores[b.id] ?? 0) === maxScore) ?? FALLBACK
}
