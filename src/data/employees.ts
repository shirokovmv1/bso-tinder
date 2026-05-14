import type { Employee } from './types'
import { HOBBIES_BY_ID } from './hobbies'
import { BADGES } from './badges'

const h = (id: string) => HOBBIES_BY_ID[id]
const b = (id: string) => BADGES.find(badge => badge.id === id)!

const avatar = (name: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`

export const EMPLOYEES: Employee[] = [
  {
    id: 'e1', name: 'Алексей Громов', department: 'IT',
    avatar: avatar('Алексей Громов'),
    hobbies: [h('gaming'), h('coding'), h('drones'), h('football'), h('boardgames')],
    badge: b('cybersportsman'),
  },
  {
    id: 'e2', name: 'Мария Соколова', department: 'HR',
    avatar: avatar('Мария Соколова'),
    hobbies: [h('dancing'), h('yoga'), h('cooking'), h('travel'), h('parties')],
    badge: b('life_of_party'),
  },
  {
    id: 'e3', name: 'Дмитрий Волков', department: 'Стройка',
    avatar: avatar('Дмитрий Волков'),
    hobbies: [h('camping'), h('fishing'), h('hiking'), h('gym'), h('mushrooms')],
    badge: b('wild_tracker'),
  },
  {
    id: 'e4', name: 'Екатерина Лебедева', department: 'Финансы',
    avatar: avatar('Екатерина Лебедева'),
    hobbies: [h('photovideo'), h('travel'), h('design'), h('movies'), h('cooking')],
    badge: b('romantic'),
  },
  {
    id: 'e5', name: 'Сергей Новиков', department: 'Логистика',
    avatar: avatar('Сергей Новиков'),
    hobbies: [h('football'), h('gym'), h('gaming'), h('running'), h('boardgames')],
    badge: b('team_player'),
  },
  {
    id: 'e6', name: 'Ольга Петрова', department: 'HR',
    avatar: avatar('Ольга Петрова'),
    hobbies: [h('volunteer'), h('crafts'), h('garden'), h('music'), h('parties')],
    badge: b('life_of_party'),
  },
  {
    id: 'e7', name: 'Никита Морозов', department: 'IT',
    avatar: avatar('Никита Морозов'),
    hobbies: [h('coding'), h('gadgets'), h('printing'), h('podcasts'), h('gaming')],
    badge: b('eco_hacker'),
  },
  {
    id: 'e8', name: 'Анна Козлова', department: 'Финансы',
    avatar: avatar('Анна Козлова'),
    hobbies: [h('yoga'), h('swimming'), h('design'), h('music'), h('garden')],
    badge: b('romantic'),
  },
  {
    id: 'e9', name: 'Павел Зайцев', department: 'Стройка',
    avatar: avatar('Павел Зайцев'),
    hobbies: [h('fishing'), h('camping'), h('bikehike'), h('mushrooms'), h('running')],
    badge: b('wild_tracker'),
  },
  {
    id: 'e10', name: 'Юлия Смирнова', department: 'Логистика',
    avatar: avatar('Юлия Смирнова'),
    hobbies: [h('travel'), h('movies'), h('streetfood'), h('parties'), h('photovideo')],
    badge: b('explorer'),
  },
  {
    id: 'e11', name: 'Андрей Фёдоров', department: 'IT',
    avatar: avatar('Андрей Фёдоров'),
    hobbies: [h('drones'), h('printing'), h('coding'), h('cycling'), h('gaming')],
    badge: b('digital_artist'),
  },
  {
    id: 'e12', name: 'Наталья Орлова', department: 'HR',
    avatar: avatar('Наталья Орлова'),
    hobbies: [h('dancing'), h('cooking'), h('crafts'), h('movies'), h('volunteer')],
    badge: b('life_of_party'),
  },
  {
    id: 'e13', name: 'Владимир Кузнецов', department: 'Стройка',
    avatar: avatar('Владимир Кузнецов'),
    hobbies: [h('gym'), h('football'), h('swimming'), h('fishing'), h('camping')],
    badge: b('team_player'),
  },
  {
    id: 'e14', name: 'Татьяна Попова', department: 'Финансы',
    avatar: avatar('Татьяна Попова'),
    hobbies: [h('yoga'), h('garden'), h('cooking'), h('music'), h('hiking')],
    badge: b('eco_hacker'),
  },
  {
    id: 'e15', name: 'Михаил Соловьёв', department: 'Логистика',
    avatar: avatar('Михаил Соловьёв'),
    hobbies: [h('boardgames'), h('gaming'), h('podcasts'), h('movies'), h('streetfood')],
    badge: b('networker'),
  },
  {
    id: 'e16', name: 'Виктория Белова', department: 'IT',
    avatar: avatar('Виктория Белова'),
    hobbies: [h('photovideo'), h('design'), h('music'), h('travel'), h('coding')],
    badge: b('digital_artist'),
  },
  {
    id: 'e17', name: 'Роман Тихонов', department: 'Стройка',
    avatar: avatar('Роман Тихонов'),
    hobbies: [h('running'), h('cycling'), h('gym'), h('hiking'), h('football')],
    badge: b('wild_tracker'),
  },
  {
    id: 'e18', name: 'Ирина Захарова', department: 'HR',
    avatar: avatar('Ирина Захарова'),
    hobbies: [h('volunteer'), h('travel'), h('parties'), h('cooking'), h('boardgames')],
    badge: b('explorer'),
  },
  {
    id: 'e19', name: 'Константин Яковлев', department: 'Финансы',
    avatar: avatar('Константин Яковлев'),
    hobbies: [h('gadgets'), h('podcasts'), h('boardgames'), h('garden'), h('fishing')],
    badge: b('allrounder'),
  },
  {
    id: 'e20', name: 'Светлана Романова', department: 'Логистика',
    avatar: avatar('Светлана Романова'),
    hobbies: [h('dancing'), h('photo'), h('swimming'), h('travel'), h('parties')],
    badge: b('life_of_party'),
  },
]
