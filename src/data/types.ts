export type HobbyCategory = 'sport' | 'creative' | 'tech' | 'nature' | 'social'

export type Department = 'Логистика' | 'Стройка' | 'IT' | 'Финансы' | 'HR'

export interface HobbyTag {
  id: string
  label: string
  emoji: string
  category: HobbyCategory
}

export interface Badge {
  id: string
  title: string
  emoji: string
  color: string
  description: string
}

export interface Employee {
  id: string
  name: string
  department: Department
  avatar: string
  hobbies: HobbyTag[]
  badge: Badge
}

export interface MatchResult {
  score: number
  sharedHobbies: HobbyTag[]
  uniqueA: HobbyTag[]
  uniqueB: HobbyTag[]
  icebreaker: string
}
