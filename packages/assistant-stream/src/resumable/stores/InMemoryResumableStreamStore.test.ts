import { describe, expect, it, vi } from "vitest";
import { createInMemoryResumableStreamStore } from "./InMemoryResumableStreamStore";
import type { ResumableStreamEntry } from "../types";

const bytes = (s: string): Uint8Array => new TextEncoder().encode(s);

const decode = (chunk: Uint8Array): string => new TextDecoder().decode(chunk);

async function drain(
  iter: AsyncIterable<ResumableStreamEntry>,
): Promise<string[]> {
  const out: string[] = [];
  for await (const entry of iter) out.push(decode(entry.chunk));
  return out;
}

describe("InMemoryResumableStreamStore", () => {
  it("elects exactly one producer per stream id", async () => {
    const store = createInMemoryResumableStreamStore();
    const first = await store.acquire("a");
    const second = await store.acquire("a");
    const third = await store.acquire("a");
    expect(first).toBe("producer");
    expect(second).toBe("consumer");
    expect(third).toBe("consumer");
  });

  it("isolates streams by id", async () => {
    const store = createInMemoryResumableStreamStore();
    expect(await store.acquire("a")).toBe("producer");
    expect(await store.acquire("b")).toBe("producer");
  });

  it("replays buffered entries and tails new ones until finalize", async () => {
    const store = createInMemoryResumableStreamStore();
    await store.acquire("a");
    await store.append("a", bytes("hello "));
    await store.append("a", bytes("world"));

    const ac = new AbortController();
    const collected: string[] = [];
    const reading = (async () => {
      for await (const entry of store.read("a", "", ac.signal)) {
        collected.push(decode(entry.chunk));
        if (collected.length === 3) {
          await store.finalize("a", "done");
        }
      }
    })();

    await store.append("a", bytes("!"));
    await reading;
    expect(collected).toEqual(["hello ", "world", "!"]);
  });

  it("status transitions: missing → streaming → done", async () => {
    const store = createInMemoryResumableStreamStore();
    expect(await store.status("a")).toBe("missing");
    await store.acquire("a");
    expect(await store.status("a")).toBe("streaming");
    await store.finalize("a", "done");
    expect(await store.status("a")).toBe("done");
  });

  it("status reports error after error finalize", async () => {
    const store = createInMemoryResumableStreamStore();
    await store.acquire("a");
    await store.finalize("a", "error", "boom");
    expect(await store.status("a")).toBe("error");
  });

  it("read throws on the next iteration after error finalize", async () => {
    const store = createInMemoryResumableStreamStore();
    await store.acquire("a");
    await store.append("a", bytes("partial"));
    await store.finalize("a", "error", "boom");

    const ac = new AbortController();
    const seen: string[] = [];
    await expect(async () => {
      for await (const entry of store.read("a", "", ac.signal)) {
        seen.push(decode(entry.chunk));
      }
    }).rejects.toThrow("boom");
    expect(seen).toEqual(["partial"]);
  });

  it("a consumer joining after done replays everything", async () => {
    const store = createInMemoryResumableStreamStore();
    await store.acquire("a");
    await store.append("a", bytes("a"));
    await store.append("a", bytes("b"));
    await store.append("a", bytes("c"));
    await store.finalize("a", "done");

    const ac = new AbortController();
    expect(await drain(store.read("a", "", ac.signal))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("cursor advances and skips already-seen entries", async () => {
    const store = createInMemoryResumableStreamStore();
    await store.acquire("a");
    await store.append("a", bytes("1"));
    await store.append("a", bytes("2"));
    await store.append("a", bytes("3"));
    await store.finalize("a", "done");

    const ac = new AbortController();
    const seen: { cursor: string; text: string }[] = [];
    for await (const entry of store.read("a", "", ac.signal)) {
      seen.push({ cursor: entry.cursor, text: decode(entry.chunk) });
    }
    expect(seen.map((s) => s.text)).toEqual(["1", "2", "3"]);

    const afterFirst = seen[0]!.cursor;
    expect(await drain(store.read("a", afterFirst, ac.signal))).toEqual([
      "2",
      "3",
    ]);
  });

  it("aborting the read signal terminates without throwing", async () => {
    const store = createInMemoryResumableStreamStore();
    await store.acquire("a");
    const ac = new AbortController();
    const collected: string[] = [];
    const reading = (async () => {
      for await (const entry of store.read("a", "", ac.signal)) {
        collected.push(decode(entry.chunk));
      }
    })();
    await store.append("a", bytes("x"));
    await new Promise((r) => setTimeout(r, 5));
    ac.abort();
    await reading;
    expect(collected).toEqual(["x"]);
  });

  it("multiple consumers can read concurrently", async () => {
    const store = createInMemoryResumableStreamStore();
    await store.acquire("a");
    const ac = new AbortController();
    const a = drain(store.read("a", "", ac.signal));
    const b = drain(store.read("a", "", ac.signal));
    await store.append("a", bytes("x"));
    await store.append("a", bytes("y"));
    await store.finalize("a", "done");
    expect(await a).toEqual(["x", "y"]);
    expect(await b).toEqual(["x", "y"]);
  });

  it("delete prevents further reads and ends in-flight reads", async () => {
    const store = createInMemoryResumableStreamStore();
    await store.acquire("a");
    const ac = new AbortController();
    const reading = drain(store.read("a", "", ac.signal));
    await store.append("a", bytes("x"));
    await new Promise((r) => setTimeout(r, 0));
    await store.delete("a");
    expect(await reading).toEqual(["x"]);
    expect(await store.status("a")).toBe("missing");
  });

  it("expired streams are evicted on next access", async () => {
    let now = 1_000;
    const store = createInMemoryResumableStreamStore({
      defaultTtlMs: 100,
      now: () => now,
    });
    await store.acquire("a");
    await store.append("a", bytes("hi"));
    expect(await store.status("a")).toBe("streaming");
    now += 200;
    expect(await store.status("a")).toBe("missing");
  });

  it("appending refreshes TTL", async () => {
    let now = 1_000;
    const store = createInMemoryResumableStreamStore({
      defaultTtlMs: 100,
      now: () => now,
    });
    await store.acquire("a");
    now += 80;
    await store.append("a", bytes("x"));
    now += 80;
    expect(await store.status("a")).toBe("streaming");
  });

  it("rejects append on finalized stream", async () => {
    const store = createInMemoryResumableStreamStore();
    await store.acquire("a");
    await store.finalize("a", "done");
    await expect(store.append("a", bytes("late"))).rejects.toThrow(
      /already finalized/,
    );
  });

  it("rejects append on missing stream", async () => {
    const store = createInMemoryResumableStreamStore();
    await expect(store.append("a", bytes("x"))).rejects.toThrow(
      /Stream not found/,
    );
  });

  it("finalize is idempotent", async () => {
    const store = createInMemoryResumableStreamStore();
    await store.acquire("a");
    await store.finalize("a", "done");
    await store.finalize("a", "done");
    expect(await store.status("a")).toBe("done");
  });

  it("rejects append when chunk exceeds maxChunkBytes", async () => {
    const store = createInMemoryResumableStreamStore({ maxChunkBytes: 4 });
    await store.acquire("a");
    await expect(store.append("a", bytes("hello"))).rejects.toThrow(
      /Chunk exceeds maxChunkBytes: 5/,
    );
    await store.append("a", bytes("ok"));
    expect(await store.status("a")).toBe("streaming");
  });

  it("rejects append when stream reaches maxEntriesPerStream", async () => {
    const store = createInMemoryResumableStreamStore({
      maxEntriesPerStream: 2,
    });
    await store.acquire("a");
    await store.append("a", bytes("1"));
    await store.append("a", bytes("2"));
    await expect(store.append("a", bytes("3"))).rejects.toThrow(
      /Stream exceeded maxEntriesPerStream: a/,
    );
  });

  it("rejects acquire when active stream count exceeds maxStreams", async () => {
    const store = createInMemoryResumableStreamStore({ maxStreams: 2 });
    await store.acquire("a");
    await store.acquire("b");
    await expect(store.acquire("c")).rejects.toThrow(/maxStreams exceeded/);
    expect(await store.acquire("a")).toBe("consumer");
  });

  it("gc sweeper evicts expired streams without explicit access", async () => {
    vi.useFakeTimers();
    try {
      let now = 1_000;
      const store = createInMemoryResumableStreamStore({
        defaultTtlMs: 100,
        gcIntervalMs: 50,
        now: () => now,
      });
      await store.acquire("a");
      await store.append("a", bytes("hi"));
      now += 200;
      vi.advanceTimersByTime(50);
      expect(await store.status("a")).toBe("missing");
      store.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("dispose clears the gc interval", async () => {
    vi.useFakeTimers();
    try {
      const clearSpy = vi.spyOn(globalThis, "clearInterval");
      const store = createInMemoryResumableStreamStore({ gcIntervalMs: 50 });
      store.dispose();
      expect(clearSpy).toHaveBeenCalledTimes(1);
      clearSpy.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  it("dispose is a no-op when gcIntervalMs is undefined", () => {
    const store = createInMemoryResumableStreamStore();
    expect(() => store.dispose()).not.toThrow();
  });
});
