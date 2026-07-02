FROM oven/bun:1.3

WORKDIR /app

COPY package.json bun.lock ./
COPY server/package.json ./server/
COPY packages/game/package.json ./packages/game/
COPY activity/package.json ./activity/
COPY bot/package.json ./bot/
RUN bun install --frozen-lockfile

COPY server ./server
COPY packages/game ./packages/game
COPY bot ./bot

COPY scripts/start-production.sh ./scripts/start-production.sh
RUN chmod +x ./scripts/start-production.sh

ENV NODE_ENV=production

CMD ["./scripts/start-production.sh"]
