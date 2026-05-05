module.exports = {
  apps: [
    {
      name: 'bso-tinder-api',
      script: './server/server.js',
      cwd: '/var/www/bso-tinder',

      instances: 1,          // SQLite не поддерживает multi-process запись, только 1 инстанс
      exec_mode: 'fork',

      // ── Автоперезапуск ─────────────────────────────────────────────────
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,   // 3 с между попытками
      max_memory_restart: '256M',

      // ── Логи ───────────────────────────────────────────────────────────
      out_file:  './server/logs/pm2-out.log',
      error_file: './server/logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ── Переменные окружения ────────────────────────────────────────────
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Остальные секреты задаются через .env на сервере
      },
    },
  ],
}
