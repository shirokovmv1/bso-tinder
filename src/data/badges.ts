import type { Badge } from './types'

export const BADGES: Badge[] = [
  { id: 'team_player',    title: 'Командный игрок',         emoji: '🏆', color: '#FF6B00', description: 'Всегда в центре событий!' },
  { id: 'digital_artist', title: 'Цифровой художник',       emoji: '🎨', color: '#9B59B6', description: 'Код и краски — твоя стихия.' },
  { id: 'wild_tracker',   title: 'Дикий следопыт',          emoji: '🌲', color: '#27AE60', description: 'Лес, горы, свобода.' },
  { id: 'life_of_party',  title: 'Душа компании',           emoji: '🎭', color: '#E74C3C', description: 'Без тебя не праздник!' },
  { id: 'eco_hacker',     title: 'Эко-хакер',               emoji: '🌿', color: '#16A085', description: 'Технологии на службе природы.' },
  { id: 'cybersportsman', title: 'Киберспортсмен',          emoji: '⚡', color: '#2980B9', description: 'Быстрее. Выше. Сильнее.' },
  { id: 'explorer',       title: 'Путешественник',          emoji: '🗺️', color: '#F39C12', description: 'Мир — твоя игровая площадка.' },
  { id: 'romantic',       title: 'Романтик',                emoji: '🌸', color: '#E91E63', description: 'Красота в каждом моменте.' },
  { id: 'networker',      title: 'Сетевик',                 emoji: '🔗', color: '#3498DB', description: 'Связи решают всё.' },
  { id: 'allrounder',     title: 'Разносторонняя личность', emoji: '✨', color: '#8E44AD', description: 'Везде свой, всё умеешь!' },
]

// Маппинг пар parent_id → badge
// Поддерживаем как новые (cat_sport) так и старые (sport) идентификаторы
type ParentPair = string

const BADGE_MAP: Record<ParentPair, string> = {
  'cat_sport+cat_social':    'team_player',   'cat_social+cat_sport':    'team_player',
  'cat_creative+cat_tech':   'digital_artist','cat_tech+cat_creative':   'digital_artist',
  'cat_nature+cat_sport':    'wild_tracker',  'cat_sport+cat_nature':    'wild_tracker',
  'cat_creative+cat_social': 'life_of_party', 'cat_social+cat_creative': 'life_of_party',
  'cat_tech+cat_nature':     'eco_hacker',    'cat_nature+cat_tech':     'eco_hacker',
  'cat_sport+cat_tech':      'cybersportsman','cat_tech+cat_sport':      'cybersportsman',
  'cat_social+cat_nature':   'explorer',      'cat_nature+cat_social':   'explorer',
  'cat_creative+cat_nature': 'romantic',      'cat_nature+cat_creative': 'romantic',
  'cat_tech+cat_social':     'networker',     'cat_social+cat_tech':     'networker',
  // Обратная совместимость со старыми строковыми category
  'sport+social':    'team_player',   'social+sport':    'team_player',
  'creative+tech':   'digital_artist','tech+creative':   'digital_artist',
  'nature+sport':    'wild_tracker',  'sport+nature':    'wild_tracker',
  'creative+social': 'life_of_party', 'social+creative': 'life_of_party',
  'tech+nature':     'eco_hacker',    'nature+tech':     'eco_hacker',
  'sport+tech':      'cybersportsman','tech+sport':      'cybersportsman',
  'social+nature':   'explorer',      'nature+social':   'explorer',
  'creative+nature': 'romantic',      'nature+creative': 'romantic',
  'tech+social':     'networker',     'social+tech':     'networker',
}

// Принимает хобби с parent_id (новый формат) или category (старый формат)
export function assignBadge(hobbies: { parent_id?: string | null; category?: string }[]): Badge {
  const counts: Record<string, number> = {}
  for (const h of hobbies) {
    const key = h.parent_id ?? h.category ?? ''
    if (key) counts[key] = (counts[key] ?? 0) + 1
  }

  const top2 = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k)

  if (top2.length >= 2) {
    const badgeId = BADGE_MAP[`${top2[0]}+${top2[1]}`]
    if (badgeId) return BADGES.find(b => b.id === badgeId) ?? BADGES[9]
  }

  return BADGES[9]
}
