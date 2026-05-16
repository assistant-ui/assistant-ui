import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type RedisClientType } from "redis";
import IoRedis from "ioredis";
import { createRedisResumableStreamStore } from "./redis";
import { createIoredisResumableStreamStore } from "./ioredis";
import type { ResumableStreamStore } from "../types";

// Redis adapter tests are skipped unless a reachable Redis is signaled via
// REDIS_URL or REDIS_TESTS=1. CI without a redis service is the default.
const REDIS_URL = process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379";
const REDIS_TESTS_DISABLED =
  process.env["REDIS_URL"] === undefined && process.env["REDIS_TESTS"] !== "1";

const enc = new TextEncoder();
const dec = new TextDecoder();
const bytes = (s: string): Uint8Array => enc.encode(s);
const text = (b: Uint8Array): string => dec.decode(b);

const KEY_PREFIX_BASE = `aui:resumable:test:${Date.now()}`;
let suiteCounter = 0;

type Adapter = {
  name: string;
  setup: () => Promise<{
    store: ResumableStreamStore;
    keyPrefix: string;
    makeStore: (
      overrides?: Partial<{
        maxChunkBytes: number;
      }>,
    ) => ResumableStreamStore;
    cleanup: () => Promise<void>;
  }>;
};

const adapters: Adapter[] = [
  {
    name: "node-redis",
    setup: async () => {
      const client: RedisClientType = createClient({ url: REDIS_URL });
      client.on("error", () => {});
      await client.connect();
      const keyPrefix = `${KEY_PREFIX_BASE}:nr:${suiteCounter++}`;
      const makeStore = (overrides?: { maxChunkBytes?: number }) =>
        createRedisResumableStreamStore(client, {
          keyPrefix,
          pollIntervalMs: 25,
          ...overrides,
        });
      return {
        store: makeStore(),
        keyPrefix,
        makeStore,
        cleanup: async () => {
          const keys = await client.keys(`${keyPrefix}:*`);
          if (keys.length > 0) await client.del(keys);
          await client.quit();
        },
      };
    },
  },
  {
    name: "ioredis",
    setup: async () => {
      const client = new IoRedis(REDIS_URL, { lazyConnect: true });
      await client.connect();
      const keyPrefix = `${KEY_PREFIX_BASE}:io:${suiteCounter++}`;
      const makeStore = (overrides?: { maxChunkBytes?: number }) =>
        createIoredisResumableStreamStore(client, {
          keyPrefix,
          pollIntervalMs: 25,
          ...overrides,
        });
      return {
        store: makeStore(),
        keyPrefix,
        makeStore,
        cleanup: async () => {
          const keys = await client.keys(`${keyPrefix}:*`);
          if (keys.length > 0) await client.del(...keys);
          await client.quit();
        },
      };
    },
  },
];

for (const adapter of adapters) {
  describe.skipIf(REDIS_TESTS_DISABLED)(
    `Redis adapter: ${adapter.name}`,
    () => {
      let store: ResumableStreamStore;
      let makeStore: (overrides?: {
        maxChunkBytes?: number;
      }) => ResumableStreamStore;
      let cleanup: () => Promise<void>;

      beforeAll(async () => {
        const ctx = await adapter.setup();
        store = ctx.store;
        makeStore = ctx.makeStore;
        cleanup = ctx.cleanup;
      });

      afterAll(async () => {
        await cleanup();
      });

      it("elects exactly one producer per id", async () => {
        const id = `id-${Math.random()}`;
        const first = await store.acquire(id);
        const second = await store.acquire(id);
        expect(first).toBe("producer");
        expect(second).toBe("consumer");
      });

      it("replays buffered chunks and tails until done", async () => {
        const id = `id-${Math.random()}`;
        await store.acquire(id);
        await store.append(id, bytes("hello"));
        await store.append(id, bytes(" world"));

        const ac = new AbortController();
        const collected: string[] = [];
        const reading = (async () => {
          for await (const entry of store.read(id, "", ac.signal)) {
            collected.push(text(entry.chunk));
            if (collected.length === 3) {
              await store.finalize(id, "done");
            }
          }
        })();

        await new Promise((r) => setTimeout(r, 50));
        await store.append(id, bytes("!"));
        await reading;
        expect(collected.join("")).toBe("hello world!");
      });

      it("status: missing → streaming → done", async () => {
        const id = `id-${Math.random()}`;
        expect(await store.status(id)).toBe("missing");
        await store.acquire(id);
        expect(await store.status(id)).toBe("streaming");
        await store.finalize(id, "done");
        expect(await store.status(id)).toBe("done");
      });

      it("status: error finalize", async () => {
        const id = `id-${Math.random()}`;
        await store.acquire(id);
        await store.finalize(id, "error", "boom");
        expect(await store.status(id)).toBe("error");
      });

      it("read throws on error finalize after draining buffered entries", async () => {
        const id = `id-${Math.random()}`;
        await store.acquire(id);
        await store.append(id, bytes("partial"));
        await store.finalize(id, "error", "boom");

        const ac = new AbortController();
        const seen: string[] = [];
        await expect(async () => {
          for await (const entry of store.read(id, "", ac.signal)) {
            seen.push(text(entry.chunk));
          }
        }).rejects.toThrow("boom");
        expect(seen).toEqual(["partial"]);
      });

      it("late consumer replays after done", async () => {
        const id = `id-${Math.random()}`;
        await store.acquire(id);
        await store.append(id, bytes("a"));
        await store.append(id, bytes("b"));
        await store.append(id, bytes("c"));
        await store.finalize(id, "done");

        const ac = new AbortController();
        const out: string[] = [];
        for await (const entry of store.read(id, "", ac.signal)) {
          out.push(text(entry.chunk));
        }
        expect(out).toEqual(["a", "b", "c"]);
      });

      it("cursor advances and skips already-seen entries", async () => {
        const id = `id-${Math.random()}`;
        await store.acquire(id);
        await store.append(id, bytes("1"));
        await store.append(id, bytes("2"));
        await store.append(id, bytes("3"));
        await store.finalize(id, "done");

        const ac = new AbortController();
        const seen: { cursor: string; text: string }[] = [];
        for await (const entry of store.read(id, "", ac.signal)) {
          seen.push({ cursor: entry.cursor, text: text(entry.chunk) });
        }
        expect(seen.map((s) => s.text)).toEqual(["1", "2", "3"]);

        const out: string[] = [];
        for await (const entry of store.read(id, seen[0]!.cursor, ac.signal)) {
          out.push(text(entry.chunk));
        }
        expect(out).toEqual(["2", "3"]);
      });

      it("delete removes a stream", async () => {
        const id = `id-${Math.random()}`;
        await store.acquire(id);
        await store.append(id, bytes("x"));
        expect(await store.status(id)).toBe("streaming");
        await store.delete(id);
        expect(await store.status(id)).toBe("missing");
      });

      it("preserves arbitrary binary bytes through pipelined append", async () => {
        const id = `id-${Math.random()}`;
        await store.acquire(id);

        const producer = new Uint8Array(512);
        for (let i = 0; i < producer.length; i++) producer[i] = i & 0xff;
        const half = producer.length / 2;
        await store.append(id, producer.slice(0, half));
        await store.append(id, producer.slice(half));
        await store.finalize(id, "done");

        const ac = new AbortController();
        const replayed: Uint8Array[] = [];
        for await (const entry of store.read(id, "", ac.signal)) {
          replayed.push(entry.chunk);
        }
        const total = replayed.reduce((n, c) => n + c.byteLength, 0);
        const flat = new Uint8Array(total);
        let offset = 0;
        for (const c of replayed) {
          flat.set(c, offset);
          offset += c.byteLength;
        }
        expect(flat.byteLength).toBe(producer.byteLength);
        expect(Array.from(flat)).toEqual(Array.from(producer));
      });

      it("rejects appends larger than maxChunkBytes", async () => {
        const limited = makeStore({ maxChunkBytes: 4 });
        const id = `id-${Math.random()}`;
        await limited.acquire(id);
        await expect(limited.append(id, bytes("12345"))).rejects.toThrow(
          /maxChunkBytes/,
        );
        await limited.append(id, bytes("ok"));
        await limited.finalize(id, "done");

        const ac = new AbortController();
        const out: string[] = [];
        for await (const entry of limited.read(id, "", ac.signal)) {
          out.push(text(entry.chunk));
        }
        expect(out).toEqual(["ok"]);
      });
    },
  );
}
