# Discord Checkers — Beagle vs Corgi

3D international checkers (10×10) as a [Discord Activity](https://discord.com/developers/docs/activities/overview): two players in a voice channel face off as Beagle vs Corgi on a React Three Fiber board.

Based on the standalone game [CorgiBigleCheckers](https://github.com/kotru21/CorgiBigleCheckers), adapted for Discord Embedded App SDK multiplayer.

## Monorepo structure

| Package    | Path        | Role                                                                       |
| ---------- | ----------- | -------------------------------------------------------------------------- |
| `activity` | `activity/` | Vite + React 3D client (Discord iframe)                                    |
| `server`   | `server/`   | Bun + Hono API, OAuth token exchange, WebSocket game rooms                 |
| `bot`      | `bot/`      | Optional Discord bot — `/checkers` slash command to launch the Activity    |

## Prerequisites

- [Bun](https://bun.sh/) (runtime and package manager)
- A [Discord Developer Application](https://discord.com/developers/applications) with **Activities** enabled
- For local testing: Discord client (desktop or web) and a server where you can use voice channels

## Local development

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

   Fill in at minimum:

   - `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — OAuth (server)
   - `VITE_DISCORD_CLIENT_ID` — same client ID (activity build)
   - `VITE_API_HOST` — e.g. `localhost:3001`
   - `DISCORD_TOKEN` — bot token (only if running the bot)
   - `DISCORD_GUILD_ID` — optional; guild-scoped slash command registration

2. Install dependencies:

   ```bash
   bun install
   ```

3. Start services (three terminals):

   ```bash
   bun run dev:server   # terminal 1 — API + WebSocket on :3001
   bun run dev:activity # terminal 2 — Vite dev server
   bun run dev:bot      # terminal 3 — optional slash-command bot
   ```

4. Register slash commands (once per app/guild):

   ```bash
   bun run --cwd bot register-commands
   ```

5. Open the Activity URL from the Discord Developer Portal (see below) or use Activity dev tooling with your local Vite URL.

## Scripts

Run from the repo root:

| Script | Description |
| ------ | ----------- |
| `bun run dev` | Run all workspace `dev` scripts |
| `bun run dev:activity` | Vite dev server for the 3D client |
| `bun run dev:server` | Bun server with hot reload |
| `bun run dev:bot` | Optional Discord bot |
| `bun run build` | Production build of `activity/` → `activity/dist` |
| `bun run test` | Vitest unit tests (`activity/`) |
| `bun run lint` | ESLint across the monorepo |
| `bun run typecheck` | TypeScript check (`activity` + `server`) |
| `bun run check` | `lint` + `typecheck` + `test` |

## Discord Developer Portal setup

1. **Create an application** at [discord.com/developers/applications](https://discord.com/developers/applications).

2. **Enable Activities** (Settings → Activities or Embedded App).

3. **OAuth2**
   - Add redirect URL(s) required by your hosting (Vercel preview/production URLs).
   - Note **Client ID** and **Client Secret** for `.env`.

4. **OAuth2 scopes** (used by the embedded client):
   - `identify`
   - `guilds`
   - `rpc.activities.write`

5. **Activity URL** — point to your deployed activity frontend (see Deploy):
   - Production: `https://your-app.vercel.app`
   - Local dev: use Discord’s Activity dev / tunnel workflow with your Vite `--host` URL

6. **Bot** (optional, for `/checkers`):
   - Create a bot user, copy token → `DISCORD_TOKEN`
   - Invite with scopes: `bot`, `applications.commands`
   - Enable **Message Content Intent** only if you extend the bot beyond slash commands

7. **Install the app** to your test server and launch the Activity from a **voice channel** (Activities menu) or run `/checkers` if the bot is online.

## Deploy

### Activity → Vercel

Deploy the `activity/` package as a static Vite site.

- **Project:** `discord-checkers-bot-activity` (not the repo-root `discord-checkers-bot` project unless you intentionally use that URL)
- **Root directory:** `activity`
- **Build command:** `bun run build` (runs `sync-vercel-api-rewrite.ts` then Vite; requires `VITE_API_HOST` on Vercel)
- **Output directory:** `dist`
- **Install command:** `cd .. && bun install` (monorepo workspace)
- **API proxy:** `activity/vercel.json` rewrites `/api/*` to your Heroku server — set the `destination` host to match `VITE_API_HOST` (no `https://` prefix in the env var). Do **not** add `middleware.ts` or `activity/api/` on this project (breaks Bun workspace deploy with `npm install` error)
- **Environment variables:**
  - `VITE_DISCORD_CLIENT_ID` — Discord application client ID
  - `VITE_API_HOST` — public host of the game server **without** `https://` (e.g. `discord-checkers-server.herokuapp.com`)

Set the **Activity URL** in the Developer Portal to your Vercel production URL.

In **Developer Portal → your app → Activities → URL Mappings**, add:

| Prefix | Target                                                   |
| ------ | -------------------------------------------------------- |
| `/api` | `discord-checkers-server-2dbcedabcdf8.herokuapp.com`     |

Also add **OAuth2 redirect**: `https://127.0.0.1` (required for Discord Activity token exchange).

On **Vercel**, set:

```env
VITE_DISCORD_CLIENT_ID=848160407424073768
VITE_API_HOST=discord-checkers-server-2dbcedabcdf8.herokuapp.com
```

**GitHub Actions auto-deploy** (`.github/workflows/deploy-vercel.yml`) runs after CI on push to `main`. Add repository secrets:

| Secret | Description |
| ------ | ----------- |
| `VERCEL_TOKEN` | Vercel account token |
| `VERCEL_ORG_ID` | Team / user ID from Vercel project settings |
| `VERCEL_PROJECT_ID` | Activity project ID (`activity/` root directory) |

### Server → Heroku (recommended for you)

Deploy `server/` as a **Docker** web dyno (Bun + WebSocket).

1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) and log in:

   ```bash
   heroku login
   ```

2. Create the app (from repo root):

   ```bash
   heroku create discord-checkers-server
   heroku stack:set container -a discord-checkers-server
   ```

3. Set secrets:

   ```bash
   heroku config:set DISCORD_CLIENT_ID=your_client_id -a discord-checkers-server
   heroku config:set DISCORD_CLIENT_SECRET=your_client_secret -a discord-checkers-server
   heroku config:set DISCORD_TOKEN=your_bot_token -a discord-checkers-server
   heroku config:set SERVER_PUBLIC_HOST=discord-checkers-server.herokuapp.com -a discord-checkers-server
   ```

   `DISCORD_TOKEN` is required for WebSocket auth (Activity Instance API membership checks), not only for the optional slash-command bot.

4. Deploy (uses root `heroku.yml` → `server/Dockerfile`):

   ```bash
   git push heroku main
   ```

5. Verify:

   ```bash
   curl https://discord-checkers-server.herokuapp.com/api/health
   ```

   Expected: `{"ok":true}`

6. On **Vercel**, set:

   ```env
   VITE_API_HOST=discord-checkers-server.herokuapp.com
   ```

   Redeploy activity. Heroku sets `PORT` automatically — do not hardcode it.

**Notes:**

- WebSocket works on standard Heroku web dynos (`/api/ws`).
- Game rooms are in-memory; dyno restart clears active games.
- Free/Eco dyno sleeps when idle — first request may be slow.

### Server → Fly.io / Railway

Deploy `server/` as a long-running Bun process with **WebSocket** support.

- Use `server/Dockerfile` and `server/fly.toml` as a starting point for Fly.io.
- Set environment variables:
  - `DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_SECRET`
  - `SERVER_PORT=3001`
  - `SERVER_PUBLIC_HOST` — public hostname (optional, for logging/docs)

Ensure the platform exposes HTTPS/WSS on 443 and forwards to internal port 3001. The activity client patches `/api` and WebSocket URLs to `VITE_API_HOST`.

After deploy, update `VITE_API_HOST` on Vercel to match the server’s public host and redeploy the activity if needed.

### Bot (optional)

Run `bot/` on any Node/Bun host with `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and optionally `DISCORD_GUILD_ID`. Register commands with:

```bash
bun run --cwd bot register-commands
```

## How to play

1. Join a **voice channel** in a server where the app is installed.
2. Launch the Activity:
   - Click **Activities** (rocket icon) → select your app, **or**
   - Type `/checkers` if the optional bot is running.
3. Wait for a second player in the lobby; sides are assigned (Beagle vs Corgi).
4. Play international 10×10 checkers on the 3D board — moves sync over WebSocket in real time.

Outside Discord, the activity still runs in the browser with the original solo vs bot modes (see `activity/README.md`).

## Production deploy checklist

Before launching the Discord Activity in production:

1. **Heroku server**
   - [ ] `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_TOKEN`, `SERVER_PUBLIC_HOST` set
   - [ ] `curl https://<SERVER_PUBLIC_HOST>/api/health` returns `{"ok":true}`
   - [ ] Container stack enabled (`heroku stack:set container`)

2. **Vercel activity**
   - [ ] `VITE_DISCORD_CLIENT_ID` and `VITE_API_HOST` match Heroku host (no `https://`)
   - [ ] `activity/vercel.json` rewrite destination matches `VITE_API_HOST`
   - [ ] GitHub secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` configured (for CI deploy)

3. **Discord Developer Portal**
   - [ ] Activity URL points to Vercel production URL
   - [ ] URL Mapping `/api` → server host
   - [ ] OAuth2 redirect `https://127.0.0.1` added

4. **Smoke test**
   - [ ] Two accounts join voice channel → Activity loads
   - [ ] OAuth completes (`/api/token` via Vercel proxy)
   - [ ] WebSocket auth succeeds (not `instanceId=local` in production)
   - [ ] Move syncs with animation; rematch works after game over

## License

See upstream [CorgiBigleCheckers](https://github.com/kotru21/CorgiBigleCheckers) for game assets and original licensing.
