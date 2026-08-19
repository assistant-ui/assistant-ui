import type { Redis } from "@upstash/redis";

export type SessionOwnerStore = {
  claim: (sessionId: string, userId: string) => Promise<boolean>;
};

function sessionOwnerKey(sessionId: string): string {
  return `xulux:sess:${sessionId}:owner`;
}

export function createMemorySessionOwnerStore(): SessionOwnerStore {
  const owners = new Map<string, string>();

  return {
    async claim(sessionId, userId) {
      const owner = owners.get(sessionId);
      if (owner) return owner === userId;
      owners.set(sessionId, userId);
      return true;
    },
  };
}

function createRedisSessionOwnerStore(redis: Redis): SessionOwnerStore {
  return {
    async claim(sessionId, userId) {
      const key = sessionOwnerKey(sessionId);
      const claimed = await redis.set(key, userId, { nx: true });
      if (claimed) return true;
      return (await redis.get<string>(key)) === userId;
    },
  };
}

let memoryStore: SessionOwnerStore | null = null;
let redisStorePromise: Promise<SessionOwnerStore> | null = null;

async function getSessionOwnerStore(): Promise<SessionOwnerStore> {
  if (process.env.NODE_ENV !== "production") {
    memoryStore ??= createMemorySessionOwnerStore();
    return memoryStore;
  }

  redisStorePromise ??= (async () => {
    const { Redis } = await import("@upstash/redis");
    return createRedisSessionOwnerStore(Redis.fromEnv());
  })();
  return redisStorePromise;
}

export async function requireXuluxSessionOwner(
  request: Request,
  sessionId: string,
  userId: string,
): Promise<Response | null> {
  try {
    const store = await getSessionOwnerStore();
    const allowed = await store.claim(sessionId, userId);
    if (allowed) return null;

    return Response.json(
      { error: "This workspace belongs to another user." },
      { status: 403 },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "xulux_session_owner_unavailable",
        requestId: request.headers.get("x-vercel-id"),
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return Response.json(
      { error: "Workspace authorization is temporarily unavailable." },
      { status: 503 },
    );
  }
}
