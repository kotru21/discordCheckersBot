#!/bin/sh
set -eu

# Discord slash-command launcher (optional; shares DISCORD_TOKEN with server)
(cd /app/bot && bun start) &
BOT_PID=$!

cleanup() {
  kill "$BOT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd /app/server
exec bun start
