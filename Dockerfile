FROM node:20-alpine

# better-sqlite3 требует нативной компиляции
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Зависимости отдельным слоем — кэшируются при неизменном package.json
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Исходники бэкенда
COPY server/ ./server/

# Директория для SQLite volume и логов
RUN mkdir -p /data /app/server/logs

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/data.db

EXPOSE 3001
CMD ["node", "server/server.js"]
