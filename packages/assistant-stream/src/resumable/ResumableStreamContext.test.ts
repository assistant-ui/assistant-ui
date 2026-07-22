import { afterEach, describe, expect, it, vi } from "vitest";
import { createResumableStreamContext } from "./ResumableStreamContext";
import { ResumableStreamError } from "./errors";
import { createInMemoryResumableStreamStore } from "./stores/InMemoryResumableStreamStore";

const enc = new TextEncoder();
const dec = new TextDecoder();

const bytes = (s: string): Uint8Array => enc.encode(s);

afterEach(() => {
  vi.restoreAllMocks();
});

async function collect(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return out;
      out += dec.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

function makeStringStream(parts: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const part of parts) {
        controller.enqueue(bytes(part));
        await Promise.resolve();
      }
      controller.close();
    },
  });
}

describe("createResumableStreamContext", () => {
  it("producer caller receives full byte stream", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const stream = await ctx.run("a", () =>
      makeStringStream(["hello ", "world"]),
    );
    expect(await collect(stream)).toBe("hello world");
  });

  it("second caller becomes consumer and receives identical bytes", async () => {
    const store = createInMemoryResumableStreamStore();
    const ctx = createResumableStreamContext({ store });

    const producerStream = await ctx.run("a", () =>
      makeStringStream(["one ", "two ", "three"]),
    );
    const consumerStream = await ctx.run("a", () =>
      makeStringStream(["should-not-run"]),
    );

    const [a, b] = await Promise.all([
      collect(producerStream),
      collect(consumerStream),
    ]);
    expect(a).toBe("one two three");
    expect(b).toBe("one two three");
  });

  it("late consumer after done replays via resume", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const producer = await ctx.run("a", () =>
      makeStringStream(["alpha", "beta", "gamma"]),
    );
    expect(await collect(producer)).toBe("alphabetagamma");

    const replay = await ctx.resume("a");
    expect(replay).not.toBeNull();
    expect(await collect(replay!)).toBe("alphabetagamma");
  });

  it("resume returns null for missing streams", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    expect(await ctx.resume("nope")).toBeNull();
  });

  it("requireResume throws ResumableStreamError for missing streams", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    await expect(ctx.requireResume("nope")).rejects.toBeInstanceOf(
      ResumableStreamError,
    );
    await expect(ctx.requireResume("nope")).rejects.toMatchObject({
      code: "missing",
    });
  });

  it("requireResume returns the replay stream when it exists", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const producer = await ctx.run("a", () => makeStringStream(["hi"]));
    expect(await collect(producer)).toBe("hi");

    const replay = await ctx.requireResume("a");
    expect(await collect(replay)).toBe("hi");
  });

  it("status tracks lifecycle", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    expect(await ctx.status("a")).toBe("missing");
    const stream = await ctx.run("a", () => makeStringStream(["x"]));
    await collect(stream);
    expect(await ctx.status("a")).toBe("done");
  });

  it("delete removes stream state", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const stream = await ctx.run("a", () => makeStringStream(["x"]));
    await collect(stream);
    expect(await ctx.status("a")).toBe("done");
    await ctx.delete("a");
    expect(await ctx.status("a")).toBe("missing");
  });

  it("producer keeps writing after the local consumer cancels", async () => {
    const store = createInMemoryResumableStreamStore();
    const ctx = createResumableStreamContext({ store });

    let producerEmitted = 0;
    const slowStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (let i = 0; i < 5; i++) {
          await new Promise((r) => setTimeout(r, 5));
          controller.enqueue(bytes(`chunk${i};`));
          producerEmitted += 1;
        }
        controller.close();
      },
    });

    const stream = await ctx.run("a", () => slowStream);
    const reader = stream.getReader();
    const first = await reader.read();
    expect(first.done).toBe(false);
    await reader.cancel();

    while (producerEmitted < 5) {
      await new Promise((r) => setTimeout(r, 5));
    }
    while ((await ctx.status("a")) === "streaming") {
      await new Promise((r) => setTimeout(r, 5));
    }

    const replay = await ctx.resume("a");
    expect(replay).not.toBeNull();
    expect(await collect(replay!)).toBe("chunk0;chunk1;chunk2;chunk3;chunk4;");
  });

  it("propagates producer errors to consumers", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const failing = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes("partial;"));
        controller.error(new Error("oops"));
      },
    });
    const stream = await ctx.run("a", () => failing);
    await expect(collect(stream)).rejects.toThrow("oops");
    expect(await ctx.status("a")).toBe("error");
  });

  it("waitUntil receives the producer task promise", async () => {
    const promises: Promise<unknown>[] = [];
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
      waitUntil: (p) => promises.push(p),
    });
    const stream = await ctx.run("a", () => makeStringStream(["x"]));
    expect(await collect(stream)).toBe("x");
    expect(promises.length).toBe(1);
    await Promise.all(promises);
  });

  it("onAcquire fires for both producer and consumer roles", async () => {
    const calls: Array<{ id: string; role: string }> = [];
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
      onAcquire: (id, role) => calls.push({ id, role }),
    });
    const producer = await ctx.run("a", () => makeStringStream(["x"]));
    const consumer = await ctx.run("a", () => makeStringStream(["unused"]));
    await Promise.all([collect(producer), collect(consumer)]);
    expect(calls).toEqual([
      { id: "a", role: "producer" },
      { id: "a", role: "consumer" },
    ]);
  });

  it("onAppend fires per appended chunk with byteLength", async () => {
    const calls: Array<{ id: string; byteLength: number }> = [];
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
      onAppend: (id, byteLength) => calls.push({ id, byteLength }),
    });
    const stream = await ctx.run("a", () => makeStringStream(["ab", "cde"]));
    expect(await collect(stream)).toBe("abcde");
    expect(calls).toEqual([
      { id: "a", byteLength: 2 },
      { id: "a", byteLength: 3 },
    ]);
  });

  it("onFinalize fires on successful completion", async () => {
    const calls: Array<{
      id: string;
      status: "done" | "error";
      error: string | undefined;
    }> = [];
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
      onFinalize: (id, status, error) => calls.push({ id, status, error }),
    });
    const stream = await ctx.run("a", () => makeStringStream(["x"]));
    await collect(stream);
    expect(calls).toEqual([{ id: "a", status: "done", error: undefined }]);
  });

  it("onFinalize fires with error status when producer fails", async () => {
    const calls: Array<{
      id: string;
      status: "done" | "error";
      error: string | undefined;
    }> = [];
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
      onFinalize: (id, status, error) => calls.push({ id, status, error }),
    });
    const failing = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("boom"));
      },
    });
    const stream = await ctx.run("a", () => failing);
    await expect(collect(stream)).rejects.toThrow("boom");
    expect(calls).toEqual([{ id: "a", status: "error", error: "boom" }]);
  });

  it("onError fires when the producer task throws", async () => {
    const errors: Array<{ id: string; error: unknown }> = [];
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
      onError: (id, error) => errors.push({ id, error }),
    });
    const failing = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("boom"));
      },
    });
    const stream = await ctx.run("a", () => failing);
    await expect(collect(stream)).rejects.toThrow("boom");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.id).toBe("a");
    expect((errors[0]!.error as Error).message).toBe("boom");
  });

  it("continues acquisition when onAcquire throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const store = createInMemoryResumableStreamStore();
    const ctx = createResumableStreamContext({
      store,
      onAcquire: () => {
        throw new Error("acquire observer failed");
      },
    });

    const stream = await ctx.run("a", () => makeStringStream(["hello"]));

    expect(await collect(stream)).toBe("hello");
    expect(await ctx.status("a")).toBe("done");
  });

  it("continues streaming when onAppend throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const store = createInMemoryResumableStreamStore();
    const ctx = createResumableStreamContext({
      store,
      onAppend: () => {
        throw new Error("append observer failed");
      },
    });

    const stream = await ctx.run("a", () =>
      makeStringStream(["hello ", "world"]),
    );

    expect(await collect(stream)).toBe("hello world");
    expect(await ctx.status("a")).toBe("done");
  });

  it("keeps successful completion when onFinalize throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    const onFinalize = vi.fn(() => {
      throw new Error("finalize observer failed");
    });
    const store = createInMemoryResumableStreamStore();
    const ctx = createResumableStreamContext({ store, onError, onFinalize });

    const stream = await ctx.run("a", () => makeStringStream(["hello"]));

    expect(await collect(stream)).toBe("hello");
    expect(await ctx.status("a")).toBe("done");
    expect(onFinalize).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("finalizes producer errors when onError throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tasks: Promise<unknown>[] = [];
    const store = createInMemoryResumableStreamStore();
    const ctx = createResumableStreamContext({
      store,
      waitUntil: (task) => tasks.push(task),
      onError: () => {
        throw new Error("error observer failed");
      },
    });
    const producerError = new Error("producer failed");

    const stream = await ctx.run(
      "a",
      () =>
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.error(producerError);
          },
        }),
    );
    await Promise.allSettled(tasks);

    expect(await ctx.status("a")).toBe("error");
    await expect(collect(stream)).rejects.toThrow("producer failed");
  });
});
