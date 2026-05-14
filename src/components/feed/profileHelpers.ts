import type { ApiUser } from '@/api/client'

const TONES = [
  'linear-gradient(135deg,#FF8A33,#FF6B00)',
  'linear-gradient(135deg,#5b6cff,#3a4be0)',
  'linear-gradient(135deg,#34D399,#0EA371)',
  'linear-gradient(135deg,#B388FF,#7C4DFF)',
  'linear-gradient(135deg,#FF8FAB,#E94B7C)',
]

export function toneFor(id: string) {
  return TONES[id.charCodeAt(0) % TONES.length]
}

export function getDisplayName(user: ApiUser) {
  const fullName = [user.last_name, user.first_name, user.middle_name]
    .map(value => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')

  return fullName || user.name || 'Без имени'
}

export function getDisplayPosition(user: ApiUser) {
  return user.position?.trim() || 'Должность не указана'
}

export function getInitials(user: ApiUser) {
  return getDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || '?'
}
