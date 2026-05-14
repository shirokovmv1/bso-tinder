import type { HobbyTag } from './types'

export const HOBBIES: HobbyTag[] = [
  // Спорт и активность
  { id: 'gym',         label: 'Зал / фитнес',      emoji: '🏋️', category: 'sport' },
  { id: 'football',    label: 'Футбол',             emoji: '⚽',  category: 'sport' },
  { id: 'volleyball',  label: 'Волейбол',           emoji: '🏐',  category: 'sport' },
  { id: 'running',     label: 'Бег',                emoji: '🏃',  category: 'sport' },
  { id: 'cycling',     label: 'Велосипед',          emoji: '🚴',  category: 'sport' },
  { id: 'swimming',    label: 'Плавание',           emoji: '🏊',  category: 'sport' },
  { id: 'yoga',        label: 'Йога / растяжка',   emoji: '🧘',  category: 'sport' },
  { id: 'walks',       label: 'Прогулки',           emoji: '🚶',  category: 'sport' },
  { id: 'dancing',     label: 'Танцы',              emoji: '💃',  category: 'sport' },
  { id: 'tabletennis', label: 'Настольный теннис',  emoji: '🏓',  category: 'sport' },
  { id: 'padel',       label: 'Падл',               emoji: '🎾',  category: 'sport' },

  // Культура и впечатления
  { id: 'movies',      label: 'Кино',              emoji: '🎬',  category: 'culture' },
  { id: 'series',      label: 'Сериалы',           emoji: '📺',  category: 'culture' },
  { id: 'music',       label: 'Музыка',            emoji: '🎸',  category: 'culture' },
  { id: 'concerts',    label: 'Концерты',          emoji: '🎤',  category: 'culture' },
  { id: 'theater',     label: 'Театр',             emoji: '🎭',  category: 'culture' },
  { id: 'books',       label: 'Книги',             emoji: '📚',  category: 'culture' },
  { id: 'exhibitions', label: 'Выставки / музеи',  emoji: '🖼️', category: 'culture' },
  { id: 'podcasts',    label: 'Подкасты',          emoji: '🎙️', category: 'culture' },
  { id: 'festivals',   label: 'Фестивали',         emoji: '🎡',  category: 'culture' },
  { id: 'standup',     label: 'Стендап',           emoji: '🎤',  category: 'culture' },
  { id: 'instruments', label: 'Играю на инструментах', emoji: '🎸', category: 'culture' },

  // Дом, еда и быт
  { id: 'cooking',     label: 'Готовка',           emoji: '👨‍🍳', category: 'home' },
  { id: 'baking',      label: 'Выпечка',           emoji: '🥐',  category: 'home' },
  { id: 'coffee',      label: 'Кофе / чай',        emoji: '☕',  category: 'home' },
  { id: 'restaurants', label: 'Рестораны / кафе',  emoji: '🍽️', category: 'home' },
  { id: 'streetfood',  label: 'Стритфуд',          emoji: '🍕',  category: 'home' },
  { id: 'garden',      label: 'Сад / огород',      emoji: '🌱',  category: 'home' },
  { id: 'homecomfort', label: 'Домашний уют',      emoji: '🏡',  category: 'home' },
  { id: 'diy',         label: 'Ремонт / DIY',      emoji: '🔧',  category: 'home' },
  { id: 'crafts',      label: 'Рукоделие',         emoji: '🧶',  category: 'home' },
  { id: 'pets',        label: 'Домашние животные', emoji: '🐾',  category: 'home' },

  // Природа и поездки
  { id: 'travel',      label: 'Путешествия',       emoji: '✈️',  category: 'nature' },
  { id: 'hiking',      label: 'Походы',            emoji: '🥾',  category: 'nature' },
  { id: 'fishing',     label: 'Рыбалка',           emoji: '🎣',  category: 'nature' },
  { id: 'camping',     label: 'Кемпинг',           emoji: '🏕️', category: 'nature' },
  { id: 'mushrooms',   label: 'Грибы / ягоды',     emoji: '🍄',  category: 'nature' },
  { id: 'dacha',       label: 'Дача',              emoji: '🌻',  category: 'nature' },
  { id: 'bikehike',    label: 'Велопоходы',        emoji: '🚵',  category: 'nature' },
  { id: 'roadtrip',    label: 'Автопутешествия',   emoji: '🚗',  category: 'nature' },
  { id: 'naturewalk',  label: 'Прогулки на природе', emoji: '🌿', category: 'nature' },
  { id: 'excursions',  label: 'Экскурсии',         emoji: '🗺️', category: 'nature' },

  // Игры и общение
  { id: 'boardgames',  label: 'Настолки',          emoji: '🎲',  category: 'games' },
  { id: 'quiz',        label: 'Квиз',              emoji: '🧠',  category: 'games' },
  { id: 'gaming',      label: 'Гейминг',           emoji: '🎮',  category: 'games' },
  { id: 'karaoke',     label: 'Караоке',           emoji: '🎤',  category: 'games' },
  { id: 'parties',     label: 'Вечеринки',         emoji: '🥳',  category: 'games' },
  { id: 'teamgames',   label: 'Командные игры',    emoji: '🏅',  category: 'games' },
  { id: 'volunteer',   label: 'Волонтёрство',      emoji: '🤝',  category: 'games' },
  { id: 'newpeople',   label: 'Новые знакомства',  emoji: '👋',  category: 'games' },
  { id: 'clubs',       label: 'Клубы по интересам',emoji: '🏛️', category: 'games' },
  { id: 'intgames',    label: 'Интеллектуальные игры', emoji: '♟️', category: 'games' },

  // Технологии и навыки
  { id: 'coding',      label: 'Код / программирование', emoji: '💻', category: 'tech' },
  { id: 'ai',          label: 'AI / нейросети',    emoji: '🤖',  category: 'tech' },
  { id: 'gadgets',     label: 'Гаджеты',           emoji: '📱',  category: 'tech' },
  { id: 'photovideo',  label: 'Фото / видео',      emoji: '📸',  category: 'tech' },
  { id: 'design',      label: 'Дизайн',            emoji: '🎨',  category: 'tech' },
  { id: 'printing',    label: '3D-печать',         emoji: '🖨️', category: 'tech' },
  { id: 'drones',      label: 'Дроны',             emoji: '🚁',  category: 'tech' },
  { id: 'auto',        label: 'Авто / техника',    emoji: '🚘',  category: 'tech' },
  { id: 'finance',     label: 'Финансы',           emoji: '💰',  category: 'tech' },
  { id: 'learning',    label: 'Обучение / курсы',  emoji: '📖',  category: 'tech' },
]

export const HOBBIES_BY_ID = Object.fromEntries(HOBBIES.map(h => [h.id, h]))
