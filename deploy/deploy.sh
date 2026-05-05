#!/usr/bin/env bash
# deploy.sh — деплой BSO Tinder (prod / test)
# Использование: bash deploy.sh prod | bash deploy.sh test [--skip-build]
set -euo pipefail

ENV="${1:-}"
if [[ "$ENV" != "prod" && "$ENV" != "test" ]]; then
  echo "❌  Укажи окружение: bash deploy.sh prod  или  bash deploy.sh test"
  exit 1
fi

APP_DIR="/var/www/bso-tinder"
ENV_FILE="$APP_DIR/.env.$ENV"
DIST_DIR="$APP_DIR/dist-$ENV"

# Порт для информации
[[ "$ENV" == "prod" ]] && PORT=80 || PORT=8080

echo "🚀  BSO Tinder — деплой окружения: $ENV (порт $PORT)"

# ── 1. Проверить .env файл ────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌  Файл $ENV_FILE не найден."
  echo "    Скопируй: cp .env.$ENV.example .env.$ENV  и заполни значения."
  exit 1
fi

# ── 2. Получить свежий код ────────────────────────────────────────────────────
echo "→ git pull"
git -C "$APP_DIR" pull --ff-only

# ── 3. Сборка фронтенда ───────────────────────────────────────────────────────
if [[ "${2:-}" != "--skip-build" ]]; then
  echo "→ Сборка фронтенда для $ENV"
  cd "$APP_DIR"
  npm ci --silent

  # Пробрасываем FRONTEND_ORIGIN из .env в переменную VITE_FRONTEND_ORIGIN
  FRONTEND_ORIGIN=$(grep '^FRONTEND_ORIGIN=' "$ENV_FILE" | cut -d= -f2-)
  VITE_FRONTEND_ORIGIN="$FRONTEND_ORIGIN" \
    VITE_APP_ENV="$ENV" \
    npm run build -- --outDir "dist-$ENV" --emptyOutDir

  echo "✅  Сборка готова → $DIST_DIR"
else
  echo "→ Сборка пропущена (--skip-build)"
fi

# ── 4. Проверить dist ─────────────────────────────────────────────────────────
if [[ ! -f "$DIST_DIR/index.html" ]]; then
  echo "❌  $DIST_DIR/index.html не найден. Сначала сделай сборку."
  exit 1
fi

# ── 5. Перезапустить только нужные контейнеры ────────────────────────────────
echo "→ docker compose up --build (только $ENV)"
cd "$APP_DIR"
docker compose up -d --build "bso-api-$ENV" "bso-nginx-$ENV"

echo ""
echo "✅  Деплой $ENV завершён"
echo "    URL: http://$(hostname -I | awk '{print $1}'):$PORT"
echo ""
docker compose ps "bso-api-$ENV" "bso-nginx-$ENV"
