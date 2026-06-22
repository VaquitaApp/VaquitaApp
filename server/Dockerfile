FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ── Desarrollo — usado por docker-compose (build.target: dev) ────────
# Incluye devDependencies (nodemon); el código se monta como volumen
# desde el compose para hot-reload.
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# ── Producción — imagen para ECR / ECS Express Mode (staging y prod) ─
# Solo dependencias de producción; el ambiente se define por variables
# de entorno en la task definition (MONGO_URI, JWT_SECRET, SMTP, APP_BASE_URL).
FROM base AS prod
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY . .
EXPOSE 3001
CMD ["node", "src/server.js"]
