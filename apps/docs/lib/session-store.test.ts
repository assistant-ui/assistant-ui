import { describe, expect, it } from "vitest";
import type { Redis } from "@upstash/redis";
import type { AccountsSession } from "aui-auth/database";
import { createRedisSessionStore } from "./session-store";

// Only the mapping between a session and its hash is exercised here. The three
// guarded writes are Lua, so their atomicity needs a live Upstash instance.
type Call = { script: string; keys: string[]; args: string[] };

function fakeRedis(hash: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const redis = {
    hset: async (_key: string, value: Record<string, unknown>) => {
      Object.assign(hash, value);
      return 1;
    },
    hgetall: async () => (Object.keys(hash).length > 0 ? hash : null),
    pexpire: async () => 1,
    eval: async (script: string, keys: string[], args: string[]) => {
      calls.push({ script, keys, args });
      return script.includes("HGETALL") ? Object.entries(hash).flat() : 1;
    },
  } as unknown as Redis;
  return { redis, hash, calls };
}

const codec = {
  encrypt: async (value: string) => `enc(${value})`,
  decrypt: async (value: string) => value.replace(/^enc\((.*)\)$/, "$1"),
};

const session: AccountsSession<Record<string, never>> = {
  id: "session-1",
  user: {
    id: "user-1",
    email: "harry@assistant-ui.com",
    name: "Harry Yep",
    image: null,
  },
  tokens: {
    accessToken: "access",
    refreshToken: "refresh",
    idToken: "id",
    accessTokenExpiresAt: 1_800_000,
  },
  data: {},
  createdAt: 1_000,
  lastValidatedAt: 2_000,
  refreshLeaseUntil: null,
};

const stored = () => ({
  user: session.user,
  accessToken: "enc(access)",
  refreshToken: "enc(refresh)",
  idToken: "enc(id)",
  accessTokenExpiresAt: 1_800_000,
  data: {},
  createdAt: 1_000,
  lastValidatedAt: 2_000,
});

describe("createRedisSessionStore", () => {
  it("round-trips a session and encrypts every token", async () => {
    const { redis, hash } = fakeRedis();
    const store = createRedisSessionStore<Record<string, never>>({
      redis,
      codec,
    });

    await store.create(session);

    expect(hash.accessToken).toBe("enc(access)");
    expect(hash.refreshToken).toBe("enc(refresh)");
    expect(hash.idToken).toBe("enc(id)");
    expect(hash.refreshLeaseUntil).toBeUndefined();

    expect(await store.read("session-1")).toEqual(session);
  });

  it("reads back values Upstash has already coerced out of strings", async () => {
    const { redis } = fakeRedis(stored());
    const store = createRedisSessionStore<Record<string, never>>({
      redis,
      codec,
    });

    expect(await store.read("session-1")).toEqual(session);
  });

  it("sends a lease check only when the caller proves it holds one", async () => {
    const { redis, calls } = fakeRedis(stored());
    const store = createRedisSessionStore<Record<string, never>>({
      redis,
      codec,
      ttlMs: 60_000,
    });

    await store.update("session-1", { lastValidatedAt: 3_000 });
    expect(calls[0]!.args.slice(0, 3)).toEqual(["0", "", "60000"]);
    expect(calls[0]!.args.slice(3)).toEqual(["lastValidatedAt", "3000"]);

    await store.update("session-1", { refreshLeaseUntil: null }, 9_000);
    expect(calls[1]!.args.slice(0, 3)).toEqual(["1", "9000", "60000"]);
    // An empty value is the script's signal to drop the field, which is how a
    // finished refresh releases its lease.
    expect(calls[1]!.args.slice(3)).toEqual(["refreshLeaseUntil", ""]);
  });

  it("passes the clock to the claim so an expired lease can be taken", async () => {
    const { redis, calls } = fakeRedis(stored());
    const store = createRedisSessionStore<Record<string, never>>({
      redis,
      codec,
      ttlMs: 60_000,
    });

    await store.claimRefreshLease("session-1", 9_000, 4_000);

    expect(calls[0]!.keys).toEqual(["aui:session:session-1"]);
    expect(calls[0]!.args).toEqual(["9000", "4000", "60000"]);
  });

  it("guards a conditional delete and leaves an unconditional one open", async () => {
    const { redis, calls } = fakeRedis();
    const store = createRedisSessionStore<Record<string, never>>({
      redis,
      codec,
    });

    await store.delete("session-1");
    expect(calls[0]!.args).toEqual(["0", ""]);

    await store.delete("session-1", 9_000);
    expect(calls[1]!.args).toEqual(["1", "9000"]);
  });
});
