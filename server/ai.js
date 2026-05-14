const db = require('./db')
const logger = require('./logger')

function getLlmConfig() {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'llm_%'").all()
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

async function generatePitch({ department, experienceMonths, hobbies }) {
  const cfg = getLlmConfig()
  const provider  = cfg.llm_provider  || 'openai'
  const apiKey    = cfg.llm_api_key
  const model     = cfg.llm_model
  const baseUrl   = cfg.llm_base_url?.replace(/\/$/, '')

  if (!apiKey || !model) {
    logger.warn('AI pitch skipped: no LLM config')
    return null
  }

  const hobbiesList = Array.isArray(hobbies) ? hobbies.join(', ') : hobbies || '—'
  const months = experienceMonths ? `${experienceMonths} мес.` : 'не указан'

  const prompt = `Ты HR-ассистент. По данным сотрудника составь короткое описание для корпоративного нетворкинга.

Данные сотрудника:
- Отдел: ${department || 'не указан'}
- Стаж: ${months}
- Интересы: ${hobbiesList}

Верни JSON (без markdown, без пояснений):
{
  "pitch": "2-3 предложения о человеке от третьего лица",
  "badge_title": "Бейдж-звание 2-3 слова",
  "badge_emoji": "одно эмодзи",
  "badge_reason": "одно предложение — почему этот бейдж"
}`

  try {
    let text

    if (provider === 'anthropic') {
      const url = baseUrl ? `${baseUrl}/v1/messages` : 'https://api.anthropic.com/v1/messages'
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!r.ok) throw new Error(`Anthropic ${r.status}`)
      const data = await r.json()
      text = data.content?.[0]?.text

    } else if (provider === 'google') {
      const base = baseUrl || 'https://generativelanguage.googleapis.com'
      const url = `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      })
      if (!r.ok) throw new Error(`Google ${r.status}`)
      const data = await r.json()
      text = data.candidates?.[0]?.content?.parts?.[0]?.text

    } else {
      // openai / cursor / custom
      const url = baseUrl
        ? `${baseUrl}/v1/chat/completions`
        : provider === 'cursor'
          ? 'https://api.cursor.sh/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions'

      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!r.ok) throw new Error(`${provider} ${r.status}`)
      const data = await r.json()
      text = data.choices?.[0]?.message?.content
    }

    if (!text) throw new Error('Пустой ответ от модели')

    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    logger.info('AI pitch generated', { provider, model, department })
    return result

  } catch (e) {
    logger.error('AI pitch failed', { error: e.message, provider, model })
    return null
  }
}

// ── Шаблонная генерация без внешнего API ────────────────────────────────────

const TECH_KW     = ['код', 'dev', 'python', 'js', 'программ', 'git', 'api', 'linux', 'ai', 'ml', 'data', 'c++', 'java', 'sql', 'backend', 'frontend']
const SOCIAL_KW   = ['вечеринк', 'общени', 'тусов', 'нетворк', 'team', 'люди', 'волонтёр', 'благотвор']
const SPORT_KW    = ['спорт', 'бег', 'йога', 'фитнес', 'тренаж', 'плавани', 'велосип', 'футбол', 'баскетбол', 'волейбол', 'хоккей', 'теннис']
const TRAVEL_KW   = ['путешест', 'поход', 'горы', 'туризм', 'город', 'страны', 'море', 'экспедиц']
const CREATIVE_KW = ['рисов', 'фото', 'музык', 'кино', 'дизайн', 'art', 'писател', 'поэзи', 'скульптур', 'шитьё', 'рукоделие']

function matchKw(hobbies, keywords) {
  const joined = hobbies.join(' ').toLowerCase()
  return keywords.some(kw => joined.includes(kw))
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generatePitchAndBadge({ gender, experienceMonths, department, hobbies } = {}) {
  const dept      = department || 'компании'
  const exp       = typeof experienceMonths === 'number' ? experienceMonths : (parseInt(experienceMonths) || null)
  const hobbyArr  = Array.isArray(hobbies) ? hobbies : []
  const h1        = hobbyArr[0] || 'разные интересы'
  const h2        = hobbyArr[1] || hobbyArr[0] || 'активный отдых'
  const expStr    = exp != null ? `${exp} мес.` : 'неизвестный'
  const pronoun   = gender === 'f' ? 'Она' : gender === 'm' ? 'Он' : 'Этот специалист'
  const came      = gender === 'f' ? 'пришла' : 'пришёл'
  const stood     = gender === 'f' ? 'выделилась' : 'выделился'

  const pitchTemplates = [
    () => `${pronoun} работает в ${dept} и сочетает профессионализм с живыми интересами — ${h1} и ${h2}.`,
    () => `Специалист из ${dept} со стажем ${expStr}. За работой ценит результат, вне работы — ${h1}.`,
    () => `${pronoun} из ${dept} — из тех, кто умеет совмещать дело и страсть. Увлекается ${h1} и ${h2}.`,
    () => `Коллега из ${dept}. За плечами — ${expStr} опыта и живой интерес к ${h1}.`,
    () => `${pronoun} ${came} в команду ${dept} и сразу ${stood}: ${h1}, ${h2} — вот чем живёт вне работы.`,
    () => `В ${dept} знают: если нужен человек с головой и характером — это ${pronoun.toLowerCase()}. А в свободное время — ${h1}.`,
    () => `Стаж в ${dept}: ${expStr}. Помимо работы увлекается ${h1} — говорит, это помогает думать иначе.`,
    () => `${pronoun} из ${dept} убеждён(а): лучший способ развиваться — совмещать ${h1} и постоянное обучение.`,
    () => `Энергичный коллега из ${dept}. ${h1} и ${h2} — источники вдохновения, которые чувствуются в работе.`,
    () => `${pronoun} нашёл(а) баланс между профессиональным ростом в ${dept} и любимыми занятиями: ${h1}, ${h2}.`,
  ]

  const pitch = pickRandom(pitchTemplates)()

  // Определяем профиль по хобби
  const isTech     = matchKw(hobbyArr, TECH_KW)
  const isSocial   = matchKw(hobbyArr, SOCIAL_KW)
  const isSport    = matchKw(hobbyArr, SPORT_KW)
  const isTravel   = matchKw(hobbyArr, TRAVEL_KW)
  const isCreative = matchKw(hobbyArr, CREATIVE_KW)

  let badge_emoji, badge_title, badge_reason

  if (isTech && exp != null && exp >= 36) {
    badge_emoji  = '🧙'
    badge_title  = 'Технический гуру'
    badge_reason = 'Глубокая экспертиза и страсть к технологиям.'
  } else if (isTech && exp != null && exp < 12) {
    badge_emoji  = '⚡'
    badge_title  = 'Цифровой новичок'
    badge_reason = 'Быстро учится и горит идеями.'
  } else if (isTech) {
    badge_emoji  = '💻'
    badge_title  = 'Цифровой боец'
    badge_reason = 'Технологии — родная стихия.'
  } else if (exp != null && exp >= 60) {
    badge_emoji  = '🌟'
    badge_title  = 'Ветеран команды'
    badge_reason = 'Знает, как здесь всё устроено, и готов помочь.'
  } else if (exp != null && exp < 6) {
    badge_emoji  = '🌱'
    badge_title  = 'Энерджайзер'
    badge_reason = 'Свежий взгляд — ценный ресурс для команды.'
  } else if (isSocial) {
    badge_emoji  = '🎭'
    badge_title  = 'Душа офиса'
    badge_reason = 'Умеет собрать людей вокруг себя.'
  } else if (isSport) {
    badge_emoji  = '🏃'
    badge_title  = 'Движение — жизнь'
    badge_reason = 'Энергии хватит на всю команду.'
  } else if (isTravel) {
    badge_emoji  = '🗺️'
    badge_title  = 'Искатель приключений'
    badge_reason = 'Мир — лучший учебник.'
  } else if (isCreative) {
    badge_emoji  = '🎨'
    badge_title  = 'Творческий дух'
    badge_reason = 'Видит мир иначе и привносит свежие идеи.'
  } else {
    badge_emoji  = '✨'
    badge_title  = 'Универсальный боец'
    badge_reason = 'Разносторонний, открытый, всегда готов к новому.'
  }

  return { pitch, badge_title, badge_emoji, badge_reason }
}

// ── AI-матч: оценка совместимости двух сотрудников ──────────────────────────

async function generateMatch(userA, userB) {
  const cfg = getLlmConfig()
  const provider = cfg.llm_provider || 'openai'
  const apiKey   = cfg.llm_api_key
  const model    = cfg.llm_model
  const baseUrl  = cfg.llm_base_url?.replace(/\/$/, '')

  if (!apiKey || !model) return null

  function userBlock(u) {
    const name = [u.last_name, u.first_name].filter(Boolean).join(' ') || u.name || u.email
    const hobbies = (u.hobbies || []).map(h => h.label).join(', ') || '—'
    return [
      `Имя: ${name}`,
      `Отдел: ${u.department || '—'} | Должность: ${u.position || '—'} | Стаж: ${u.experience_months ? u.experience_months + ' мес.' : '—'}`,
      `Хобби: ${hobbies}`,
      `Кино: ${u.last_movies || '—'} | Книги: ${u.last_books || '—'} | Музыка: ${u.last_songs || '—'}`,
      `Знак зодиака: ${u.zodiac_sign || '—'} | Цвет: ${u.fav_color || '—'}`,
      u.about_short ? `О себе: ${u.about_short}` : null,
      u.current_interests ? `Сейчас увлечён(а): ${u.current_interests}` : null,
    ].filter(Boolean).join('\n')
  }

  const prompt = `Ты HR-ассистент корпоративного нетворкинга. Оцени совместимость двух сотрудников для знакомства и совместной работы.

СОТРУДНИК А:
${userBlock(userA)}

СОТРУДНИК Б:
${userBlock(userB)}

Ответь строго в JSON без markdown:
{
  "score": <число 0-100>,
  "description": "<3-4 предложения — что объединяет, о чём поговорить, почему познакомиться>",
  "icebreaker": "<одна фраза-повод начать разговор>"
}`

  try {
    let text

    if (provider === 'anthropic') {
      const url = baseUrl ? `${baseUrl}/v1/messages` : 'https://api.anthropic.com/v1/messages'
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 512, messages: [{ role: 'user', content: prompt }] }),
      })
      if (!r.ok) throw new Error(`Anthropic ${r.status}`)
      text = (await r.json()).content?.[0]?.text

    } else if (provider === 'google') {
      const base = baseUrl || 'https://generativelanguage.googleapis.com'
      const r = await fetch(`${base}/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      })
      if (!r.ok) throw new Error(`Google ${r.status}`)
      text = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text

    } else {
      const url = baseUrl
        ? `${baseUrl}/v1/chat/completions`
        : provider === 'cursor'
          ? 'https://api.cursor.sh/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions'
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 512, messages: [{ role: 'user', content: prompt }] }),
      })
      if (!r.ok) throw new Error(`${provider} ${r.status}`)
      text = (await r.json()).choices?.[0]?.message?.content
    }

    if (!text) throw new Error('Пустой ответ от модели')
    const result = JSON.parse(text.replace(/```json|```/g, '').trim())
    if (typeof result.score !== 'number' || !result.description) throw new Error('Некорректный JSON')
    logger.info('AI match generated', { provider, model })
    return result

  } catch (e) {
    logger.warn('AI match failed', { error: e.message })
    return null
  }
}

module.exports = { generatePitch, generatePitchAndBadge, generateMatch }
