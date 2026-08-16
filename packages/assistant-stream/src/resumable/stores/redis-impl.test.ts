import { describe, expect, it } from "vitest";
import {
  RedisResumableStreamStore,
  type PipelineCommand,
  type RedisLikeClient,
} from "./redis-impl";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class FakeRedisClient implements RedisLikeClient {
  readonly strings = new Map<string, string>();
  readonly streams = new Map<
    string,
    Array<{
      id: string;
      fields: Record<string, string | Uint8Array>;
    }>
  >();
  onFirstAcquire: (() => Promise<void>) | undefined;
  private nextStreamId = 0;

  async setNX(key: string, value: string): Promise<boolean> {
    if (this.strings.has(key)) return false;
    this.strings.set(key, value);
    const onFirstAcquire = this.onFirstAcquire;
    this.onFirstAcquire = undefined;
    await onFirstAcquire?.();
    return true;
  }

  async set(key: string, value: string): Promise<void> {
    this.strings.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async expire(): Promise<void> {}

  async exists(key: string): Promise<boolean> {
    return this.strings.has(key) || this.streams.has(key);
  }

  async del(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.strings.delete(key);
      this.streams.delete(key);
    }
  }

  async xAdd(
    key: string,
    fields: Record<string, string | Uint8Array>,
  ): Promise<string> {
    const id = `${++this.nextStreamId}-0`;
    const entries = this.streams.get(key) ?? [];
    entries.push({ id, fields });
    this.streams.set(key, entries);
    return id;
  }

  async xRange(
    key: string,
    start: string,
  ): Promise<
    Array<{
      id: string;
      fields: Record<string, string | Uint8Array>;
    }>
  > {
    const entries = this.streams.get(key) ?? [];
    if (start === "-") return entries;
    const exclusiveId = start.startsWith("(") ? start.slice(1) : start;
    const sequence = (id: string) => Number(id.split("-")[0]);
    return entries.filter(
      (entry) => sequence(entry.id) > sequence(exclusiveId),
    );
  }

  async pipeline(commands: readonly PipelineCommand[]): Promise<void> {
    for (const command of commands) {
      switch (command.type) {
        case "xAdd":
          await this.xAdd(command.key, command.fields);
          break;
        case "set":
          await this.set(command.key, command.value);
          break;
        case "expire":
          break;
      }
    }
  }
}

describe("RedisResumableStreamStore", () => {
  it("does not expose stale data while a stream id is reacquired", async () => {
    const client = new FakeRedisClient();
    const keyPrefix = "test";
    const streamId = "stream";
    const legacyDataKey = `${keyPrefix}:{${streamId}}:data`;
    await client.xAdd(legacyDataKey, { c: encoder.encode("stale") });

    const store = new RedisResumableStreamStore(client, {
      keyPrefix,
      pollIntervalMs: 1,
    });
    let firstChunk: string | undefined;

    client.onFirstAcquire = async () => {
      await expect(store.acquire(streamId)).resolves.toBe("consumer");
      await store.append(streamId, encoder.encode("fresh"));

      const abort = new AbortController();
      const iterator = store
        .read(streamId, "", abort.signal)
        [Symbol.asyncIterator]();
      const result = await iterator.next();
      firstChunk = result.done ? undefined : decoder.decode(result.value.chunk);
      abort.abort();
      await iterator.return?.();
    };

    await expect(store.acquire(streamId)).resolves.toBe("producer");
    expect(firstChunk).toBe("fresh");
  });

  it("continues reading legacy streams without a generation", async () => {
    const client = new FakeRedisClient();
    const keyPrefix = "test";
    const streamId = "legacy";
    client.strings.set(
      `${keyPrefix}:{${streamId}}:meta`,
      JSON.stringify({ status: "streaming", ttlSec: 60 }),
    );

    const store = new RedisResumableStreamStore(client, { keyPrefix });
    await store.append(streamId, encoder.encode("legacy"));
    await store.finalize(streamId, "done");

    const chunks: string[] = [];
    for await (const entry of store.read(
      streamId,
      "",
      new AbortController().signal,
    )) {
      chunks.push(decoder.decode(entry.chunk));
    }

    expect(chunks).toEqual(["legacy"]);
  });

  it("finalizes and replays generation-scoped streams", async () => {
    const client = new FakeRedisClient();
    const store = new RedisResumableStreamStore(client, {
      keyPrefix: "test",
    });
    await store.acquire("current");
    await store.append("current", encoder.encode("current"));
    await store.finalize("current", "done");

    const chunks: string[] = [];
    for await (const entry of store.read(
      "current",
      "",
      new AbortController().signal,
    )) {
      chunks.push(decoder.decode(entry.chunk));
    }

    expect(chunks).toEqual(["current"]);
    await expect(store.status("current")).resolves.toBe("done");
  });

  it("fences a superseded producer out of the reacquired stream", async () => {
    const client = new FakeRedisClient();
    const keyPrefix = "test";
    const streamId = "fenced";
    const metaKey = `${keyPrefix}:{${streamId}}:meta`;
    const staleStore = new RedisResumableStreamStore(client, { keyPrefix });
    await expect(staleStore.acquire(streamId)).resolves.toBe("producer");
    await staleStore.append(streamId, encoder.encode("before"));

    client.strings.delete(metaKey);
    const freshStore = new RedisResumableStreamStore(client, { keyPrefix });
    await expect(freshStore.acquire(streamId)).resolves.toBe("producer");
    await freshStore.append(streamId, encoder.encode("fresh"));

    await expect(
      staleStore.append(streamId, encoder.encode("stale")),
    ).rejects.toThrow(`Stream superseded by a new acquisition: ${streamId}`);
    await expect(
      staleStore.finalize(streamId, "done"),
    ).resolves.toBeUndefined();
    await expect(freshStore.status(streamId)).resolves.toBe("streaming");

    await freshStore.finalize(streamId, "done");
    const chunks: string[] = [];
    for await (const entry of freshStore.read(
      streamId,
      "",
      new AbortController().signal,
    )) {
      chunks.push(decoder.decode(entry.chunk));
    }
    expect(chunks).toEqual(["fresh"]);
  });

  it("stops an existing reader when the stream generation changes", async () => {
    const client = new FakeRedisClient();
    const keyPrefix = "test";
    const streamId = "reused";
    const metaKey = `${keyPrefix}:{${streamId}}:meta`;
    const store = new RedisResumableStreamStore(client, {
      keyPrefix,
      pollIntervalMs: 1,
    });
    await store.acquire(streamId);

    const abort = new AbortController();
    const iterator = store
      .read(streamId, "", abort.signal)
      [Symbol.asyncIterator]();
    const next = iterator.next();
    await new Promise((resolve) => setTimeout(resolve, 2));

    client.strings.delete(metaKey);
    await store.acquire(streamId);

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      next,
      new Promise<"timeout">((resolve) => {
        timeout = setTimeout(() => resolve("timeout"), 100);
      }),
    ]);
    if (timeout !== undefined) clearTimeout(timeout);
    abort.abort();
    await iterator.return?.();

    expect(result).not.toBe("timeout");
    expect(result).toMatchObject({ done: true });
  });
});
