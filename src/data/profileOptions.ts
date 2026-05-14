export interface ProfileOption {
  key: string
  emoji: string
  label: string
  hex?: string
}

export const FILM_GENRES: ProfileOption[] = [
  { key: 'action',      emoji: '🎬', label: 'Боевик' },
  { key: 'comedy',      emoji: '🤣', label: 'Комедия' },
  { key: 'horror',      emoji: '😱', label: 'Ужасы' },
  { key: 'romance',     emoji: '❤️', label: 'Мелодрама' },
  { key: 'scifi',       emoji: '🚀', label: 'Фантастика' },
  { key: 'thriller',    emoji: '🕵️', label: 'Триллер' },
  { key: 'drama',       emoji: '🎭', label: 'Драма' },
  { key: 'fantasy',     emoji: '🧙', label: 'Фэнтези' },
  { key: 'documentary', emoji: '📽️', label: 'Документальное' },
  { key: 'anime',       emoji: '🎌', label: 'Аниме' },
]

export const BOOK_GENRES: ProfileOption[] = [
  { key: 'detective',    emoji: '🕵️', label: 'Детектив' },
  { key: 'sci_fi_book',  emoji: '🚀', label: 'Фантастика' },
  { key: 'fantasy_book', emoji: '🧙', label: 'Фэнтези' },
  { key: 'romance_book', emoji: '❤️', label: 'Роман' },
  { key: 'nonfiction',   emoji: '🧠', label: 'Нон-фикшн' },
  { key: 'humor',        emoji: '😂', label: 'Юмор' },
  { key: 'adventure',    emoji: '🌍', label: 'Приключения' },
  { key: 'business',     emoji: '💼', label: 'Бизнес' },
  { key: 'selfdev',      emoji: '🌱', label: 'Саморазвитие' },
  { key: 'classics',     emoji: '📖', label: 'Классика' },
]

export const MUSIC_GENRES: ProfileOption[] = [
  { key: 'rock',       emoji: '🎸', label: 'Рок' },
  { key: 'pop',        emoji: '🎵', label: 'Поп' },
  { key: 'electronic', emoji: '🎹', label: 'Электроника' },
  { key: 'jazz',       emoji: '🎺', label: 'Джаз' },
  { key: 'rap',        emoji: '🎤', label: 'Рэп / хип-хоп' },
  { key: 'folk',       emoji: '🤠', label: 'Шансон / фолк' },
  { key: 'classical',  emoji: '🎻', label: 'Классика' },
  { key: 'metal',      emoji: '🥁', label: 'Метал' },
  { key: 'rnb',        emoji: '🌊', label: 'R&B' },
  { key: 'indie',      emoji: '🎙️', label: 'Инди' },
]

export const ZODIAC_SIGNS: ProfileOption[] = [
  { key: 'aries',       emoji: '♈', label: 'Овен' },
  { key: 'taurus',      emoji: '♉', label: 'Телец' },
  { key: 'gemini',      emoji: '♊', label: 'Близнецы' },
  { key: 'cancer',      emoji: '♋', label: 'Рак' },
  { key: 'leo',         emoji: '♌', label: 'Лев' },
  { key: 'virgo',       emoji: '♍', label: 'Дева' },
  { key: 'libra',       emoji: '♎', label: 'Весы' },
  { key: 'scorpio',     emoji: '♏', label: 'Скорпион' },
  { key: 'sagittarius', emoji: '♐', label: 'Стрелец' },
  { key: 'capricorn',   emoji: '♑', label: 'Козерог' },
  { key: 'aquarius',    emoji: '♒', label: 'Водолей' },
  { key: 'pisces',      emoji: '♓', label: 'Рыбы' },
]

export const BASE_COLORS: ProfileOption[] = [
  { key: 'red',    emoji: '❤️', label: 'Красный',     hex: '#E53935' },
  { key: 'orange', emoji: '🧡', label: 'Оранжевый',   hex: '#FB8C00' },
  { key: 'yellow', emoji: '💛', label: 'Жёлтый',      hex: '#FDD835' },
  { key: 'green',  emoji: '💚', label: 'Зелёный',     hex: '#43A047' },
  { key: 'blue',   emoji: '💙', label: 'Синий',       hex: '#1E88E5' },
  { key: 'purple', emoji: '💜', label: 'Фиолетовый',  hex: '#8E24AA' },
  { key: 'pink',   emoji: '🩷', label: 'Розовый',     hex: '#EC407A' },
  { key: 'white',  emoji: '🤍', label: 'Белый',       hex: '#F5F5F5' },
  { key: 'black',  emoji: '🖤', label: 'Чёрный',      hex: '#212121' },
  { key: 'brown',  emoji: '🤎', label: 'Коричневый',  hex: '#6D4C41' },
]

export function parseOptionKeys(raw?: string | null) {
  return (raw ?? '').split(',').map(value => value.trim()).filter(Boolean)
}

export function getSelectedOptions(raw: string | null | undefined, options: ProfileOption[]) {
  const keys = new Set(parseOptionKeys(raw))
  return options.filter(option => keys.has(option.key))
}

export function findProfileOption(key: string | null | undefined, options: ProfileOption[]) {
  return options.find(option => option.key === key)
}
