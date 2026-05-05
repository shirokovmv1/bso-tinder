import type { Badge, HobbyTag, HobbyCategory } from './types'

export const BADGES: Badge[] = [
  { id: 'team_player',   title: 'Командный игрок',      emoji: '🏆', color: '#FF6B00', description: 'Всегда в центре событий!' },
  { id: 'digital_artist',title: 'Цифровой художник',    emoji: '🎨', color: '#9B59B6', description: 'Код и краски — твоя стихия.' },
  { id: 'wild_tracker',  title: 'Дикий следопыт',       emoji: '🌲', color: '#27AE60', description: 'Лес, горы, свобода.' },
  { id: 'life_of_party', title: 'Душа компании',        emoji: '🎭', color: '#E74C3C', description: 'Без тебя не праздник!' },
  { id: 'eco_hacker',    title: 'Эко-хакер',            emoji: '🌿', color: '#16A085', description: 'Технологии на службе природы.' },
  { id: 'cybersportsman',title: 'Киберспортсмен',       emoji: '⚡', color: '#2980B9', description: 'Быстрее. Выше. Сильнее.' },
  { id: 'explorer',      title: 'Путешественник',       emoji: '🗺️', color: '#F39C12', description: 'Мир — твоя игровая площадка.' },
  { id: 'romantic',      title: 'Романтик',             emoji: '🌸', color: '#E91E63', description: 'Красота в каждом моменте.' },
  { id: 'networker',     title: 'Сетевик',              emoji: '🔗', color: '#3498DB', description: 'Связи решают всё.' },
  { id: 'allrounder',    title: 'Разносторонняя личность', emoji: '✨', color: '#8E44AD', description: 'Везде свой, всё умеешь!' },
]

type CategoryPair = `${HobbyCategory}+${HobbyCategory}`

const BADGE_MAP: Partial<Record<CategoryPair, string>> = {
  'sport+social':   'team_player',
  'social+sport':   'team_player',
  'creative+tech':  'digital_artist',
  'tech+creative':  'digital_artist',
  'nature+sport':   'wild_tracker',
  'sport+nature':   'wild_tracker',
  'creative+social':'life_of_party',
  'social+creative':'life_of_party',
  'tech+nature':    'eco_hacker',
  'nature+tech':    'eco_hacker',
  'sport+tech':     'cybersportsman',
  'tech+sport':     'cybersportsman',
  'social+nature':  'explorer',
  'nature+social':  'explorer',
  'creative+nature':'romantic',
  'nature+creative':'romantic',
  'tech+social':    'networker',
  'social+tech':    'networker',
}

export function assignBadge(hobbies: HobbyTag[]): Badge {
  const categoryCounts = hobbies.reduce<Partial<Record<HobbyCategory, number>>>((acc, h) => {
    acc[h.category] = (acc[h.category] ?? 0) + 1
    return acc
  }, {})

  const top2 = (Object.entries(categoryCounts) as [HobbyCategory, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => cat)

  if (top2.length >= 2) {
    const key = `${top2[0]}+${top2[1]}` as CategoryPair
    const badgeId = BADGE_MAP[key]
    if (badgeId) {
      return BADGES.find(b => b.id === badgeId) ?? BADGES[9]
    }
  }

  return BADGES[9] // allrounder fallback
}
