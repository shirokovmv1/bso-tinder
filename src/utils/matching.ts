import type { Employee, HobbyTag, MatchResult } from '@/data/types'

const ICEBREAKERS = {
  high: (shared: HobbyTag[]) => [
    `Вы оба ${shared[0].emoji} ${shared[0].label}! Кто из вас продвинулся дальше?`,
    `${shared[0].emoji} ${shared[0].label} — ваша общая страсть. Уже договорились о совместной вылазке?`,
    `Целых ${shared.length} общих интереса! Начнём с ${shared[0].emoji} ${shared[0].label}?`,
  ],
  medium: (shared: HobbyTag[]) => [
    `Общее: ${shared.map(h => `${h.emoji} ${h.label}`).join(' и ')}. Есть о чём поговорить!`,
    `${shared[0].emoji} ${shared[0].label} объединяет вас. Самое время познакомиться!`,
    `Вы ближе, чем кажется — ${shared.map(h => h.label).join(', ')} у обоих!`,
  ],
  low: () => [
    'Разные интересы — лучший повод узнать что-то новое. Кто первый расскажет о своём хобби?',
    'Противоположности притягиваются! Попробуйте обменяться опытом.',
    'Новые знакомства начинаются с различий. Удивите друг друга!',
  ],
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function calculateCategoryBonus(a: HobbyTag[], b: HobbyTag[]): number {
  const aCategories = new Set(a.map(h => h.category))
  const bCategories = new Set(b.map(h => h.category))
  let shared = 0
  aCategories.forEach(c => { if (bCategories.has(c)) shared++ })
  return shared * 10
}

export function calculateCompatibility(a: Employee, b: Employee): MatchResult {
  const bIds = new Set(b.hobbies.map(h => h.id))
  const aIds = new Set(a.hobbies.map(h => h.id))

  const sharedHobbies = a.hobbies.filter(h => bIds.has(h.id))
  const uniqueA = a.hobbies.filter(h => !bIds.has(h.id))
  const uniqueB = b.hobbies.filter(h => !aIds.has(h.id))

  const base = (sharedHobbies.length / Math.max(a.hobbies.length, b.hobbies.length)) * 60
  const bonus = calculateCategoryBonus(a.hobbies, b.hobbies)
  const score = Math.min(100, Math.round(base + bonus))

  const tier = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'
  const icebreaker = sharedHobbies.length > 0
    ? pickRandom(ICEBREAKERS[tier](sharedHobbies))
    : pickRandom(ICEBREAKERS.low())

  return { score, sharedHobbies, uniqueA, uniqueB, icebreaker }
}
