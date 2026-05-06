# BSO Tinder 🔶

PWA-приложение для нетворкинга сотрудников на летнем корпоративе **БСО Логистик**.

## О проекте

Геймифицированный нетворкинг: выбери хобби → получи шуточный бейдж → найди коллег с похожими интересами.

**Фирменные цвета:** оранжевый `#FF6B00` + графитовый `#1A1A1A`

## Стек

- **Vite** + **React 18** + **TypeScript**
- **Zustand** — управление состоянием
- **Tailwind CSS v4** — стилизация
- **Framer Motion** — анимации
- **vite-plugin-pwa** — PWA-поддержка

## Функциональность

| Фича | Статус |
|------|--------|
| Структура проекта, Tailwind, PWA-манифест | ✅ Шаг 1 |
| Mock-данные, Zustand-стор | ✅ Шаг 2 |
| UI-компоненты | ✅ Шаг 3 |
| Страницы и роутинг | 🔜 Шаг 4 |

## Переменные окружения

### Backend (`server/.env` / `docker-compose.yml`)

| Переменная | Значения | Описание |
|---|---|---|
| `APP_ENV` | `prod` / `test` | Разделяет поведение: `prod` требует валидный JWT_SECRET, запрещает dev-login |
| `ALLOW_DEV_LOGIN` | `true` / `false` | Разрешает эндпоинт `POST /api/auth/dev-login` (admin/admin). Только `test` |
| `JWT_SECRET` | строка ≥ 32 символов | В `APP_ENV=prod` сервер **не запустится** без валидного секрета |
| `NODE_ENV` | `production` | Управляет CORS и поведением Express |

### Frontend (`.env` / `vite.config`)

| Переменная | Значения | Описание |
|---|---|---|
| `VITE_APP_ENV` | `prod` / `test` | Определяет UI страницы логина |

### Поведение страницы входа

| `VITE_APP_ENV` | Страница `/login` |
|---|---|
| `prod` | Заглушка «Войдите по персональной ссылке» — форма скрыта |
| `test` | Форма `admin / admin` для тестового доступа |

### Magic-links

- Срок жизни: **30 дней** с момента генерации (`expires_at`).
- Одноразовые: после первого входа помечаются `used_at` и `revoked = 1`.
- Истёкшие / использованные ссылки **автоматически перевыпускаются** при следующем запросе через `/api/admin/magic-link/:id` или CSV-экспорт.
- CSV-экспорт (`/api/admin/users/csv`) **не включает** пользователей с `is_admin = 1`.

### Сборка фронтенда по среде

```bash
# TEST
VITE_APP_ENV=test npm run build -- --outDir dist-test

# PROD
VITE_APP_ENV=prod npm run build -- --outDir dist-prod
```

## Запуск локально

```bash
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173`

## Роутинг

| Путь | Страница |
|------|----------|
| `/onboarding` | Онбординг (имя → хобби → бейдж) |
| `/feed` | Лента сотрудников |
| `/match` | Экран мэтчинга |
| `/profile` | Профиль пользователя |

## Security & Operations

### Rate limiting

| Лимитер | Роуты | Окно | Максимум |
|---|---|---|---|
| Global | все `/api/*` | 60 сек | 120 req/IP |
| Auth strict | `/api/auth/dev-login`, `/api/auth/magic-login` | 15 мин | 10 req/IP |
| Admin | все `/api/admin/*` | 60 сек | 60 req/IP |
| Reactions | `POST /api/reactions` | 60 сек | 30 req/IP |

При превышении лимита возвращается `HTTP 429 Too Many Requests`.

### Проверка rate-limit

```bash
# Проверить, что на 11-й запрос приходит 429
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://158.255.5.199/api/auth/magic-login \
    -H "Content-Type: application/json" \
    -d '{"token":"test"}'
done
# Ожидаемый вывод: 400 (×10), потом 429
```

### Проверка security headers

```bash
curl -sI http://158.255.5.199/api/health | grep -iE "x-frame|x-content|referrer|permissions"
```

Ожидаемые заголовки:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

В DevTools: Network → любой `/api/` запрос → вкладка Response Headers.

### Healthcheck

```bash
curl http://158.255.5.199/api/health
# {"status":"ok","db":"ok","env":"production"}
```

При недоступности БД вернёт `HTTP 503` с `{"status":"degraded","db":"error"}`.
