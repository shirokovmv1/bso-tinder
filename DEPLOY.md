# DEPLOY — BSO Tinder

Универсальные правила деплоя — в скилле `deploy`. Здесь — только специфика проекта.

## Карта

```yaml
project: bso-tinder
server: ru-server
project_path: /var/www/bso-tinder
backup_paths:
  - /var/www/bso-tinder/data/data.db

environments:
  test:
    port: 8080
    containers: [bso-api-test, bso-nginx-test]
    health_url: http://localhost:8080/api/health
    rebuild_services: [bso-api-test]
    restart_services: [bso-nginx-test]
    frontend:
      env: { VITE_APP_ENV: test }
      build_cmd: "npx vite build --outDir dist-test-bld --emptyOutDir"
      build_output: dist-test-bld
      target_dir: /var/www/bso-tinder/dist-test

  prod:
    port: 80
    containers: [bso-api-prod, ru-ingress-nginx]
    health_url: http://localhost/api/health
    rebuild_services: [bso-api-prod]
    restart_services: []
    frontend:
      env: { VITE_APP_ENV: prod }
      build_cmd: "npx vite build --outDir dist-prod --emptyOutDir"
      build_output: dist-prod
      target_dir: /var/www/bso-tinder/dist-prod
```

## Особенности

- **Node не установлен на хосте RU** — фронт собирается ЛОКАЛЬНО на Windows.
- **Prod-деплой требует явного OK пользователя** перед запуском.
- **Prod публикуется через общий `ru-ingress-nginx`** — отдельного `bso-nginx-prod` нет.
- **GitHub Actions запускается только вручную** с выбором `test` или `prod`; для prod обязателен `confirm_prod=true`.
- **SQLite WAL** — перед миграциями обязательно `backup_sqlite /var/www/bso-tinder/data/data.db`.

## Команды (PowerShell, локально)

### Test deploy (frontend + backend)

```powershell
Set-Location "D:\Cloude projects\bso-tinder"

# 1. Local build
$env:VITE_APP_ENV="test"
npx vite build --outDir dist-test-bld --emptyOutDir

# 2. Transfer dist
tar czf dist-test.tar.gz -C dist-test-bld .
scp dist-test.tar.gz ru-server:/tmp/
ssh ru-server "tar xzf /tmp/dist-test.tar.gz -C /var/www/bso-tinder/dist-test && rm /tmp/dist-test.tar.gz"

# 3. Backend rebuild
ssh ru-server "cd /var/www/bso-tinder && git pull && docker compose up -d --build bso-api-test && docker compose restart bso-nginx-test"

# 4. Smoke-check
ssh ru-server "source /opt/deploy/lib.sh && smoke_check /var/www/bso-tinder test"
```

### Prod deploy

То же, но: `VITE_APP_ENV=prod`, `dist-prod`, `bso-api-prod`, target `/var/www/bso-tinder/dist-prod`, smoke `prod`. `ru-ingress-nginx` не перезапускается. **Требует явного OK.**

### Backend only

```powershell
ssh ru-server "cd /var/www/bso-tinder && git pull --ff-only && docker compose up -d --build --no-deps bso-api-test"
ssh ru-server "source /opt/deploy/lib.sh && smoke_check /var/www/bso-tinder test"
```

## .deploy.json (для серверного `smoke_check`)

В корне проекта на сервере должен лежать `.deploy.json`:

```json
{
  "environments": {
    "test": {
      "containers": ["bso-api-test", "bso-nginx-test"],
      "health_url": "http://localhost:8080/api/health"
    },
    "prod": {
      "containers": ["bso-api-prod", "ru-ingress-nginx"],
      "health_url": "http://localhost/api/health"
    }
  }
}
```
