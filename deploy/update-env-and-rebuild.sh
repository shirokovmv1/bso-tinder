#!/bin/bash
set -e
cd /var/www/bso-tinder

echo "=== Updating .env files ==="
grep -q "^APP_ENV=" .env.prod         || echo "APP_ENV=prod"          >> .env.prod
grep -q "^ALLOW_DEV_LOGIN=" .env.prod || echo "ALLOW_DEV_LOGIN=false" >> .env.prod

grep -q "^APP_ENV=" .env.test         || echo "APP_ENV=test"          >> .env.test
grep -q "^ALLOW_DEV_LOGIN=" .env.test || echo "ALLOW_DEV_LOGIN=true"  >> .env.test

echo "--- .env.prod security vars ---"
grep -E "APP_ENV|ALLOW_DEV_LOGIN" .env.prod
JWT_LEN=$(grep "^JWT_SECRET=" .env.prod | cut -d= -f2 | wc -c)
echo "JWT_SECRET length (prod): $JWT_LEN chars"

echo "--- .env.test security vars ---"
grep -E "APP_ENV|ALLOW_DEV_LOGIN" .env.test

echo "=== Rebuilding Docker images ==="
docker compose build --no-cache bso-api-prod bso-api-test

echo "=== Restarting containers ==="
docker compose up -d bso-api-prod bso-nginx-prod bso-api-test bso-nginx-test

echo "=== Waiting 10s for health checks ==="
sleep 10

echo "=== Smoke tests ==="
curl -sf http://localhost:80/api/health   && echo " PROD OK" || echo " PROD FAIL"
curl -sf http://localhost:8080/api/health && echo " TEST OK" || echo " TEST FAIL"

echo "=== DONE ==="
