FROM oven/bun:1.3

WORKDIR /app

# Monorepo: server imports game logic from activity/src
COPY package.json bun.lock ./
COPY server/package.json ./server/
COPY activity/package.json ./activity/
RUN bun install --frozen-lockfile

COPY server ./server
COPY activity/src ./activity/src
COPY activity/tsconfig.json ./activity/tsconfig.json

WORKDIR /app/server

ENV NODE_ENV=production

CMD ["bun", "start"]
