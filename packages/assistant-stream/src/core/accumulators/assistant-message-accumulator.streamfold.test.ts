import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { IncrementalJsonScanner, StructuredStreamPool } from "streamfold";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import type { AssistantMessage } from "../utils/types";
import {
  AssistantMessageAccumulator,
  createInitialMessage,
} from "./assistant-message-accumulator";
import { prepareStreamfold } from "../../utils/json/streamfold-arguments";
import {
  getPartialJsonObjectFieldState,
  parsePartialJsonObject,
} from "../../utils/json/parse-partial-json-object";

const start = (id = "call"): AssistantStreamChunk => ({
  type: "part-start",
  path: [],
  part: { type: "tool-call", toolCallId: id, toolName: "weather" },
});
const delta = (textDelta: string, index = 0): AssistantStreamChunk => ({
  type: "text-delta",
  path: [index],
  textDelta,
});
const source = (chunks: AssistantStreamChunk[]) =>
  new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
const collect = async (
  chunks: AssistantStreamChunk[],
  initialMessage?: AssistantMessage,
) => {
  const messages: AssistantMessage[] = [];
  await source(chunks)
    .pipeThrough(
      new AssistantMessageAccumulator({
        ...(initialMessage && { initialMessage }),
      }),
    )
    .pipeTo(
      new WritableStream({
        write(message) {
          messages.push(message);
        },
      }),
    );
  return messages;
};

describe("AssistantMessageAccumulator with Streamfold", () => {
  beforeAll(prepareStreamfold);
  afterEach(() => vi.restoreAllMocks());

  it("preserves every emitted argument value and status", async () => {
    const text =
      '{"city":"San Francisco","days":[{"label":"Monday","temperature":-12.3}],"sunny":true}';
    const messages = await collect([
      start(),
      ...text.split("").map((char) => delta(char)),
      { type: "tool-call-args-text-finish", path: [0] },
      {
        type: "result",
        path: [0],
        result: { temperature: 18 },
        isError: false,
      },
    ]);
    let previous = {};
    for (let i = 0; i < text.length; i++) {
      const prefix = text.slice(0, i + 1);
      previous = parsePartialJsonObject(prefix) ?? previous;
      const part = messages[i + 1]!.parts[0]!;
      expect(part).toMatchObject({
        argsText: prefix,
        args: previous,
        state: "partial-call",
        status: { type: "running", isArgsComplete: false },
      });
    }
    expect(messages.at(-1)!.parts[0]).toMatchObject({
      state: "result",
      result: { temperature: 18 },
      status: { type: "complete", reason: "stop" },
    });
  });

  it("isolates interleaved calls, including malformed input and duplicate IDs", async () => {
    const messages = await collect([
      start(),
      start(),
      delta('{"x":"bad\\q', 0),
      delta('{"city":"San', 1),
      delta(' Francisco"}', 1),
    ]);
    expect(messages.at(-1)!.parts[1]).toMatchObject({
      args: { city: "San Francisco" },
    });
    expect(messages.at(-1)!.parts[0]).toMatchObject({ args: {} });
  });

  it("seeds parser state from an initial message", async () => {
    const initial = (await collect([start(), delta('{"city":"San')])).at(-1)!;
    const resumed = await collect([delta(' Francisco"}')], {
      ...initial,
      status: { type: "running" },
    });
    expect(resumed[0]!.parts[0]).toMatchObject({
      argsText: '{"city":"San Francisco"}',
      args: { city: "San Francisco" },
    });
    const old = initial.parts[0]!;
    if (old.type !== "tool-call") throw new Error("Expected tool call");
    expect(old.args).toMatchObject({ city: "San" });
    expect(getPartialJsonObjectFieldState(old.args, ["city"])).toBe("partial");
  });

  it.each(["tool-call-args-text-finish", "part-finish"] as const)(
    "releases a call at %s without completing unfinished JSON",
    async (type) => {
      const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
      const messages = await collect([
        start(),
        delta('{"city":"San'),
        { type, path: [0] },
      ]);
      const part = messages.at(-1)!.parts[0]!;
      if (part.type !== "tool-call") throw new Error("Expected tool call");
      expect(getPartialJsonObjectFieldState(part.args, ["city"])).toBe(
        "partial",
      );
      expect(dispose).toHaveBeenCalledOnce();
    },
  );

  it("does not allocate a parser for text or invalid part paths", async () => {
    const create = vi.spyOn(StructuredStreamPool.prototype, "start");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await collect([
      { type: "part-start", path: [], part: { type: "text" } },
      delta("hello"),
      delta("ignored", 3),
      { ...delta("ignored"), path: [0, 1] },
    ]);
    expect(create).not.toHaveBeenCalled();
  });

  it.each(["cancel", "abort", "source-error"] as const)(
    "releases active parsers on %s",
    async (operation) => {
      const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
      const accumulator = new AssistantMessageAccumulator();
      const reader = accumulator.readable.getReader();
      const writer = accumulator.writable.getWriter();
      await Promise.all([writer.write(start()), reader.read()]);
      await Promise.all([writer.write(delta('{"city":"San')), reader.read()]);
      const error = new Error("stream stopped");
      if (operation === "cancel") {
        const reading = reader.read();
        await reader.cancel(error);
        expect(await reading).toEqual({ done: true, value: undefined });
        await expect(writer.closed).rejects.toBe(error);
      } else if (operation === "abort") {
        const reading = expect(reader.read()).rejects.toBe(error);
        await writer.abort(error);
        await reading;
      } else {
        writer.releaseLock();
        const failing = new ReadableStream<AssistantStreamChunk>({
          start(controller) {
            controller.error(error);
          },
        });
        const reading = expect(reader.read()).rejects.toBe(error);
        await expect(failing.pipeTo(accumulator.writable)).rejects.toBe(error);
        await reading;
      }
      expect(dispose).toHaveBeenCalledOnce();
      reader.releaseLock();
      if (operation !== "source-error") writer.releaseLock();
    },
  );

  it("releases active parsers when the transform throws", async () => {
    const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
    await expect(
      collect([
        start(),
        delta('{"city":"San'),
        { type: "unknown", path: [] } as unknown as AssistantStreamChunk,
      ]),
    ).rejects.toThrow("Unsupported chunk type");
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("still emits an empty stream's final message", async () => {
    const messages = await collect([], createInitialMessage());
    expect(messages).toHaveLength(1);
    expect(messages[0]!.status.type).toBe("complete");
  });

  it.each([
    { name: "EOF", ending: [] },
    {
      name: "result",
      ending: [
        { type: "result", path: [0], result: { ok: true }, isError: false },
      ],
    },
    {
      name: "message finish",
      ending: [
        {
          type: "message-finish",
          path: [],
          finishReason: "stop",
          usage: { inputTokens: 0, outputTokens: 0 },
        },
      ],
    },
    {
      name: "error chunk",
      ending: [{ type: "error", path: [], error: "provider failed" }],
    },
  ] satisfies { name: string; ending: AssistantStreamChunk[] }[])(
    "releases the active parser at $name",
    async ({ ending }) => {
      const dispose = vi.spyOn(IncrementalJsonScanner.prototype, "dispose");
      await collect([
        start(),
        delta('{"value":"' + "x".repeat(4096)),
        ...ending,
      ]);
      expect(dispose).toHaveBeenCalledOnce();
    },
  );

  it.each([false, true])(
    "cancels repeated active streams with a backpressured write (throttle=%s)",
    async (throttle) => {
      const started = vi.spyOn(StructuredStreamPool.prototype, "start");
      for (let index = 0; index < 32; index++) {
        const accumulator = new AssistantMessageAccumulator({ throttle });
        const reader = accumulator.readable.getReader();
        const writer = accumulator.writable.getWriter();
        await Promise.all([writer.write(start()), reader.read()]);
        await Promise.all([
          writer.write(delta('{"value":"' + "x".repeat(4096))),
          reader.read(),
        ]);
        const error = new Error(`cancel ${index}`);
        const writing = expect(writer.write(delta("pending"))).rejects.toBe(
          error,
        );
        const closed = expect(writer.closed).rejects.toBe(error);
        await reader.cancel(error);
        await Promise.all([writing, closed]);
        reader.releaseLock();
        writer.releaseLock();
      }
      expect(started).toHaveBeenCalledTimes(32);
      for (const pool of started.mock
        .contexts as StructuredStreamPool<string>[])
        expect(pool.activeIds).toEqual([]);
    },
  );
});
