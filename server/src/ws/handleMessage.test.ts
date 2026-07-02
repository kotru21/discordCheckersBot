import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { ServerWebSocket } from "bun";
import { RoomRegistry } from "../rooms/roomRegistry";
import { createWebSocketHandlers } from "./handleMessage";
import type { WsData } from "./types";

type WsClient = ServerWebSocket<WsData>;

interface MockWs {
  ws: WsClient;
  sent: ServerMessageParsed[];
  subscribed: string[];
  published: { topic: string; data: string }[];
}

type ServerMessageParsed =
  | { type: "auth_required" }
  | { type: "auth_ok" }
  | { type: "error"; message: string }
  | { type: "state"; payload: { activePlayer: string; players: unknown } };

function parseSent(raw: string): ServerMessageParsed {
  return JSON.parse(raw) as ServerMessageParsed;
}

function createMockWs(instanceId: string): MockWs {
  const sent: ServerMessageParsed[] = [];
  const subscribed: string[] = [];
  const published: { topic: string; data: string }[] = [];

  const ws = {
    data: {
      instanceId,
      userId: null as string | null,
      authenticated: false,
      rateLimitKey: crypto.randomUUID(),
    },
    send(payload: string) {
      sent.push(parseSent(payload));
    },
    subscribe(topic: string) {
      subscribed.push(topic);
    },
    unsubscribe(topic: string) {
      const index = subscribed.indexOf(topic);
      if (index >= 0) {
        subscribed.splice(index, 1);
      }
    },
    publish(topic: string, data: string) {
      published.push({ topic, data });
    },
  } as unknown as WsClient;

  return { ws, sent, subscribed, published };
}

const originalFetch = globalThis.fetch;

function mockDiscordUsers(): void {
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes("/users/@me")) {
      throw new Error(`Unexpected fetch: ${url}`);
    }

    let authHeader = "";
    const headers = init?.headers;
    if (headers instanceof Headers) {
      authHeader = headers.get("Authorization") ?? "";
    } else if (Array.isArray(headers)) {
      authHeader =
        headers.find(([key]) => key.toLowerCase() === "authorization")?.[1] ??
        "";
    } else if (headers && typeof headers === "object") {
      authHeader = String(
        (headers as Record<string, string>).Authorization ?? ""
      );
    }

    const id = authHeader.includes("token-a") ? "user-a" : "user-b";
    return new Response(JSON.stringify({ id, username: id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

describe("createWebSocketHandlers", () => {
  let registry: RoomRegistry;

  beforeEach(() => {
    registry = new RoomRegistry(60_000, 0);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("open sends auth_required", () => {
    const handlers = createWebSocketHandlers(registry);
    const { ws, sent } = createMockWs("local");

    handlers.open(ws);

    expect(sent).toEqual([{ type: "auth_required" }]);
  });

  test("rejects invalid message format", async () => {
    const handlers = createWebSocketHandlers(registry);
    const { ws, sent } = createMockWs("local");

    await handlers.message(ws, "not-json");

    expect(sent.at(-1)).toEqual({
      type: "error",
      message: "Invalid message format",
    });
  });

  test("rejects move before authentication", async () => {
    const handlers = createWebSocketHandlers(registry);
    const { ws, sent } = createMockWs("local");

    await handlers.message(
      ws,
      JSON.stringify({
        type: "move",
        move: { fromRow: 6, fromCol: 1, toRow: 5, toCol: 0 },
      })
    );

    expect(sent.at(-1)).toEqual({
      type: "error",
      message: "Authentication required",
    });
  });

  test("authenticates user and returns room state", async () => {
    mockDiscordUsers();

    const handlers = createWebSocketHandlers(registry);
    const { ws, sent, subscribed } = createMockWs("local");

    await handlers.message(
      ws,
      JSON.stringify({ type: "auth", accessToken: "token-a" })
    );

    expect(ws.data.authenticated).toBe(true);
    expect(ws.data.userId).toBe("user-a");
    expect(subscribed).toEqual(["local"]);
    expect(sent).toContainEqual({ type: "auth_ok" });

    const stateMsg = sent.find((m) => m.type === "state");
    expect(stateMsg?.type).toBe("state");
    if (stateMsg?.type === "state") {
      expect(stateMsg.payload.activePlayer).toBe("beagle");
      expect(stateMsg.payload.players).toEqual({
        beagle: "user-a",
        corgi: null,
      });
    }
  });

  test("runs auth then beagle move round-trip", async () => {
    mockDiscordUsers();

    const handlers = createWebSocketHandlers(registry);
    const beagle = createMockWs("local");
    const corgi = createMockWs("local");

    await handlers.message(
      beagle.ws,
      JSON.stringify({ type: "auth", accessToken: "token-a" })
    );
    await handlers.message(
      corgi.ws,
      JSON.stringify({ type: "auth", accessToken: "token-b" })
    );

    await handlers.message(
      beagle.ws,
      JSON.stringify({
        type: "move",
        move: { fromRow: 6, fromCol: 1, toRow: 5, toCol: 0 },
      })
    );

    expect(beagle.sent.at(-1)?.type).not.toBe("error");
    expect(beagle.published.length).toBeGreaterThan(0);
    const publishedState = JSON.parse(beagle.published.at(-1)?.data ?? "{}") as {
      type: string;
      payload: { activePlayer: string };
    };
    expect(publishedState.type).toBe("state");
    expect(publishedState.payload.activePlayer).toBe("corgi");
  });

  test("close unsubscribes from instance channel", () => {
    const handlers = createWebSocketHandlers(registry);
    const { ws, subscribed } = createMockWs("local");

    ws.subscribe("local");
    expect(subscribed).toContain("local");

    handlers.close(ws);
    expect(subscribed).not.toContain("local");
  });

  test("rematch resets game after game over", async () => {
    mockDiscordUsers();

    const handlers = createWebSocketHandlers(registry);
    const beagle = createMockWs("local");

    await handlers.message(
      beagle.ws,
      JSON.stringify({ type: "auth", accessToken: "token-a" })
    );

    const room = registry.get("local");
    (
      room as unknown as { state: { gameOver: boolean; winner: string } }
    ).state.gameOver = true;
    (
      room as unknown as { state: { gameOver: boolean; winner: string } }
    ).state.winner = "beagle";

    await handlers.message(beagle.ws, JSON.stringify({ type: "rematch" }));

    expect(beagle.published.length).toBeGreaterThan(0);
    const lastPublish = JSON.parse(
      beagle.published.at(-1)?.data ?? "{}"
    ) as {
      type: string;
      payload: { gameOver: boolean; activePlayer: string };
    };
    expect(lastPublish.payload.gameOver).toBe(false);
    expect(lastPublish.payload.activePlayer).toBe("beagle");
  });

  test("close frees player slot and publishes state", async () => {
    mockDiscordUsers();

    const handlers = createWebSocketHandlers(registry);
    const beagle = createMockWs("local");
    const corgi = createMockWs("local");

    await handlers.message(
      beagle.ws,
      JSON.stringify({ type: "auth", accessToken: "token-a" })
    );
    await handlers.message(
      corgi.ws,
      JSON.stringify({ type: "auth", accessToken: "token-b" })
    );

    corgi.published.length = 0;
    handlers.close(corgi.ws);

    expect(corgi.published).toHaveLength(1);
    const payload = JSON.parse(corgi.published[0]?.data ?? "{}") as {
      payload: { players: { beagle: string | null; corgi: string | null } };
    };
    expect(payload.payload.players.corgi).toBeNull();
    expect(payload.payload.players.beagle).toBe("user-a");
  });
});
