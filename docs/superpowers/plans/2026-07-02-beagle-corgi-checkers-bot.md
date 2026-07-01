# Beagle vs Corgi Checkers — Discord Activity (3D Only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the existing 3D game [CorgiBigleCheckers](https://github.com/kotru21/CorgiBigleCheckers) into a Discord Activity where two real players (Beagle vs Corgi) play international checkers 10×10 inside Discord via iframe + Embedded App SDK. No 2D bot UI.

**Architecture:** Monorepo with three packages: `activity/` (Vite + React + R3F — copied from CorgiBigleCheckers), `server/` (Bun + Hono: OAuth token exchange + authoritative WebSocket rooms per activity instance), `bot/` (optional thin discord.js launcher on Bun). Reuse all existing game logic (`src/services/move/`, `BoardService`, 3D scene, GLB models). Replace `useBotAI` with server-synced PvP: first connected Discord user = Beagle, second = Corgi. Discord SDK handles auth; `patchUrlMappings` proxies `/api` and WebSocket through Discord's activity proxy.

**Tech Stack:** Bun 1.x (server + bot), TypeScript, Vite 8, React 19, Three.js + R3F, Zustand, Vitest, ESLint 9 + Prettier (from CorgiBigleCheckers), `@discord/embedded-app-sdk`, discord.js 14 (launcher only), Hono (OAuth/WS API).

**Source project:** https://github.com/kotru21/CorgiBigleCheckers (already deployed at corgi-bigle-checkers.vercel.app)

---

## Why Not 2D?

Discord bot messages cannot render WebGL/Three.js. The existing project already has a production-quality 3D board, GLB models (`beagle.glb`, `corgi.glb`, `crown.glb`), move engine, and 4 game modes. The only missing piece for Discord is **Embedded App SDK + multiplayer sync + OAuth backend**.

---

## Target Monorepo Layout

```
discordCheckersBot/
├── package.json                 # Bun workspaces root
├── bunfig.toml
├── .env.example
├── eslint.config.ts             # shared lint (adapted from CorgiBigleCheckers)
├── .prettierrc
├── activity/                    # ← port of CorgiBigleCheckers + Discord layer
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/models/           # GLB assets (from source repo)
│   └── src/
│       ├── main.tsx             # bootstrap Discord SDK before React
│       ├── discord/
│       │   ├── bootstrap.ts     # ready(), authorize(), authenticate()
│       │   ├── useDiscordSession.ts
│       │   └── ActivityLobby.tsx
│       ├── multiplayer/
│       │   ├── gameSocket.ts    # WebSocket client
│       │   └── useMultiplayerSync.ts  # replaces useBotAI in PvP
│       ├── components/          # unchanged from source
│       ├── services/            # unchanged move/AI logic (AI disabled in PvP)
│       └── store/gameStore.ts   # extended with myPlayer, playMode
├── server/
│   ├── package.json
│   └── src/
│       ├── index.ts             # Hono app + WS upgrade
│       ├── routes/token.ts      # POST /api/token (OAuth code exchange)
│       └── rooms/checkersRoom.ts # authoritative game state per instanceId
└── bot/                         # optional launcher
    ├── package.json
    └── src/
        ├── index.ts
        └── registerCommands.ts  # /checkers launch
```

---

## Discord Developer Portal Setup

Use **one** Discord Application for Activity + optional bot:

1. Create app at https://discord.com/developers/applications
2. **OAuth2 → General:** copy Client ID → `DISCORD_CLIENT_ID`
3. **OAuth2:** add redirect `https://127.0.0.1` (local) and production URL
4. **Bot tab:** create bot → `DISCORD_TOKEN` (for optional launcher)
5. **Activities → Settings:**
   - Enable Activities
   - Set **Activity URL** to production Vercel URL (e.g. `https://your-app.vercel.app`)
   - Enable **Interactive Activities**
6. **OAuth2 scopes:** `identify`, `guilds`, `applications.commands` (bot), `rpc.activities.write`
7. Copy Client Secret → `DISCORD_CLIENT_SECRET` (server only, never in frontend)

Reference: [Discord Activities overview](https://docs.discord.com/developers/activities/overview), [Embedded App SDK](https://docs.discord.com/developers/developer-tools/embedded-app-sdk)

---

### Task 1: Monorepo Bootstrap + Import CorgiBigleCheckers

**Files:**
- Create: root `package.json`, `bunfig.toml`, `.env.example`, `.gitignore`
- Import: entire `activity/` tree from CorgiBigleCheckers

- [ ] **Step 1: Import source game via git subtree**

Run from `D:/Programs/discordCheckersBot`:
```bash
git remote add corgi-game https://github.com/kotru21/CorgiBigleCheckers.git
git fetch corgi-game
git subtree add --prefix=activity corgi-game main --squash
```

Expected: `activity/src/`, `activity/public/models/`, `activity/package.json` exist.

- [ ] **Step 2: Create root workspace `package.json`**

```json
{
  "name": "discord-checkers-bot",
  "private": true,
  "workspaces": ["activity", "server", "bot"],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "dev:activity": "bun run --cwd activity dev",
    "dev:server": "bun run --cwd server dev",
    "dev:bot": "bun run --cwd bot dev",
    "build": "bun run --cwd activity build",
    "test": "bun run --cwd activity test",
    "lint": "eslint . --config eslint.config.ts",
    "lint:fix": "eslint . --config eslint.config.ts --fix",
    "format": "prettier --write \"**/*.{ts,tsx}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx}\"",
    "typecheck": "bun run --cwd activity typecheck && bun run --cwd server typecheck",
    "check": "bun run lint && bun run typecheck && bun run test"
  }
}
```

- [ ] **Step 3: Write `.env.example`**

```env
# Discord Application
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_TOKEN=
DISCORD_GUILD_ID=

# Server
SERVER_PORT=3001
SERVER_PUBLIC_HOST=localhost:3001

# Activity (Vite)
VITE_DISCORD_CLIENT_ID=
VITE_API_HOST=localhost:3001
```

- [ ] **Step 4: Verify imported game still runs**

Run:
```bash
cd activity && bun install && bun run dev
```
Expected: 3D board opens at http://localhost:5173, solo vs bot works.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: import CorgiBigleCheckers as activity workspace"
```

---

### Task 2: ESLint + Prettier (from existing project)

**Files:**
- Create: root `eslint.config.ts`, `.prettierrc`, `.prettierignore`
- Modify: root `package.json` devDependencies

- [ ] **Step 1: Copy lint configs from CorgiBigleCheckers**

Copy `activity/eslint.config.ts` → root `eslint.config.ts` and extend ignores:

```typescript
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: ["dist", "node_modules", "**/dist", "activity/dist"] },

  reactHooks.configs.flat.recommended,

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
    },
    plugins: { "react-refresh": reactRefresh },
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
    },
  },
]);
```

- [ ] **Step 2: Install lint devDependencies at root**

Run:
```bash
bun add -d eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals prettier typescript jiti
```

- [ ] **Step 3: Run linter**

Run: `bun run lint`
Expected: PASS (warnings OK, 0 errors)

- [ ] **Step 4: Commit**

```bash
git add eslint.config.ts .prettierrc .prettierignore package.json bun.lock
git commit -m "chore: configure eslint and prettier for monorepo"
```

---

### Task 3: Bun OAuth Server (`POST /api/token`)

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`, `server/src/routes/token.ts`

- [ ] **Step 1: Write failing test for token route**

Create `server/src/routes/token.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { exchangeCodeForToken } from "./token";

describe("exchangeCodeForToken", () => {
  test("throws when code is empty", async () => {
    await expect(exchangeCodeForToken("")).rejects.toThrow(/code/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test server/src/routes/token.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement token exchange**

Create `server/package.json`:
```json
{
  "name": "@discord-checkers/server",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

Create `server/src/routes/token.ts`:
```typescript
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";

export async function exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
  if (!code.trim()) throw new Error("Missing OAuth code");

  const clientId = Bun.env.DISCORD_CLIENT_ID;
  const clientSecret = Bun.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Discord OAuth credentials");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
  });

  const response = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord token exchange failed: ${response.status} ${text}`);
  }

  return (await response.json()) as { access_token: string };
}
```

Create `server/src/index.ts`:
```typescript
import { Hono } from "hono";
import { exchangeCodeForToken } from "./routes/token";

const app = new Hono();

app.post("/api/token", async (c) => {
  try {
    const { code } = (await c.req.json()) as { code?: string };
    const token = await exchangeCodeForToken(code ?? "");
    return c.json(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed";
    return c.json({ error: message }, 400);
  }
});

app.get("/api/health", (c) => c.json({ ok: true }));

const port = Number(Bun.env.SERVER_PORT ?? 3001);
Bun.serve({ port, fetch: app.fetch });
console.log(`Server listening on :${port}`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test server/src/routes/token.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat: add bun oauth token exchange server"
```

---

### Task 4: Discord SDK Bootstrap in Activity

**Files:**
- Create: `activity/src/discord/bootstrap.ts`
- Create: `activity/src/discord/useDiscordSession.ts`
- Modify: `activity/src/main.tsx`
- Modify: `activity/package.json`

- [ ] **Step 1: Install Embedded App SDK**

Run:
```bash
cd activity && bun add @discord/embedded-app-sdk
```

- [ ] **Step 2: Write `bootstrap.ts`**

```typescript
import {
  DiscordSDK,
  DiscordSDKMock,
  patchUrlMappings,
} from "@discord/embedded-app-sdk";

const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

function createSdk(): DiscordSDK | DiscordSDKMock {
  const inDiscord = new URLSearchParams(window.location.search).has("frame_id");
  return inDiscord
    ? new DiscordSDK(clientId)
    : new DiscordSDKMock(clientId, null, null, null);
}

export const discordSdk = createSdk();

export interface DiscordSession {
  userId: string;
  username: string;
  accessToken: string;
  instanceId: string;
}

export async function bootstrapDiscordSession(): Promise<DiscordSession> {
  await discordSdk.ready();

  const apiHost = import.meta.env.VITE_API_HOST ?? "localhost:3001";
  patchUrlMappings([{ prefix: "/api", target: apiHost }], {
    patchFetch: true,
    patchWebSocket: true,
    patchXhr: true,
  });

  const { code } = await discordSdk.commands.authorize({
    client_id: clientId,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds", "rpc.activities.write"],
  });

  const { access_token } = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }).then(async (r) => {
    if (!r.ok) throw new Error("Token exchange failed");
    return r.json() as Promise<{ access_token: string }>;
  });

  const auth = await discordSdk.commands.authenticate({ access_token });

  return {
    userId: auth.user.id,
    username: auth.user.username,
    accessToken: access_token,
    instanceId: discordSdk.instanceId,
  };
}
```

- [ ] **Step 3: Write `useDiscordSession.ts`**

```typescript
import { useEffect, useState } from "react";
import { bootstrapDiscordSession, type DiscordSession } from "./bootstrap";

interface SessionState {
  session: DiscordSession | null;
  loading: boolean;
  error: string | null;
}

export function useDiscordSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    bootstrapDiscordSession()
      .then((session) => setState({ session, loading: false, error: null }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Discord bootstrap failed";
        setState({ session: null, loading: false, error: message });
      });
  }, []);

  return state;
}
```

- [ ] **Step 4: Update `main.tsx` to wait for session before rendering game**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ActivityShell } from "./discord/ActivityShell";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ActivityShell>
      <App />
    </ActivityShell>
  </React.StrictMode>,
);
```

Create `activity/src/discord/ActivityShell.tsx`:
```typescript
import type { ReactNode } from "react";
import { useDiscordSession } from "./useDiscordSession";

export function ActivityShell({ children }: { children: ReactNode }) {
  const { session, loading, error } = useDiscordSession();

  if (loading) return <div className="activity-loading">Connecting to Discord…</div>;
  if (error) return <div className="activity-error">{error}</div>;
  if (!session) return <div className="activity-error">No Discord session</div>;

  return <>{children}</>;
}
```

- [ ] **Step 5: Configure Vite dev proxy to Bun server**

Update `activity/vite.config.ts`:
```typescript
import path from "path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "src/app"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@widgets": path.resolve(__dirname, "src/widgets"),
      "@features": path.resolve(__dirname, "src/features"),
      "@entities": path.resolve(__dirname, "src/entities"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
});
```

- [ ] **Step 6: Manual test (local mock mode)**

Run in two terminals:
```bash
bun run dev:server
bun run dev:activity
```
Expected: app loads with DiscordSDKMock (no iframe), no crash.

- [ ] **Step 7: Commit**

```bash
git add activity/src/discord activity/src/main.tsx activity/vite.config.ts activity/package.json
git commit -m "feat: integrate discord embedded app sdk bootstrap"
```

---

### Task 5: Multiplayer Store — Replace Bot with PvP

**Files:**
- Modify: `activity/src/store/gameStore.ts`
- Modify: `activity/src/shared/types/game.types.ts`
- Create: `activity/src/discord/ActivityLobby.tsx`
- Modify: `activity/src/App.tsx`
- Modify: `activity/src/hooks/useGameBoardController.ts` (disable input when not your turn)

- [ ] **Step 1: Write failing test for side assignment**

Create `activity/src/discord/assignSides.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import { assignPlayerSide } from "./assignSides";

describe("assignPlayerSide", () => {
  test("first user is beagle, second is corgi", () => {
    expect(assignPlayerSide(["u1"], "u1")).toBe("beagle");
    expect(assignPlayerSide(["u1", "u2"], "u2")).toBe("corgi");
  });

  test("third+ users are spectators", () => {
    expect(assignPlayerSide(["u1", "u2", "u3"], "u3")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd activity && bun run test src/discord/assignSides.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement side assignment + extend store**

Create `activity/src/discord/assignSides.ts`:
```typescript
import type { Player } from "@shared/types/game.types";

export function assignPlayerSide(participantIds: string[], userId: string): Player | null {
  if (participantIds[0] === userId) return "beagle";
  if (participantIds[1] === userId) return "corgi";
  return null;
}
```

Extend `activity/src/store/gameStore.ts` — add fields:
```typescript
export type PlayMode = "solo_bot" | "discord_pvp";

// add to GameStore interface:
playMode: PlayMode;
myPlayer: Player | null;
activePlayer: Player;
participants: string[];

setPlayMode: (mode: PlayMode) => void;
setMyPlayer: (player: Player | null) => void;
setActivePlayer: (player: Player) => void;
setParticipants: (ids: string[]) => void;
```

Replace `playerTurn: boolean` usage:
- `playerTurn === true` → `activePlayer === "beagle"`
- `playerTurn === false` → `activePlayer === "corgi"`

Add helper in `activity/src/utils/gameHelpers.ts`:
```typescript
export function isMyTurn(activePlayer: Player, myPlayer: Player | null): boolean {
  return myPlayer !== null && activePlayer === myPlayer;
}
```

- [ ] **Step 4: Create lobby UI**

Create `activity/src/discord/ActivityLobby.tsx`:
```typescript
import { useEffect } from "react";
import { discordSdk } from "./bootstrap";
import { assignPlayerSide } from "./assignSides";
import { useGameStore } from "../store/gameStore";

interface ActivityLobbyProps {
  userId: string;
  onStart: () => void;
}

export function ActivityLobby({ userId, onStart }: ActivityLobbyProps) {
  const setParticipants = useGameStore((s) => s.setParticipants);
  const setMyPlayer = useGameStore((s) => s.setMyPlayer);
  const setPlayMode = useGameStore((s) => s.setPlayMode);
  const participants = useGameStore((s) => s.participants);

  useEffect(() => {
    const syncParticipants = async () => {
      const { participants: connected } =
        await discordSdk.commands.getActivityInstanceConnectedParticipants();
      const ids = connected.map((p) => p.id);
      setParticipants(ids);
      setMyPlayer(assignPlayerSide(ids, userId));
      if (ids.length >= 2) {
        setPlayMode("discord_pvp");
        onStart();
      }
    };

    void syncParticipants();
    const unsubscribe = discordSdk.subscribe(
      "ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE",
      ({ participants: connected }) => {
        const ids = connected.map((p) => p.id);
        setParticipants(ids);
        setMyPlayer(assignPlayerSide(ids, userId));
        if (ids.length >= 2) {
          setPlayMode("discord_pvp");
          onStart();
        }
      },
    );

    return () => {
      void unsubscribe;
    };
  }, [userId, onStart, setParticipants, setMyPlayer, setPlayMode]);

  return (
    <div className="activity-lobby">
      <h1>Beagle vs Corgi</h1>
      <p>Waiting for opponent… ({participants.length}/2)</p>
      <p>You will be {assignPlayerSide(participants, userId) ?? "spectator"}</p>
    </div>
  );
}
```

- [ ] **Step 5: Update `App.tsx` for Discord PvP flow**

```typescript
import React, { useState } from "react";
import { GameProvider } from "./contexts/GameContext";
import { GameBoard } from "./components/GameBoard";
import { MainMenu } from "./components/MainMenu";
import { ActivityLobby } from "./discord/ActivityLobby";
import { useDiscordSession } from "./discord/useDiscordSession";

const inDiscord = new URLSearchParams(window.location.search).has("frame_id");

const App = () => {
  const { session } = useDiscordSession();
  const [gameStarted, setGameStarted] = useState(!inDiscord);

  if (inDiscord && session && !gameStarted) {
    return <ActivityLobby userId={session.userId} onStart={() => setGameStarted(true)} />;
  }

  return (
    <GameProvider>
      {gameStarted ? (
        <GameBoard onReturnToMenu={() => setGameStarted(false)} />
      ) : (
        <MainMenu onStart={() => setGameStarted(true)} />
      )}
    </GameProvider>
  );
};

export default App;
```

- [ ] **Step 6: Disable bot AI in PvP mode**

In `activity/src/hooks/useBotAI.ts`, add at top of effect:
```typescript
const playMode = useGameStore.getState().playMode;
if (playMode === "discord_pvp") return;
```

In `activity/src/hooks/useGameBoardController.ts`, gate clicks:
```typescript
const { myPlayer, activePlayer, playMode } = useGameStore(/* selectors */);
if (playMode === "discord_pvp" && !isMyTurn(activePlayer, myPlayer)) return;
```

- [ ] **Step 7: Run tests**

Run: `cd activity && bun run test`
Expected: all tests PASS including new assignSides test

- [ ] **Step 8: Commit**

```bash
git add activity/src/discord activity/src/store activity/src/App.tsx activity/src/hooks
git commit -m "feat: add discord pvp lobby and disable bot in multiplayer"
```

---

### Task 6: Authoritative WebSocket Game Sync (Bun Server)

**Files:**
- Create: `server/src/rooms/checkersRoom.ts`
- Create: `server/src/rooms/checkersRoom.test.ts`
- Modify: `server/src/index.ts` (WebSocket upgrade)
- Create: `activity/src/multiplayer/gameSocket.ts`
- Create: `activity/src/multiplayer/useMultiplayerSync.ts`

- [ ] **Step 1: Write failing room test**

Create `server/src/rooms/checkersRoom.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import { CheckersRoom } from "./checkersRoom";

describe("CheckersRoom", () => {
  test("assigns beagle to first joiner and rejects move from wrong player", () => {
    const room = new CheckersRoom("room-1");
    room.join("user-a");
    room.join("user-b");

    expect(room.getState().players.beagle).toBe("user-a");
    expect(room.getState().players.corgi).toBe("user-b");

    expect(() =>
      room.submitMove("user-b", {
        fromRow: 6,
        fromCol: 1,
        toRow: 5,
        toCol: 0,
      }),
    ).toThrow(/not your turn/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test server/src/rooms/checkersRoom.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement server room using existing move validation**

Create `server/src/rooms/checkersRoom.ts` — import move logic from activity (via shared path alias or duplicate thin wrapper calling same functions):

```typescript
import { createInitialBoard } from "../../../activity/src/services/BoardService";
import { getValidMoves } from "../../../activity/src/services/move/validMoves";
import { executeMove } from "../../../activity/src/services/move/executeMove";
import type { Board, Player } from "../../../activity/src/shared/types/game.types";

export interface RoomState {
  roomId: string;
  board: Board;
  activePlayer: Player;
  players: { beagle: string | null; corgi: string | null };
  gameOver: boolean;
}

export class CheckersRoom {
  private state: RoomState;

  constructor(roomId: string) {
    this.state = {
      roomId,
      board: createInitialBoard() as Board,
      activePlayer: "beagle",
      players: { beagle: null, corgi: null },
      gameOver: false,
    };
  }

  join(userId: string): RoomState {
    if (!this.state.players.beagle) this.state.players.beagle = userId;
    else if (!this.state.players.corgi && this.state.players.beagle !== userId) {
      this.state.players.corgi = userId;
    }
    return this.getState();
  }

  getState(): RoomState {
    return structuredClone(this.state);
  }

  submitMove(
    userId: string,
    move: { fromRow: number; fromCol: number; toRow: number; toCol: number },
  ): RoomState {
    if (this.state.gameOver) throw new Error("Game over");

    const expectedUser =
      this.state.activePlayer === "beagle"
        ? this.state.players.beagle
        : this.state.players.corgi;
    if (userId !== expectedUser) throw new Error("Not your turn");

    const valid = getValidMoves(this.state.board, this.state.activePlayer, "classic");
    const allowed = valid.find(
      (m) =>
        m.row === move.toRow &&
        m.col === move.toCol,
    );
    if (!allowed) throw new Error("Illegal move");

    this.state.board = executeMove(this.state.board, move.fromRow, move.fromCol, allowed);
    this.state.activePlayer = this.state.activePlayer === "beagle" ? "corgi" : "beagle";
    return this.getState();
  }
}
```

Add WebSocket to `server/src/index.ts`:
```typescript
const rooms = new Map<string, CheckersRoom>();

function getRoom(instanceId: string): CheckersRoom {
  const existing = rooms.get(instanceId);
  if (existing) return existing;
  const room = new CheckersRoom(instanceId);
  rooms.set(instanceId, room);
  return room;
}

Bun.serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/api/ws") {
      const upgraded = server.upgrade(req, { data: { instanceId: url.searchParams.get("instanceId") ?? "local" } });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return app.fetch(req, server);
  },
  websocket: {
    open(ws) {
      const room = getRoom(ws.data.instanceId);
      ws.subscribe(ws.data.instanceId);
      ws.send(JSON.stringify({ type: "state", payload: room.getState() }));
    },
    message(ws, message) {
      const room = getRoom(ws.data.instanceId);
      const data = JSON.parse(String(message)) as { type: string; userId: string; move?: unknown };
      if (data.type === "join") room.join(data.userId);
      if (data.type === "move") room.submitMove(data.userId, data.move as never);
      ws.publish(ws.data.instanceId, JSON.stringify({ type: "state", payload: room.getState() }));
    },
  },
});
```

- [ ] **Step 4: Create activity WebSocket client**

Create `activity/src/multiplayer/gameSocket.ts`:
```typescript
export type RoomStateMessage = {
  type: "state";
  payload: {
    board: unknown;
    activePlayer: "beagle" | "corgi";
    players: { beagle: string | null; corgi: string | null };
    gameOver: boolean;
  };
};

export function connectGameSocket(instanceId: string, onState: (msg: RoomStateMessage) => void): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = import.meta.env.VITE_API_HOST ?? "localhost:3001";
  const socket = new WebSocket(`${protocol}://${host}/api/ws?instanceId=${instanceId}`);

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(String(event.data)) as RoomStateMessage;
    if (data.type === "state") onState(data);
  });

  return socket;
}
```

Create `activity/src/multiplayer/useMultiplayerSync.ts` — on mount connect socket, send `{ type: "join", userId }`, apply incoming `board` + `activePlayer` to Zustand store.

- [ ] **Step 5: Wire controller to emit moves over socket instead of local-only**

In `useGameBoardController.ts`, after local move validation in PvP mode:
```typescript
socket.send(JSON.stringify({ type: "move", userId: session.userId, move: { fromRow, fromCol, toRow, toCol } }));
```
Do **not** mutate board locally — wait for server `state` broadcast.

- [ ] **Step 6: Run tests**

Run: `bun test server/src/rooms/checkersRoom.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/ activity/src/multiplayer
git commit -m "feat: add authoritative websocket sync for pvp checkers"
```

---

### Task 7: Optional Bot Launcher (Bun + discord.js)

**Files:**
- Create: `bot/package.json`, `bot/src/index.ts`, `bot/src/registerCommands.ts`

- [ ] **Step 1: Scaffold bot package**

```bash
mkdir -p bot/src
cd bot && bun add discord.js
```

- [ ] **Step 2: Register slash command**

```typescript
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("checkers")
    .setDescription("Launch Beagle vs Corgi 3D checkers Activity")
    .toJSON(),
];
```

- [ ] **Step 3: Handle command with launchActivity**

```typescript
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "checkers") return;
  await interaction.launchActivity({ withResponse: true });
});
```

- [ ] **Step 4: Register and test in Discord voice channel**

Run:
```bash
bun run --cwd bot register-commands
bun run --cwd bot dev
```
In Discord: `/checkers` → Activity iframe opens.

- [ ] **Step 5: Commit**

```bash
git add bot/
git commit -m "feat: add optional discord bot to launch 3d activity"
```

---

### Task 8: Production Deploy + Discord Activity URL

**Files:**
- Create: `activity/vercel.json` (or reuse existing Vercel project)
- Create: `server/Dockerfile` (for Fly.io/Railway WebSocket host)

- [ ] **Step 1: Deploy activity frontend to Vercel**

Run:
```bash
cd activity && bun run build
```
Deploy `activity/dist` to Vercel. Set env `VITE_DISCORD_CLIENT_ID`, `VITE_API_HOST=your-server.fly.dev`.

- [ ] **Step 2: Deploy Bun server with public WSS**

Deploy `server/` to Fly.io with `--port 3001`, set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`.

- [ ] **Step 3: Set Activity URL in Discord Developer Portal**

Point Activity URL to production Vercel domain.

- [ ] **Step 4: End-to-end test in Discord**

1. Open voice channel → Launch Activity (or `/checkers`)
2. Two users join → lobby fills → game starts
3. Beagle moves → Corgi sees update → win condition works

Expected: full PvP 3D game inside Discord iframe.

- [ ] **Step 5: Final quality gate**

Run: `bun run check`
Expected: lint + typecheck + vitest all PASS

- [ ] **Step 6: Commit**

```bash
git add activity/vercel.json server/Dockerfile README.md
git commit -m "docs: add deploy config and discord activity setup"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] TypeScript + Bun — server, bot, monorepo root
- [x] 3D only via Discord Activities — no 2D embed bot
- [x] Reuse CorgiBigleCheckers — git subtree import, keep services/Board3D/models
- [x] Beagle vs Corgi PvP — assignSides + disable bot AI
- [x] ESLint + Prettier — Task 2 (from existing project config)
- [x] Context7 Embedded App SDK — bootstrap, patchUrlMappings, participants API

**Key differences from web version:**
- Solo vs bot still works outside Discord (`!inDiscord` → MainMenu)
- Inside Discord: lobby → PvP only (no bot)
- Game rules stay **international 10×10** (not 8×8 Russian) — matches source repo

**Known follow-ups (out of MVP scope):**
- Spectator UI for 3+ participants
- Reconnect handling if player drops
- All 4 game modes in PvP (start with `classic` only)

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-02-beagle-corgi-checkers-bot.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks
2. **Inline Execution** — execute in this session with checkpoints

**Which approach?**
