FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
COPY server/package.json ./server/
COPY activity/package.json ./activity/
RUN bun install --production
COPY server ./server
COPY activity ./activity
WORKDIR /app/server
ENV SERVER_PORT=3001
EXPOSE 3001
CMD ["bun", "start"]
