# DEPLOY — BSO Tinder

Универсальные правила деплоя — в скилле `deploy`. Здесь — только специфика проекта.

## Карта

```yaml
project: bso-tinder
server: ru-server
project_path: /var/www/bso-tinder
backup_paths:
  test: /var/lib/docker/volumes/bso-db-test/_data/data.db
  prod: /var/lib/docker/volumes/bso-db-prod/_data/data.db

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
- **SQLite WAL** — рабочая БД находится в Docker volume `bso-db-test` / `bso-db-prod`, внутри контейнера путь всегда `/data/data.db`.
- Перед миграциями обязательна консистентная SQLite backup-копия с `integrity_check=ok`. Простое копирование только `data.db` при активном WAL не считается backup.

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

## SQLite backup и rollback

Команды ниже выполняются отдельно для `test` или `prod`. Для `prod` backup разрешён read-only, а rollback и остановка контейнера требуют отдельного явного OK пользователя.

### Консистентный backup

```powershell
$Environment = "test" # или prod
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Container = "bso-api-$Environment"
$Volume = "bso-db-$Environment"
$BackupDir = "/opt/backups/$Volume.$Stamp"
$InVolumeBackup = "/data/manual-backups/pre-deploy-$Stamp.db"

ssh ru-server "docker exec $Container node /app/server/sqlite-backup.js backup /data/data.db $InVolumeBackup"
ssh ru-server "install -d -m 700 $BackupDir && cp -a /var/lib/docker/volumes/$Volume/_data/manual-backups/pre-deploy-$Stamp.db $BackupDir/data.db && test -s $BackupDir/data.db"
ssh ru-server "docker cp $BackupDir/data.db ${Container}:/tmp/backup-check.db && docker exec $Container node /app/server/sqlite-backup.js check /tmp/backup-check.db && docker exec $Container rm -f /tmp/backup-check.db"
```

Успех: обе команды `backup` и `check` возвращают `"integrity":"ok"`, а файл `$BackupDir/data.db` существует и не пустой.

### Rollback БД

Перед rollback зафиксировать точный `$BackupPath`, проверить его через `sqlite-backup.js check` и убедиться, что выбран правильный environment. Следующий блок останавливает API и заменяет БД:

```powershell
$Environment = "test" # prod только после отдельного явного OK
$Container = "bso-api-$Environment"
$VolumeData = "/var/lib/docker/volumes/bso-db-$Environment/_data"
$BackupPath = "/opt/backups/bso-db-$Environment.YYYYMMDD-HHMMSS/data.db"

ssh ru-server "test -s $BackupPath && docker cp $BackupPath ${Container}:/tmp/rollback-check.db && docker exec $Container node /app/server/sqlite-backup.js check /tmp/rollback-check.db && docker exec $Container rm -f /tmp/rollback-check.db"
ssh ru-server "docker stop $Container && install -m 600 $BackupPath $VolumeData/data.db && rm -f $VolumeData/data.db-wal $VolumeData/data.db-shm && docker start $Container"
ssh ru-server "curl -fsS http://127.0.0.1:$(if ($Environment -eq 'test') { '8080' } else { '80' })/api/health"
```

Успех: контейнер запущен, health возвращает `status=ok`, `db=ok` и ожидаемый `env`; после rollback дополнительно проходит golden path соответствующего релиза.

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
