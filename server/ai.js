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

module.exports = { generatePitch }
