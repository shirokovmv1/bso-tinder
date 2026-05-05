import type { HobbyTag } from './types'

export const HOBBIES: HobbyTag[] = [
  // Спорт
  { id: 'gym',      label: 'Зал',        emoji: '🏋️', category: 'sport' },
  { id: 'football', label: 'Футбол',     emoji: '⚽', category: 'sport' },
  { id: 'cycling',  label: 'Велосипед',  emoji: '🚴', category: 'sport' },
  { id: 'running',  label: 'Бег',        emoji: '🏃', category: 'sport' },
  { id: 'swimming', label: 'Плавание',   emoji: '🏊', category: 'sport' },
  { id: 'yoga',     label: 'Йога',       emoji: '🧘', category: 'sport' },

  // Творчество
  { id: 'drawing',  label: 'Рисование',  emoji: '🎨', category: 'creative' },
  { id: 'photo',    label: 'Фото',       emoji: '📸', category: 'creative' },
  { id: 'music',    label: 'Музыка',     emoji: '🎸', category: 'creative' },
  { id: 'cooking',  label: 'Готовка',    emoji: '👨‍🍳', category: 'creative' },
  { id: 'crafts',   label: 'Хэндмейд',  emoji: '🧶', category: 'creative' },
  { id: 'dancing',  label: 'Танцы',      emoji: '💃', category: 'creative' },

  // Технологии
  { id: 'gaming',   label: 'Гейминг',    emoji: '🎮', category: 'tech' },
  { id: 'coding',   label: 'Код',        emoji: '💻', category: 'tech' },
  { id: 'printing', label: '3D-печать',  emoji: '🖨️', category: 'tech' },
  { id: 'drones',   label: 'Дроны',      emoji: '🚁', category: 'tech' },
  { id: 'smarthome',label: 'Умный дом',  emoji: '🏠', category: 'tech' },
  { id: 'podcasts', label: 'Подкасты',   emoji: '🎙️', category: 'tech' },

  // Природа
  { id: 'camping',  label: 'Кемпинг',    emoji: '🏕️', category: 'nature' },
  { id: 'fishing',  label: 'Рыбалка',    emoji: '🎣', category: 'nature' },
  { id: 'garden',   label: 'Сад',        emoji: '🌱', category: 'nature' },
  { id: 'hiking',   label: 'Туризм',     emoji: '🥾', category: 'nature' },
  { id: 'bikehike', label: 'Велопоход',  emoji: '🚵', category: 'nature' },
  { id: 'mushrooms',label: 'Грибы',      emoji: '🍄', category: 'nature' },

  // Социальное
  { id: 'streetfood',label: 'Стритфуд', emoji: '🍕', category: 'social' },
  { id: 'boardgames',label: 'Настолки', emoji: '🎲', category: 'social' },
  { id: 'movies',   label: 'Кино',       emoji: '🎬', category: 'social' },
  { id: 'travel',   label: 'Путешествия',emoji: '✈️', category: 'social' },
  { id: 'volunteer',label: 'Волонтёрство',emoji: '🤝', category: 'social' },
  { id: 'parties',  label: 'Вечеринки',  emoji: '🥳', category: 'social' },
]

export const HOBBIES_BY_ID = Object.fromEntries(HOBBIES.map(h => [h.id, h]))
