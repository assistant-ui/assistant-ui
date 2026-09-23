import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalRuntimeCore } from "./local-runtime-core";
import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
} from "../../runtime/utils/chat-model-adapter";
import type { AppendMessage, ToolCallMessagePart } from "../../types/message";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { LocalRuntimeOptionsBase } from "./local-runtime-options";
import {
  ExportedMessageRepository,
  type ExportedMessageRepositoryItem,
} from "../../runtime/utils/message-repository";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";
import type { ThreadSuggestion } from "../../runtime/interfaces/thread-runtime-core";
import { isMessageNotSentError } from "../../types/error";

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

afterEach(() => {
  vi.restoreAllMocks();
});

const createThread = (
  adapter: ChatModelAdapter,
  options?: {
    suggestion?: LocalRuntimeOptionsBase["adapters"]["suggestion"];
    history?: LocalRuntimeOptionsBase["adapters"]["history"];
    maxSteps?: number;
  },
) => {
  const core = new LocalRuntimeCore(
    {
      adapters: {
        chatModel: adapter,
        ...(options?.suggestion !== undefined && {
          suggestion: options.suggestion,
        }),
        ...(options?.history !== undefined && {
          history: options.history,
        }),
      },
      unstable_humanToolNames: ["send_email"],
      ...(options?.maxSteps !== undefined && { maxSteps: options.maxSteps }),
    },
    undefined,
  );
  return core.threads.getMainThreadRuntimeCore();
};

const userMessage = (text: string): AppendMessage => ({
  parentId: null,
  sourceId: null,
  runConfig: {},
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(),
});

const toolCallPart = (
  toolName: string,
  approval?: ToolCallMessagePart["approval"],
) => ({
  type: "tool-call" as const,
  toolCallId: `call-${toolName}`,
  toolName,
  args: {},
  argsText: "{}",
  ...(approval !== undefined ? { approval } : {}),
});

const toolCallResult = (
  toolName: string,
  approval?: ToolCallMessagePart["approval"],
): ChatModelRunResult => ({
  content: [toolCallPart(toolName, approval)],
  status: { type: "requires-action", reason: "tool-calls" },
});

const createApprovalThread = (firstResult: ChatModelRunResult) => {
  const runs: ChatModelRunOptions[] = [];
  const thread = createThread({
    async run(options) {
      runs.push(options);
      if (runs.length === 1) return firstResult;
      return { content: [{ type: "text", text: "done" }] };
    },
  });
  return { thread, runs };
};

describe("LocalThreadRuntimeCore events", () => {
  it("isolates runEnd listener errors", async () => {
    const listenerError = new Error("telemetry failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const laterListener = vi.fn();
    const thread = createThread({
      async run() {
        return { content: [{ type: "text", text: "done" }] };
      },
    });

    thread.unstable_on("runEnd", () => {
      throw listenerError;
    });
    thread.unstable_on("runEnd", laterListener);

    await expect(thread.append(userMessage("hello"))).resolves.toBeUndefined();

    expect(laterListener).toHaveBeenCalledOnce();
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
    expect(consoleError).toHaveBeenCalledWith(
      '[assistant-ui] Thread runtime "runEnd" listener threw an error',
      listenerError,
    );
  });

  it("isolates async runEnd listener rejections", async () => {
    const listenerError = new Error("async telemetry failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const laterListener = vi.fn();
    const thread = createThread({
      async run() {
        return { content: [{ type: "text", text: "done" }] };
      },
    });

    thread.unstable_on("runEnd", async () => {
      throw listenerError;
    });
    thread.unstable_on("runEnd", laterListener);

    await expect(thread.append(userMessage("hello"))).resolves.toBeUndefined();

    expect(laterListener).toHaveBeenCalledOnce();
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        '[assistant-ui] Thread runtime "runEnd" listener threw an error',
        listenerError,
      );
    });
  });
});

describe("LocalThreadRuntimeCore history persistence", () => {
  it("keeps streaming after feedback arrives and persists the completed message", async () => {
    let releaseStream!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseStream = resolve;
    });
    const appendHistory = vi.fn(
      async (_item: ExportedMessageRepositoryItem) => {},
    );
    const thread = createThread(
      {
        async *run() {
          yield { content: [{ type: "text", text: "a" }] };
          await gate;
          yield { content: [{ type: "text", text: "ab" }] };
        },
      },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          append: appendHistory,
          async update() {},
        },
      },
    );

    const send = thread.append(userMessage("hello"));
    await vi.waitFor(() =>
      expect(thread.messages.at(-1)?.content).toHaveLength(1),
    );
    const messageId = thread.messages.at(-1)!.id;
    thread.submitFeedback({ messageId, type: "positive" });
    releaseStream();
    await send;

    const assistant = thread.messages.at(-1);
    expect(assistant?.status?.type).toBe("complete");
    expect(assistant?.content).toEqual([{ type: "text", text: "ab" }]);
    expect(assistant?.metadata.submittedFeedback).toEqual({
      type: "positive",
    });
    expect(appendHistory.mock.calls.at(-1)?.[0].message).toEqual(assistant);
  });

  it.each(["feedback", "tool result"])(
    "keeps streaming when %s arrives first and the other writer follows",
    async (first) => {
      let releaseStream!: () => void;
      const gate = new Promise<void>((resolve) => {
        releaseStream = resolve;
      });
      const thread = createThread({
        async *run() {
          yield { content: [toolCallPart("lookup_weather")] };
          await gate;
          yield {
            content: [
              toolCallPart("lookup_weather"),
              { type: "text", text: "It is sunny." },
            ],
          } satisfies ChatModelRunResult;
        },
      });

      const send = thread.append(userMessage("weather"));
      await vi.waitFor(() =>
        expect(thread.messages.at(-1)?.content).toHaveLength(1),
      );
      const messageId = thread.messages.at(-1)!.id;
      const submitFeedback = () =>
        thread.submitFeedback({ messageId, type: "positive" });
      const addToolResult = () =>
        thread.addToolResult({
          messageId,
          toolCallId: "call-lookup_weather",
          toolName: "lookup_weather",
          result: { temperature: 21 },
          isError: false,
        });
      if (first === "feedback") {
        submitFeedback();
        addToolResult();
      } else {
        addToolResult();
        submitFeedback();
      }
      releaseStream();
      await send;

      const assistant = thread.messages.at(-1);
      expect(assistant?.status?.type).toBe("complete");
      expect(assistant?.content).toEqual([
        expect.objectContaining({ result: { temperature: 21 } }),
        { type: "text", text: "It is sunny." },
      ]);
      expect(assistant?.metadata.submittedFeedback).toEqual({
        type: "positive",
      });
    },
  );

  it("keeps streaming after a tool result arrives and persists the completed message", async () => {
    let releaseStream!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseStream = resolve;
    });
    const appendHistory = vi.fn(
      async (_item: ExportedMessageRepositoryItem) => {},
    );
    const thread = createThread(
      {
        async *run() {
          yield { content: [toolCallPart("lookup_weather")] };
          await gate;
          yield {
            content: [
              {
                ...toolCallPart("lookup_weather"),
                result: { temperature: 20 },
                isPreliminary: true,
                artifact: { preview: true },
                modelContent: [{ type: "text", text: "preview" }],
              },
              { type: "text", text: "It is sunny." },
            ],
          } satisfies ChatModelRunResult;
        },
      },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          append: appendHistory,
          async update() {},
        },
      },
    );

    const send = thread.append(userMessage("weather"));
    await vi.waitFor(() =>
      expect(thread.messages.at(-1)?.content).toHaveLength(1),
    );
    const messageId = thread.messages.at(-1)!.id;
    thread.addToolResult({
      messageId,
      toolCallId: "call-lookup_weather",
      toolName: "lookup_weather",
      result: { temperature: 21 },
      isError: false,
    });
    releaseStream();
    await send;

    const assistant = thread.messages.at(-1);
    expect(assistant?.status?.type).toBe("complete");
    expect(assistant?.content).toEqual([
      expect.objectContaining({ result: { temperature: 21 } }),
      { type: "text", text: "It is sunny." },
    ]);
    expect(assistant?.content[0]).not.toHaveProperty("artifact");
    expect(assistant?.content[0]).not.toHaveProperty("modelContent");
    expect(appendHistory.mock.calls.at(-1)?.[0].message).toEqual(assistant);
  });

  it("does not settle a preliminary tool result from a later stream chunk", async () => {
    const thread = createThread(
      {
        async *run() {
          yield {
            content: [
              {
                ...toolCallPart("lookup_weather"),
                result: { temperature: 20 },
                isPreliminary: true,
              },
            ],
          };
          yield { content: [toolCallPart("lookup_weather")] };
        },
      },
      { maxSteps: 1 },
    );

    await thread.append(userMessage("weather"));

    expect(thread.messages.at(-1)?.content[0]).not.toHaveProperty("result");
    expect(thread.messages.at(-1)?.content[0]).not.toHaveProperty(
      "isPreliminary",
    );
  });

  it.each([false, true])(
    "does not carry adapter-only results into a later snapshot (preliminary: %s)",
    async (preliminary) => {
      const nextPart = {
        ...toolCallPart("lookup_weather"),
        ...(preliminary && {
          result: "preview",
          isPreliminary: true,
          artifact: { preview: true },
          modelContent: [{ type: "text" as const, text: "preview" }],
        }),
      };
      const thread = createThread({
        async *run() {
          yield {
            content: [{ ...toolCallPart("lookup_weather"), result: "first" }],
          };
          yield { content: [nextPart] };
        },
      });

      await thread.append(userMessage("weather"));

      expect(thread.messages.at(-1)?.content).toEqual([nextPart]);
    },
  );

  it("keeps external results matched to their own tool-call occurrence", async () => {
    let releaseStream!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseStream = resolve;
    });
    const thread = createThread(
      {
        async *run() {
          yield {
            content: [
              toolCallPart("lookup_weather"),
              { ...toolCallPart("lookup_time"), result: "noon" },
            ],
          };
          await gate;
          yield {
            content: [
              toolCallPart("lookup_weather"),
              toolCallPart("lookup_weather"),
              toolCallPart("lookup_time"),
            ],
          };
          yield {
            content: [
              toolCallPart("lookup_weather"),
              toolCallPart("lookup_weather"),
              toolCallPart("lookup_time"),
              { type: "text", text: "done" },
            ],
          };
        },
      },
      { maxSteps: 1 },
    );

    const send = thread.append(userMessage("weather"));
    await vi.waitFor(() =>
      expect(thread.messages.at(-1)?.content).toHaveLength(2),
    );
    thread.addToolResult({
      messageId: thread.messages.at(-1)!.id,
      toolCallId: "call-lookup_weather",
      toolName: "lookup_weather",
      result: "first",
      isError: false,
    });
    releaseStream();
    await send;

    expect(thread.messages.at(-1)?.content[0]).toMatchObject({
      result: "first",
    });
    expect(thread.messages.at(-1)?.content[1]).not.toHaveProperty("result");
    expect(thread.messages.at(-1)?.content[2]).not.toHaveProperty("result");
  });

  it("keeps an external result on a tool call id reused by a later roundtrip", async () => {
    let releaseStream!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseStream = resolve;
    });
    let calls = 0;
    const thread = createThread({
      async *run() {
        calls++;
        if (calls === 1) {
          yield {
            content: [{ ...toolCallPart("lookup_weather"), result: "first" }],
            status: { type: "requires-action", reason: "tool-calls" },
          } satisfies ChatModelRunResult;
          return;
        }
        yield { content: [toolCallPart("lookup_weather")] };
        await gate;
        yield { content: [toolCallPart("lookup_weather")] };
        yield {
          content: [
            toolCallPart("lookup_weather"),
            { type: "text", text: "done" },
          ],
        };
      },
    });

    const send = thread.append(userMessage("weather"));
    await vi.waitFor(() =>
      expect(thread.messages.at(-1)?.content).toHaveLength(2),
    );
    thread.addToolResult({
      messageId: thread.messages.at(-1)!.id,
      toolCallId: "call-lookup_weather",
      toolName: "lookup_weather",
      result: "second",
      isError: false,
    });
    releaseStream();
    await send;

    expect(thread.messages.at(-1)?.content).toEqual([
      expect.objectContaining({ result: "first" }),
      expect.objectContaining({ result: "second" }),
      { type: "text", text: "done" },
    ]);
  });

  it("exposes a tool result added mid-run to the adapter before its next chunk", async () => {
    let releaseStream!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseStream = resolve;
    });
    let seen: unknown;
    const thread = createThread({
      async *run({ unstable_getMessage }) {
        yield { content: [toolCallPart("lookup_weather")] };
        await gate;
        seen = unstable_getMessage().content;
        yield {
          content: [
            toolCallPart("lookup_weather"),
            { type: "text", text: "done" },
          ],
        };
      },
    });

    const send = thread.append(userMessage("weather"));
    await vi.waitFor(() =>
      expect(thread.messages.at(-1)?.content).toHaveLength(1),
    );
    thread.addToolResult({
      messageId: thread.messages.at(-1)!.id,
      toolCallId: "call-lookup_weather",
      toolName: "lookup_weather",
      result: { temperature: 21 },
      isError: false,
    });
    releaseStream();
    await send;

    expect(seen).toEqual([
      expect.objectContaining({ result: { temperature: 21 } }),
    ]);
  });

  it("carries multiple external results through a replacement chain", async () => {
    let releaseStream!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseStream = resolve;
    });
    const thread = createThread({
      async *run() {
        const content = [
          toolCallPart("lookup_weather"),
          toolCallPart("lookup_time"),
        ];
        yield { content };
        await gate;
        yield { content: [...content, { type: "text", text: "done" }] };
      },
    });

    const send = thread.append(userMessage("weather and time"));
    await vi.waitFor(() =>
      expect(thread.messages.at(-1)?.content).toHaveLength(2),
    );
    const messageId = thread.messages.at(-1)!.id;
    for (const toolName of ["lookup_weather", "lookup_time"]) {
      thread.addToolResult({
        messageId,
        toolCallId: `call-${toolName}`,
        toolName,
        result: `${toolName} result`,
        isError: false,
        artifact: { toolName },
        modelContent: [{ type: "text", text: toolName }],
      });
    }
    releaseStream();
    await send;

    expect(thread.messages.at(-1)?.content).toEqual([
      ...["lookup_weather", "lookup_time"].map((toolName) => ({
        ...toolCallPart(toolName),
        result: `${toolName} result`,
        isError: false,
        artifact: { toolName },
        modelContent: [{ type: "text", text: toolName }],
      })),
      { type: "text", text: "done" },
    ]);
  });

  it("persists a tool result added after a completed message", async () => {
    const update = vi.fn(async (_item: ExportedMessageRepositoryItem) => {});
    const thread = createThread(
      {
        async run() {
          return { content: [toolCallPart("lookup_weather")] };
        },
      },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          async append() {},
          update,
        },
      },
    );

    await thread.append(userMessage("what is the weather"));
    const assistantMessage = thread.messages.at(-1)!;
    expect(assistantMessage.status?.type).toBe("complete");

    thread.addToolResult({
      messageId: assistantMessage.id,
      toolCallId: "call-lookup_weather",
      toolName: "lookup_weather",
      result: { temperature: 21 },
      isError: false,
    });
    await flush();

    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0]?.[0].message.content).toEqual([
      expect.objectContaining({
        result: { temperature: 21 },
        isError: false,
      }),
    ]);
  });

  it("persists a tool result added after an incomplete message", async () => {
    const update = vi.fn(async (_item: ExportedMessageRepositoryItem) => {});
    const thread = createThread(
      {
        async run() {
          return {
            content: [toolCallPart("lookup_weather")],
            status: { type: "incomplete", reason: "cancelled" },
          };
        },
      },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          async append() {},
          update,
        },
      },
    );

    await thread.append(userMessage("what is the weather"));
    const assistantMessage = thread.messages.at(-1)!;
    expect(assistantMessage.status?.type).toBe("incomplete");

    thread.addToolResult({
      messageId: assistantMessage.id,
      toolCallId: "call-lookup_weather",
      toolName: "lookup_weather",
      result: { temperature: 21 },
      isError: false,
    });
    await flush();

    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0]?.[0].message.content).toEqual([
      expect.objectContaining({ result: { temperature: 21 } }),
    ]);
  });

  it("writes a result a subscriber adds in response after the late result", async () => {
    const update = vi.fn(async (_item: ExportedMessageRepositoryItem) => {});
    const thread = createThread(
      {
        async run() {
          return {
            content: [
              toolCallPart("lookup_weather"),
              toolCallPart("lookup_time"),
            ],
          };
        },
      },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          async append() {},
          update,
        },
      },
    );

    await thread.append(userMessage("weather and time"));
    const assistantMessage = thread.messages.at(-1)!;
    expect(assistantMessage.status?.type).toBe("complete");

    const unsubscribe = thread.subscribe(() => {
      const message = thread.messages.find((m) => m.id === assistantMessage.id);
      const [weather, time] = message?.content ?? [];
      if (
        weather?.type === "tool-call" &&
        weather.result !== undefined &&
        time?.type === "tool-call" &&
        time.result === undefined
      ) {
        thread.addToolResult({
          messageId: assistantMessage.id,
          toolCallId: "call-lookup_time",
          toolName: "lookup_time",
          result: { hour: 9 },
          isError: false,
        });
      }
    });
    thread.addToolResult({
      messageId: assistantMessage.id,
      toolCallId: "call-lookup_weather",
      toolName: "lookup_weather",
      result: { temperature: 21 },
      isError: false,
    });
    unsubscribe();
    await flush();

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls.at(-1)?.[0].message.content).toEqual([
      expect.objectContaining({ result: { temperature: 21 } }),
      expect.objectContaining({ result: { hour: 9 } }),
    ]);
  });

  it("writes a decision a subscriber adds in response after the one it answers", async () => {
    const update = vi.fn(async (_item: ExportedMessageRepositoryItem) => {});
    let runs = 0;
    const thread = createThread(
      {
        async run() {
          runs++;
          if (runs > 1) return { content: [{ type: "text", text: "ok" }] };
          return {
            content: [
              {
                ...toolCallPart("send_email", { id: "a1" }),
                toolCallId: "call-1",
              },
              {
                ...toolCallPart("send_email", { id: "a2" }),
                toolCallId: "call-2",
              },
            ],
            status: { type: "requires-action", reason: "tool-calls" },
          };
        },
      },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          async append() {},
          update,
        },
      },
    );

    await thread.append(userMessage("send two emails"));
    const paused = thread.messages.at(-1)!;
    await thread.append({ ...userMessage("and then"), parentId: paused.id });
    await flush();

    const unsubscribe = thread.subscribe(() => {
      const message = thread.messages.find((m) => m.id === paused.id);
      const [first, second] = message?.content ?? [];
      if (
        first?.type === "tool-call" &&
        first.approval?.approved !== undefined &&
        second?.type === "tool-call" &&
        second.approval?.approved === undefined
      ) {
        void thread.respondToToolApproval({ approvalId: "a2", approved: true });
      }
    });
    void thread.respondToToolApproval({ approvalId: "a1", approved: true });
    unsubscribe();
    await flush();

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls.at(-1)?.[0].message.content).toEqual([
      expect.objectContaining({
        approval: expect.objectContaining({ approved: true }),
      }),
      expect.objectContaining({
        approval: expect.objectContaining({ approved: true }),
      }),
    ]);
  });

  it("does not rewrite a message whose run is still streaming", async () => {
    const update = vi.fn(async (_item: ExportedMessageRepositoryItem) => {});
    let release!: () => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const thread = createThread(
      {
        async *run() {
          yield { content: [toolCallPart("lookup_weather")] };
          await released;
        },
      },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          async append() {},
          update,
        },
      },
    );

    const appended = thread.append(userMessage("what is the weather"));
    await flush();
    const assistantMessage = thread.messages.at(-1)!;
    expect(assistantMessage.status?.type).toBe("running");

    thread.addToolResult({
      messageId: assistantMessage.id,
      toolCallId: "call-lookup_weather",
      toolName: "lookup_weather",
      result: { temperature: 21 },
      isError: false,
    });
    await flush();
    release();
    await appended;

    expect(update).not.toHaveBeenCalled();
  });

  it("persists a final result that replaces a preliminary result", async () => {
    const update = vi.fn(async (_item: ExportedMessageRepositoryItem) => {});
    const thread = createThread(
      {
        async run() {
          return {
            content: [
              {
                ...toolCallPart("lookup_weather"),
                result: { temperature: 20 },
                isPreliminary: true,
              },
            ],
          };
        },
      },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          async append() {},
          update,
        },
      },
    );

    await thread.append(userMessage("what is the weather"));
    const assistantMessage = thread.messages.at(-1)!;
    expect(assistantMessage.status?.type).toBe("complete");

    thread.addToolResult({
      messageId: assistantMessage.id,
      toolCallId: "call-lookup_weather",
      toolName: "lookup_weather",
      result: { temperature: 21 },
      isError: false,
    });
    await flush();

    expect(update).toHaveBeenCalledOnce();
    const updatedToolCall = update.mock.calls[0]?.[0].message.content[0];
    expect(updatedToolCall).toMatchObject({ result: { temperature: 21 } });
    expect(updatedToolCall).not.toHaveProperty("isPreliminary");
  });

  it("surfaces failed user persistence without abandoning the run", async () => {
    const persistenceError = new Error("history unavailable");
    const run = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "done" }],
    }));
    const append = vi.fn(async (item: ExportedMessageRepositoryItem) => {
      if (item.message.role === "user") throw persistenceError;
    });
    const thread = createThread(
      { run },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          append,
        },
      },
    );

    await expect(thread.append(userMessage("hello"))).rejects.toBe(
      persistenceError,
    );

    expect(append).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenCalledOnce();
  });

  it("surfaces failed persistence for messages that do not start a run", async () => {
    const persistenceError = new Error("history unavailable");
    const run = vi.fn();
    const thread = createThread(
      { run },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          async append() {
            throw persistenceError;
          },
        },
      },
    );

    await expect(
      thread.append({ ...userMessage("hello"), startRun: false }),
    ).rejects.toBe(persistenceError);

    expect(run).not.toHaveBeenCalled();
  });

  it("handles failed persistence before notifying no-run subscribers", async () => {
    const persistenceError = new Error("history unavailable");
    const listenerError = new Error("listener unavailable");
    const thread = createThread(
      { run: vi.fn() },
      {
        history: {
          async load() {
            return { messages: [] };
          },
          async append() {
            throw persistenceError;
          },
        },
      },
    );
    thread.subscribe(() => {
      throw listenerError;
    });

    await expect(
      thread.append({ ...userMessage("hello"), startRun: false }),
    ).rejects.toBe(listenerError);
    await flush();
  });
});

describe("LocalThreadRuntimeCore - detach", () => {
  it("drops a pending append when detached", async () => {
    let resolveInitialization!: () => void;
    const initialization = new Promise<void>((resolve) => {
      resolveInitialization = resolve;
    });
    const run = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "done" }],
    }));
    const thread = createThread({ run });
    thread.__internal_setGetInitializePromise(() => initialization);

    const appendPromise = thread.append(userMessage("hello"));
    await Promise.resolve();
    thread.detach();
    resolveInitialization();

    await appendPromise;
    expect(run).not.toHaveBeenCalled();
    expect(thread.messages).toEqual([]);
  });
});

describe("LocalThreadRuntimeCore optimistic append", () => {
  it("paints the appended message before initialization resolves", async () => {
    let resolveInitialization!: () => void;
    const initialization = new Promise<void>((resolve) => {
      resolveInitialization = resolve;
    });
    const run = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "done" }],
    }));
    const thread = createThread({ run });
    thread.__internal_setGetInitializePromise(() => initialization);
    const onUpdate = vi.fn();
    thread.subscribe(onUpdate);

    const appendPromise = thread.append(userMessage("hello"));
    await Promise.resolve();

    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0]?.role).toBe("user");
    expect(onUpdate).toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();

    resolveInitialization();
    await appendPromise;
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("silently drops a detached append even when initialization rejects", async () => {
    let rejectInitialization!: (error: unknown) => void;
    const initialization = new Promise<void>((_, reject) => {
      rejectInitialization = reject;
    });
    const run = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "done" }],
    }));
    const thread = createThread({ run });
    thread.__internal_setGetInitializePromise(() => initialization);

    const appendPromise = thread.append(userMessage("hello"));
    await Promise.resolve();
    thread.detach();
    rejectInitialization(new Error("initialization failed"));

    await expect(appendPromise).resolves.toBeUndefined();
    expect(thread.messages).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it("rolls the optimistic message back when initialization rejects", async () => {
    const initializationError = new Error("initialization failed");
    const run = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "done" }],
    }));
    const thread = createThread({ run });
    thread.__internal_setGetInitializePromise(() =>
      Promise.reject(initializationError),
    );

    const error = await thread.append(userMessage("hello")).then(
      () => {
        throw new Error("expected the append to reject");
      },
      (e: unknown) => e,
    );
    expect(isMessageNotSentError(error)).toBe(true);
    expect((error as Error).cause).toBe(initializationError);
    expect(thread.messages).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });
});

describe("LocalThreadRuntimeCore append during a history load", () => {
  const persistedMessage = {
    id: "persisted",
    role: "user" as const,
    content: [{ type: "text" as const, text: "persisted" }],
    attachments: [],
    createdAt: new Date(0),
    metadata: { custom: {} },
  };

  const createLoadingThread = (
    load: ThreadHistoryAdapter["load"],
    run: ChatModelAdapter["run"] = async () => ({
      content: [{ type: "text", text: "done" }],
    }),
  ) => {
    const appended: ExportedMessageRepositoryItem[] = [];
    const thread = createThread(
      { run },
      {
        history: {
          load,
          async append(item) {
            appended.push(item);
          },
        },
      },
    );
    return { thread, appended };
  };

  it("lands a message typed during a load after the imported history", async () => {
    let releaseLoad!: () => void;
    const loadBarrier = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });
    const { thread, appended } = createLoadingThread(() =>
      loadBarrier.then(() => ({
        headId: "persisted",
        messages: [{ parentId: null, message: persistedMessage }],
      })),
    );

    thread.__internal_load();
    expect(thread.isLoading).toBe(true);

    const appendPromise = thread.append(userMessage("typed during load"));
    releaseLoad();
    await appendPromise;
    await flush();

    expect(thread.messages.map((message) => message.content)).toEqual([
      [{ type: "text", text: "persisted" }],
      [{ type: "text", text: "typed during load" }],
      [{ type: "text", text: "done" }],
    ]);
    expect(appended.map((item) => [item.parentId, item.message.role])).toEqual([
      ["persisted", "user"],
      [thread.messages[1]!.id, "assistant"],
    ]);
  });

  // The tail re-point must not move an append that named its parent, or an
  // edit issued during a load would silently reattach to the imported tail.
  it("keeps an explicit parent for a message appended during a load", async () => {
    const olderMessage = {
      ...persistedMessage,
      id: "older",
      content: [{ type: "text" as const, text: "older" }],
    };
    let releaseLoad!: () => void;
    const loadBarrier = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });
    const { thread, appended } = createLoadingThread(() =>
      loadBarrier.then(() => ({
        headId: "persisted",
        messages: [
          { parentId: null, message: olderMessage },
          { parentId: "older", message: persistedMessage },
        ],
      })),
    );

    thread.__internal_load();
    expect(thread.isLoading).toBe(true);

    const appendPromise = thread.append({
      ...userMessage("branched during load"),
      parentId: "older",
    });
    releaseLoad();
    await appendPromise;
    await flush();

    expect(appended.map((item) => [item.parentId, item.message.role])).toEqual([
      ["older", "user"],
      [thread.messages.at(-2)!.id, "assistant"],
    ]);
  });

  it("keeps a message typed during a rejected load", async () => {
    let rejectLoad!: (error: unknown) => void;
    const loadBarrier = new Promise<never>((_, reject) => {
      rejectLoad = reject;
    });
    const { thread, appended } = createLoadingThread(() => loadBarrier);

    thread.__internal_load().catch(() => {});
    const appendPromise = thread.append(userMessage("typed during load"));
    rejectLoad(new Error("history unavailable"));
    await appendPromise;
    await flush();

    expect(thread.messages.map((message) => message.content)).toEqual([
      [{ type: "text", text: "typed during load" }],
      [{ type: "text", text: "done" }],
    ]);
    expect(appended[0]?.parentId).toBe(null);
  });

  it("drops a message typed during a load on a detached thread", async () => {
    let releaseLoad!: () => void;
    const loadBarrier = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });
    const run = vi.fn(async () => ({
      content: [{ type: "text" as const, text: "done" }],
    }));
    const { thread, appended } = createLoadingThread(
      () =>
        loadBarrier.then(() => ({
          headId: "persisted",
          messages: [{ parentId: null, message: persistedMessage }],
        })),
      run,
    );

    thread.__internal_load();
    const appendPromise = thread.append(userMessage("typed during load"));
    thread.detach();
    releaseLoad();
    await appendPromise;
    await flush();

    expect(run).not.toHaveBeenCalled();
    expect(appended).toEqual([]);
    expect(thread.messages.map((message) => message.id)).toEqual(["persisted"]);
  });
});

describe("LocalThreadRuntimeCore human-in-the-loop tools", () => {
  it("pauses on requires-action while a listed tool call has no result", async () => {
    const { thread, runs } = createApprovalThread(toolCallResult("send_email"));

    await thread.append(userMessage("send an email"));
    await flush();

    expect(runs).toHaveLength(1);
    expect(thread.messages.at(-1)?.status?.type).toBe("requires-action");
  });

  it("does not hold the run for unlisted tool calls", async () => {
    const { thread, runs } = createApprovalThread(
      toolCallResult("lookup_weather"),
    );

    await thread.append(userMessage("what is the weather"));
    await flush();

    expect(runs).toHaveLength(2);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("resumes via addToolResult and exposes the result to the adapter", async () => {
    const { thread, runs } = createApprovalThread(toolCallResult("send_email"));

    await thread.append(userMessage("send an email"));
    await flush();

    const assistantMessage = thread.messages.at(-1)!;
    thread.addToolResult({
      messageId: assistantMessage.id,
      toolCallId: "call-send_email",
      toolName: "send_email",
      result: { approved: true },
      isError: false,
    });
    await flush();

    expect(runs).toHaveLength(2);
    const resumed = runs[1]!;
    expect(resumed.messages.at(-1)?.role).toBe("user");
    const toolCall = resumed
      .unstable_getMessage()
      .content.find((part) => part.type === "tool-call");
    expect(toolCall?.result).toEqual({ approved: true });

    const finalMessage = thread.messages.at(-1)!;
    expect(finalMessage.status?.type).toBe("complete");
    expect(finalMessage.content.map((part) => part.type)).toEqual([
      "tool-call",
      "text",
    ]);
  });

  it.each([
    ["false", false],
    ["zero", 0],
    ["an empty string", ""],
    ["null", null],
  ])("resumes when the tool result is %s", async (_label, result) => {
    const { thread, runs } = createApprovalThread(toolCallResult("send_email"));

    await thread.append(userMessage("send an email"));
    await flush();

    thread.addToolResult({
      messageId: thread.messages.at(-1)!.id,
      toolCallId: "call-send_email",
      toolName: "send_email",
      result,
      isError: false,
    });
    await flush();

    expect(runs).toHaveLength(2);
    const toolCall = runs[1]!
      .unstable_getMessage()
      .content.find((part) => part.type === "tool-call");
    expect(toolCall?.result).toEqual(result);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });
});

describe("LocalThreadRuntimeCore addToolResult content", () => {
  it("stores modelContent and forwards it to the resumed adapter", async () => {
    const { thread, runs } = createApprovalThread(toolCallResult("send_email"));

    await thread.append(userMessage("send an email"));
    await flush();

    thread.addToolResult({
      messageId: thread.messages.at(-1)!.id,
      toolCallId: "call-send_email",
      toolName: "send_email",
      result: { approved: true },
      isError: false,
      modelContent: [{ type: "text", text: "Email sent." }],
    });
    await flush();

    const resumedToolCall = runs[1]!
      .unstable_getMessage()
      .content.find((part) => part.type === "tool-call");
    expect(resumedToolCall?.modelContent).toEqual([
      { type: "text", text: "Email sent." },
    ]);

    const storedToolCall = thread.messages
      .at(-1)!
      .content.find((part) => part.type === "tool-call");
    expect(storedToolCall?.modelContent).toEqual([
      { type: "text", text: "Email sent." },
    ]);
  });

  it("keeps a stored artifact when a later result omits it", async () => {
    const { thread } = createApprovalThread(toolCallResult("send_email"));

    await thread.append(userMessage("send an email"));
    await flush();

    const messageId = thread.messages.at(-1)!.id;
    thread.addToolResult({
      messageId,
      toolCallId: "call-send_email",
      toolName: "send_email",
      result: { approved: true },
      isError: false,
      artifact: { draftId: "d-1" },
    });
    await flush();

    thread.addToolResult({
      messageId,
      toolCallId: "call-send_email",
      toolName: "send_email",
      result: { approved: true, sent: true },
      isError: false,
    });
    await flush();

    const storedToolCall = thread.messages
      .map((message) =>
        message.content.find(
          (part): part is ToolCallMessagePart =>
            part.type === "tool-call" && part.toolCallId === "call-send_email",
        ),
      )
      .find((part): part is ToolCallMessagePart => part !== undefined);
    expect(storedToolCall?.artifact).toEqual({ draftId: "d-1" });
  });
});

describe("LocalThreadRuntimeCore state", () => {
  it.each([
    ["false", false],
    ["zero", 0],
    ["an empty string", ""],
  ])("preserves %s model state", async (_label, state) => {
    const thread = createThread({
      async run() {
        return { metadata: { unstable_state: state } };
      },
    });

    await thread.append(userMessage("update state"));
    await flush();

    expect(thread.messages.at(-1)?.metadata.unstable_state).toBe(state);
  });
});

describe("LocalThreadRuntimeCore tool approvals", () => {
  it("emits a decision with its message and tool call IDs", async () => {
    const { thread } = createApprovalThread(
      toolCallResult("send_email", { id: "a1" }),
    );
    const answered = vi.fn();
    thread.unstable_on("toolApprovalAnswered", answered);

    await thread.append(userMessage("send an email"));
    await flush();
    const messageId = thread.messages.at(-1)?.id;

    await thread.respondToToolApproval({ approvalId: "a1", approved: false });

    expect(answered).toHaveBeenCalledWith({
      messageId,
      toolCallId: "call-send_email",
      toolName: "send_email",
      approved: false,
    });
  });

  it("pauses the run while an approval is pending, even for unlisted tools", async () => {
    const { thread, runs } = createApprovalThread(
      toolCallResult("deploy", { id: "a1" }),
    );

    await thread.append(userMessage("deploy the app"));
    await flush();

    expect(runs).toHaveLength(1);
    expect(thread.messages.at(-1)?.status?.type).toBe("requires-action");
  });

  it("records an approval and resumes, exempting the gated tool from the human tool result requirement", async () => {
    const { thread, runs } = createApprovalThread(
      toolCallResult("send_email", { id: "a1" }),
    );

    await thread.append(userMessage("send an email"));
    await flush();

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(runs).toHaveLength(2);
    const toolCall = runs[1]!
      .unstable_getMessage()
      .content.find((part) => part.type === "tool-call");
    expect(toolCall?.approval).toEqual({ id: "a1", approved: true });
    expect(toolCall?.result).toBeUndefined();
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("records the chosen optionId alongside the decision", async () => {
    const { thread, runs } = createApprovalThread(
      toolCallResult("send_email", { id: "a1" }),
    );

    await thread.append(userMessage("send an email"));
    await flush();

    thread.respondToToolApproval({
      approvalId: "a1",
      approved: true,
      optionId: "always",
    });
    await flush();

    expect(runs).toHaveLength(2);
    const toolCall = runs[1]!
      .unstable_getMessage()
      .content.find((part) => part.type === "tool-call");
    expect(toolCall?.approval).toEqual({
      id: "a1",
      approved: true,
      optionId: "always",
    });
  });

  it("records a free-form answer alongside the decision", async () => {
    const { thread, runs } = createApprovalThread(
      toolCallResult("send_email", { id: "a1", display: "text" }),
    );

    await thread.append(userMessage("send an email"));
    await flush();

    await thread.respondToToolApproval({
      approvalId: "a1",
      approved: true,
      text: "Quarterly update",
    });
    await flush();

    const toolCall = runs[1]!
      .unstable_getMessage()
      .content.find((part) => part.type === "tool-call");
    expect(toolCall?.approval).toEqual({
      id: "a1",
      display: "text",
      approved: true,
      text: "Quarterly update",
    });
  });

  it("treats a terminal resolution as non-pending and continues the run", async () => {
    const { thread, runs } = createApprovalThread(
      toolCallResult("deploy", { id: "a1", resolution: "expired" }),
    );

    await thread.append(userMessage("deploy the app"));
    await flush();

    expect(runs).toHaveLength(2);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("rejects responses to approvals with a terminal resolution", async () => {
    const { thread } = createApprovalThread({
      content: [
        toolCallPart("deploy", { id: "a1", resolution: "expired" }),
        toolCallPart("send_email"),
      ],
      status: { type: "requires-action", reason: "tool-calls" },
    });

    await thread.append(userMessage("deploy and email"));
    await flush();

    expect(thread.messages.at(-1)?.status?.type).toBe("requires-action");
    expect(() =>
      thread.respondToToolApproval({ approvalId: "a1", approved: true }),
    ).toThrow("cancelled or expired");
  });

  it("continues multi-step turns after an approval resume", async () => {
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread({
      async run(options) {
        runs.push(options);
        if (runs.length === 1) return toolCallResult("deploy", { id: "a1" });
        if (runs.length === 2) return toolCallResult("lookup_weather");
        return { content: [{ type: "text", text: "done" }] };
      },
    });

    await thread.append(userMessage("deploy the app"));
    await flush();

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(runs).toHaveLength(3);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("resumes when a result is added to an approval-gated tool call", async () => {
    const { thread, runs } = createApprovalThread(
      toolCallResult("deploy", { id: "a1" }),
    );

    await thread.append(userMessage("deploy the app"));
    await flush();

    thread.addToolResult({
      messageId: thread.messages.at(-1)!.id,
      toolCallId: "call-deploy",
      toolName: "deploy",
      result: "done manually",
      isError: false,
    });
    await flush();

    expect(runs).toHaveLength(2);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("records a denial and synthesizes an error result", async () => {
    const { thread, runs } = createApprovalThread(
      toolCallResult("deploy", { id: "a1" }),
    );

    await thread.append(userMessage("deploy the app"));
    await flush();

    thread.respondToToolApproval({
      approvalId: "a1",
      approved: false,
      reason: "not today",
    });
    await flush();

    expect(runs).toHaveLength(2);
    const toolCall = thread.messages
      .at(-1)!
      .content.find((part) => part.type === "tool-call");
    expect(toolCall?.approval).toEqual({
      id: "a1",
      approved: false,
      reason: "not today",
    });
    expect(toolCall?.result).toEqual({ error: "not today" });
    expect(toolCall?.isError).toBe(true);
  });

  it("synthesizes a default denial reason", async () => {
    const { thread } = createApprovalThread(
      toolCallResult("deploy", { id: "a1" }),
    );

    await thread.append(userMessage("deploy the app"));
    await flush();

    thread.respondToToolApproval({ approvalId: "a1", approved: false });
    await flush();

    const toolCall = thread.messages
      .at(-1)!
      .content.find((part) => part.type === "tool-call");
    expect(toolCall?.result).toEqual({ error: "Tool approval denied" });
  });

  it("waits until every pending approval is decided before resuming", async () => {
    const { thread, runs } = createApprovalThread({
      content: [
        toolCallPart("deploy", { id: "a1" }),
        toolCallPart("send_invoice", { id: "a2" }),
      ],
      status: { type: "requires-action", reason: "tool-calls" },
    });

    await thread.append(userMessage("deploy and bill"));
    await flush();

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();
    expect(runs).toHaveLength(1);

    expect(() =>
      thread.respondToToolApproval({ approvalId: "a1", approved: false }),
    ).toThrowError(/already decided/);

    thread.respondToToolApproval({ approvalId: "a2", approved: false });
    await flush();
    expect(runs).toHaveLength(2);
  });

  it("throws while the run is still in flight, even if the message already reads requires-action", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread({
      async *run(options) {
        runs.push(options);
        if (runs.length === 1) {
          yield toolCallResult("deploy", { id: "a1" });
          await gate;
          return;
        }
        yield { content: [{ type: "text", text: "done" }] };
      },
    });

    const appendPromise = thread.append(userMessage("deploy the app"));
    await flush();

    expect(thread.messages.at(-1)?.status?.type).toBe("requires-action");
    expect(() =>
      thread.respondToToolApproval({ approvalId: "a1", approved: true }),
    ).toThrowError(/run is in progress/);

    release();
    await appendPromise;

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(runs).toHaveLength(2);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("throws for unknown approvals and unsupported tool call resumption", async () => {
    const { thread } = createApprovalThread(toolCallResult("send_email"));

    await thread.append(userMessage("send an email"));
    await flush();

    expect(() =>
      thread.respondToToolApproval({ approvalId: "nope", approved: true }),
    ).toThrowError(/non-existing tool approval/);
    expect(() =>
      thread.resumeToolCall({ toolCallId: "call-send_email", payload: {} }),
    ).toThrowError(/unstable_humanToolNames/);
  });
});

describe("LocalThreadRuntimeCore cancellation", () => {
  it("settles a superseded tool-call result without aborting its replacement", async () => {
    let resolveFirst!: (result: ChatModelRunResult) => void;
    let resolveSecond!: (result: ChatModelRunResult) => void;
    const firstResult = new Promise<ChatModelRunResult>((resolve) => {
      resolveFirst = resolve;
    });
    const secondResult = new Promise<ChatModelRunResult>((resolve) => {
      resolveSecond = resolve;
    });
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread({
      run(options) {
        runs.push(options);
        return runs.length === 1 ? firstResult : secondResult;
      },
    });

    const firstAppend = thread.append(userMessage("first"));
    await flush();
    const supersededMessageId = thread.messages.at(-1)!.id;
    const secondAppend = thread.append({
      ...userMessage("second"),
      parentId: supersededMessageId,
    });
    await flush();

    expect(runs).toHaveLength(2);
    expect(runs[0]?.abortSignal.aborted).toBe(true);
    expect(runs[1]?.abortSignal.aborted).toBe(false);

    resolveFirst(toolCallResult("lookup_weather"));
    await firstAppend;

    expect(runs).toHaveLength(2);
    expect(runs[1]?.abortSignal.aborted).toBe(false);
    expect(
      thread.messages.find((item) => item.id === supersededMessageId)?.status,
    ).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });

    resolveSecond({ content: [{ type: "text", text: "replacement" }] });
    await secondAppend;
  });

  it("cancels a superseded approval pause", async () => {
    let resolveFirst!: (result: ChatModelRunResult) => void;
    let resolveSecond!: (result: ChatModelRunResult) => void;
    const firstResult = new Promise<ChatModelRunResult>((resolve) => {
      resolveFirst = resolve;
    });
    const secondResult = new Promise<ChatModelRunResult>((resolve) => {
      resolveSecond = resolve;
    });
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread({
      run(options) {
        runs.push(options);
        return runs.length === 1 ? firstResult : secondResult;
      },
    });

    const firstAppend = thread.append(userMessage("first"));
    await flush();
    const supersededMessageId = thread.messages.at(-1)!.id;
    const secondAppend = thread.append({
      ...userMessage("second"),
      parentId: supersededMessageId,
    });
    await flush();

    resolveFirst(toolCallResult("deploy", { id: "approval-1" }));
    await firstAppend;

    expect(
      thread.messages.find((item) => item.id === supersededMessageId)?.status,
    ).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });

    resolveSecond({ content: [{ type: "text", text: "replacement" }] });
    await secondAppend;
  });

  it("ignores a stale result after addToolResult replaces the same message", async () => {
    let releaseFirst!: () => void;
    let resolveSecond!: (result: ChatModelRunResult) => void;
    const firstTeardown = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const secondResult = new Promise<ChatModelRunResult>((resolve) => {
      resolveSecond = resolve;
    });
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread({
      run(options) {
        runs.push(options);
        if (runs.length === 1) {
          return (async function* () {
            yield toolCallResult("send_email");
            await firstTeardown;
            yield toolCallResult("stale_tool");
          })();
        }
        return secondResult;
      },
    });

    const firstAppend = thread.append(userMessage("send an email"));
    await flush();
    const messageId = thread.messages.at(-1)!.id;

    thread.addToolResult({
      messageId,
      toolCallId: "call-send_email",
      toolName: "send_email",
      result: { approved: true },
      isError: false,
    });
    await flush();

    expect(runs).toHaveLength(2);
    expect(runs[1]?.abortSignal.aborted).toBe(false);

    releaseFirst();
    await firstAppend;

    const toolCall = thread.messages
      .find((item) => item.id === messageId)
      ?.content.find(
        (part): part is ToolCallMessagePart =>
          part.type === "tool-call" && part.toolCallId === "call-send_email",
      );
    expect(toolCall?.result).toEqual({ approved: true });
    expect(runs[1]?.abortSignal.aborted).toBe(false);

    resolveSecond({ content: [{ type: "text", text: "replacement" }] });
    await vi.waitFor(() => {
      const message = thread.messages.find((item) => item.id === messageId);
      if (message?.role !== "assistant")
        throw new Error("expected assistant message");
      expect(message.status.type).toBe("complete");
    });
  });

  it("ignores stale chunks after a partial tool result updates the active message", async () => {
    let releaseTeardown!: () => void;
    const teardown = new Promise<void>((resolve) => {
      releaseTeardown = resolve;
    });
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread({
      run(options) {
        runs.push(options);
        return (async function* () {
          yield {
            content: [
              toolCallPart("send_email"),
              toolCallPart("deploy", { id: "approval-1" }),
            ],
            status: {
              type: "requires-action",
              reason: "tool-calls",
            },
          } satisfies ChatModelRunResult;
          await teardown;
          yield { content: [{ type: "text", text: "stale" }] };
        })();
      },
    });

    const appendPromise = thread.append(userMessage("send and deploy"));
    await flush();
    const messageId = thread.messages.at(-1)!.id;

    thread.addToolResult({
      messageId,
      toolCallId: "call-send_email",
      toolName: "send_email",
      result: { approved: true },
      isError: false,
    });
    await flush();

    expect(runs).toHaveLength(1);

    releaseTeardown();
    await appendPromise;

    const message = thread.messages.find((item) => item.id === messageId);
    if (message?.role !== "assistant")
      throw new Error("expected assistant message");
    const sendEmail = message.content.find(
      (part): part is ToolCallMessagePart =>
        part.type === "tool-call" && part.toolCallId === "call-send_email",
    );
    const deploy = message.content.find(
      (part): part is ToolCallMessagePart =>
        part.type === "tool-call" && part.toolCallId === "call-deploy",
    );
    expect(sendEmail?.result).toEqual({ approved: true });
    expect(deploy?.approval).toEqual({ id: "approval-1" });
    expect(message.status.type).toBe("requires-action");
  });

  it("ignores stale chunks after feedback updates a paused message", async () => {
    let releaseTeardown!: () => void;
    const teardown = new Promise<void>((resolve) => {
      releaseTeardown = resolve;
    });
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread({
      run(options) {
        runs.push(options);
        return (async function* () {
          if (runs.length > 1) return;
          yield toolCallResult("send_email");
          await teardown;
          yield { content: [{ type: "text", text: "stale" }] };
        })();
      },
    });

    const appendPromise = thread.append(userMessage("send"));
    await flush();
    const messageId = thread.messages.at(-1)!.id;

    thread.submitFeedback({ messageId, type: "positive" });
    releaseTeardown();
    await appendPromise;

    expect(runs).toHaveLength(1);
    const message = thread.messages.at(-1);
    expect(message?.status?.type).toBe("requires-action");
    expect(message?.content).toEqual([toolCallPart("send_email")]);
    expect(message?.metadata.submittedFeedback).toEqual({ type: "positive" });
  });

  it("ignores a superseded result after its message is removed", async () => {
    let resolveFirst!: (result: ChatModelRunResult) => void;
    const firstResult = new Promise<ChatModelRunResult>((resolve) => {
      resolveFirst = resolve;
    });
    let runCount = 0;
    const thread = createThread({
      run() {
        runCount++;
        if (runCount === 1) return firstResult;
        return Promise.resolve({
          content: [{ type: "text", text: "replacement" }],
        });
      },
    });

    const firstAppend = thread.append(userMessage("first"));
    await flush();
    await thread.append(userMessage("second"));
    thread.reset();

    resolveFirst(toolCallResult("lookup_weather"));

    await expect(firstAppend).resolves.toBeUndefined();
    expect(thread.messages).toHaveLength(0);
  });

  it("does not continue after cancelRun when a delayed tool call resolves", async () => {
    let resolveFirst!: (result: ChatModelRunResult) => void;
    const firstResult = new Promise<ChatModelRunResult>((resolve) => {
      resolveFirst = resolve;
    });
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread({
      run(options) {
        runs.push(options);
        if (runs.length === 1) return firstResult;
        return Promise.resolve({
          content: [{ type: "text", text: "unexpected continuation" }],
          status: { type: "complete", reason: "stop" },
        });
      },
    });

    const appendPromise = thread.append(userMessage("first"));
    await flush();

    thread.cancelRun();
    resolveFirst(toolCallResult("lookup_weather"));
    await appendPromise;

    expect(runs).toHaveLength(1);
    expect(thread.messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("preserves a terminal adapter status when cancelled during teardown", async () => {
    let releaseTeardown!: () => void;
    const teardown = new Promise<void>((resolve) => {
      releaseTeardown = resolve;
    });
    const thread = createThread({
      async *run() {
        yield {
          content: [{ type: "text", text: "done" }],
          status: { type: "complete", reason: "stop" },
        };
        await teardown;
      },
    });

    const appendPromise = thread.append(userMessage("first"));
    await flush();

    expect(thread.messages.at(-1)?.status).toEqual({
      type: "complete",
      reason: "stop",
    });

    thread.cancelRun();
    releaseTeardown();
    await appendPromise;

    expect(thread.messages.at(-1)?.status).toEqual({
      type: "complete",
      reason: "stop",
    });
  });

  it("preserves an approval pause when the adapter yields after cancellation", async () => {
    let releaseTeardown!: () => void;
    const teardown = new Promise<void>((resolve) => {
      releaseTeardown = resolve;
    });
    const thread = createThread({
      async *run() {
        yield toolCallResult("deploy", { id: "approval-1" });
        await teardown;
        yield { content: [{ type: "text", text: "late" }] };
      },
    });

    const appendPromise = thread.append(userMessage("deploy"));
    await flush();

    expect(thread.messages.at(-1)?.status?.type).toBe("requires-action");

    thread.cancelRun();
    releaseTeardown();
    await appendPromise;

    expect(thread.messages.at(-1)?.status?.type).toBe("requires-action");
  });

  it("keeps a replacement run cancellable after the previous run settles", async () => {
    let releaseFirst!: () => void;
    let releaseSecond!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const signals: AbortSignal[] = [];
    const thread = createThread({
      async *run({ abortSignal }) {
        signals.push(abortSignal);
        await (signals.length === 1 ? firstGate : secondGate);
      },
    });

    const firstAppend = thread.append(userMessage("first"));
    await flush();
    const secondAppend = thread.append(userMessage("second"));
    await flush();

    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    releaseFirst();
    await firstAppend;

    thread.cancelRun();
    const replacementWasAborted = signals[1]?.aborted;

    releaseSecond();
    await secondAppend;

    expect(replacementWasAborted).toBe(true);
  });

  it("marks the message cancelled when a streaming adapter returns after abort", async () => {
    let released!: () => void;
    const streaming = new Promise<void>((resolve) => {
      released = resolve;
    });

    const thread = createThread({
      async *run({ abortSignal }) {
        yield { content: [{ type: "text", text: "partial" }] };
        await streaming;
        if (abortSignal.aborted) return;
        yield { content: [{ type: "text", text: "partial answer" }] };
      },
    });

    const appendPromise = thread.append(userMessage("hi"));
    await flush();

    thread.cancelRun();
    released();
    await appendPromise;

    expect(thread.messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("marks the message cancelled when a non-streaming adapter resolves after abort", async () => {
    let released!: () => void;
    const pending = new Promise<void>((resolve) => {
      released = resolve;
    });

    const thread = createThread({
      async run() {
        await pending;
        return { content: [{ type: "text", text: "hello" }] };
      },
    });

    const appendPromise = thread.append(userMessage("hi"));
    await flush();

    thread.cancelRun();
    released();
    await appendPromise;

    expect(thread.messages.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("keeps a completed run complete", async () => {
    const thread = createThread({
      async *run() {
        yield { content: [{ type: "text", text: "hello" }] };
      },
    });

    await thread.append(userMessage("hi"));

    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });
});

describe("LocalThreadRuntimeCore suggestions", () => {
  it("ignores suggestion generation from a superseded run", async () => {
    let releaseFirst!: () => void;
    let releaseSecond!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    let runCount = 0;
    const generate = vi.fn().mockResolvedValue([{ prompt: "follow up" }]);
    const thread = createThread(
      {
        async run() {
          runCount += 1;
          await (runCount === 1 ? firstGate : secondGate);
          return { content: [{ type: "text", text: "done" }] };
        },
      },
      { suggestion: { generate } },
    );

    const firstAppend = thread.append(userMessage("first"));
    await flush();
    const secondAppend = thread.append(userMessage("second"));
    await flush();

    releaseFirst();
    await firstAppend;
    await flush();

    expect(generate).not.toHaveBeenCalled();
    expect(thread.suggestions).toEqual([]);

    releaseSecond();
    await secondAppend;
    await flush();

    expect(generate).toHaveBeenCalledOnce();
    expect(thread.suggestions).toEqual([{ prompt: "follow up" }]);
  });

  it("cancelRun aborts pending suggestion generation", async () => {
    const generate = vi.fn().mockImplementation(
      ({ signal }: { signal?: AbortSignal }) =>
        new Promise<readonly { prompt: string }[]>((resolve) => {
          signal?.addEventListener("abort", () => {
            resolve([{ prompt: "stale" }]);
          });
        }),
    );

    const thread = createThread(
      {
        async run() {
          return { content: [{ type: "text", text: "hello" }] };
        },
      },
      { suggestion: { generate } },
    );

    const appendPromise = thread.append(userMessage("hi"));
    await appendPromise;
    await new Promise((r) => setTimeout(r, 0));

    expect(generate).toHaveBeenCalledTimes(1);
    const signal = generate.mock.calls[0]![0].signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    thread.cancelRun();
    expect(signal.aborted).toBe(true);
    expect(thread.suggestions).toEqual([]);
  });

  it("completes the run when suggestion generation rejects", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("suggestion failed"));

    const thread = createThread(
      {
        async run() {
          return { content: [{ type: "text", text: "hello" }] };
        },
      },
      { suggestion: { generate } },
    );

    await thread.append(userMessage("hi"));
    await new Promise((r) => setTimeout(r, 0));

    expect(generate).toHaveBeenCalledTimes(1);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
    expect(thread.suggestions).toEqual([]);
  });

  it("resolves append before suggestion generation completes", async () => {
    let resolveSuggestions!: (value: readonly ThreadSuggestion[]) => void;
    const suggestionsDeferred = new Promise<readonly ThreadSuggestion[]>(
      (resolve) => {
        resolveSuggestions = resolve;
      },
    );
    const generate = vi.fn().mockReturnValue(suggestionsDeferred);

    const thread = createThread(
      {
        async run() {
          return { content: [{ type: "text", text: "hello" }] };
        },
      },
      { suggestion: { generate } },
    );

    await thread.append(userMessage("hi"));
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
    expect(thread.suggestions).toEqual([]);

    await new Promise((r) => setTimeout(r, 0));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(thread.suggestions).toEqual([]);

    resolveSuggestions([
      { title: "Weather", label: "in SF", prompt: "What's the weather?" },
      { prompt: "follow up" },
    ]);
    await new Promise((r) => setTimeout(r, 0));
    expect(thread.suggestions).toEqual([
      { title: "Weather", label: "in SF", prompt: "What's the weather?" },
      { prompt: "follow up" },
    ]);
  });
});

describe("LocalThreadRuntimeCore tool approval persistence", () => {
  const createHistory = (options?: { update?: boolean }) => {
    const appended: ExportedMessageRepositoryItem[] = [];
    const updated: ExportedMessageRepositoryItem[] = [];
    const history = {
      async load() {
        return { messages: [] };
      },
      async append(item: ExportedMessageRepositoryItem) {
        appended.push(item);
      },
      ...(options?.update !== false && {
        async update(item: ExportedMessageRepositoryItem) {
          updated.push(item);
        },
      }),
    };
    return { history, appended, updated };
  };

  const createApprovalThreadWithHistory = (
    history: LocalRuntimeOptionsBase["adapters"]["history"],
  ) => {
    const runs: ChatModelRunOptions[] = [];
    return createThread(
      {
        async run(options) {
          runs.push(options);
          if (runs.length === 1)
            return toolCallResult("send_email", { id: "a1" });
          return { content: [{ type: "text", text: "done" }] };
        },
      },
      { history },
    );
  };

  it("persists a run paused for approval and rewrites it once the run finishes", async () => {
    const { history, appended, updated } = createHistory();
    const thread = createApprovalThreadWithHistory(history);

    await thread.append(userMessage("send an email"));
    await flush();

    const assistant = appended.find((i) => i.message.role === "assistant");
    expect(assistant?.message.status?.type).toBe("requires-action");

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
    expect(
      appended.filter((i) => i.message.id === assistant?.message.id),
    ).toHaveLength(1);
    expect(updated.at(-1)?.message.id).toBe(assistant?.message.id);
    expect(updated.at(-1)?.message.status?.type).toBe("complete");
  });

  it("keeps the append-only behavior for adapters without update", async () => {
    const { history, appended } = createHistory({ update: false });
    const thread = createApprovalThreadWithHistory(history);

    await thread.append(userMessage("send an email"));
    await flush();

    expect(appended.some((i) => i.message.role === "assistant")).toBe(false);

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    const assistants = appended.filter((i) => i.message.role === "assistant");
    expect(assistants).toHaveLength(1);
    expect(assistants[0]?.message.status?.type).toBe("complete");
  });

  it("rewrites a restored paused message instead of appending a duplicate", async () => {
    const { history, appended, updated } = createHistory();
    const runs: ChatModelRunOptions[] = [];
    const paused: ExportedMessageRepositoryItem = {
      parentId: null,
      message: {
        id: "restored",
        role: "assistant",
        content: [toolCallPart("send_email", { id: "a1" })],
        status: { type: "requires-action", reason: "tool-calls" },
        createdAt: new Date(),
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      },
    };
    const thread = createThread(
      {
        async run(options) {
          runs.push(options);
          return { content: [{ type: "text", text: "done" }] };
        },
      },
      {
        history: {
          ...history,
          async load() {
            return { headId: "restored", messages: [paused] };
          },
        },
      },
    );

    thread.__internal_load();
    await flush();

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(runs).toHaveLength(1);
    expect(appended).toHaveLength(0);
    expect(updated.at(-1)?.message.id).toBe("restored");
    expect(updated.at(-1)?.message.status?.type).toBe("complete");
  });

  it("still appends a restored paused message when the adapter cannot update", async () => {
    const { history, appended } = createHistory({ update: false });
    const paused: ExportedMessageRepositoryItem = {
      parentId: null,
      message: {
        id: "restored",
        role: "assistant",
        content: [toolCallPart("send_email", { id: "a1" })],
        status: { type: "requires-action", reason: "tool-calls" },
        createdAt: new Date(),
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      },
    };
    const thread = createThread(
      {
        async run() {
          return { content: [{ type: "text", text: "done" }] };
        },
      },
      {
        history: {
          ...history,
          async load() {
            return { headId: "restored", messages: [paused] };
          },
        },
      },
    );

    thread.__internal_load();
    await flush();

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(appended).toHaveLength(1);
    expect(appended[0]?.message.id).toBe("restored");
    expect(appended[0]?.message.status?.type).toBe("complete");
  });

  it("persists a partial approval decision while another tool call is still pending", async () => {
    const { history, updated } = createHistory();
    const runs: ChatModelRunOptions[] = [];
    const twoPendingApprovals: ChatModelRunResult = {
      content: [
        { ...toolCallPart("send_email", { id: "a1" }), toolCallId: "call-1" },
        { ...toolCallPart("send_email", { id: "a2" }), toolCallId: "call-2" },
      ],
      status: { type: "requires-action", reason: "tool-calls" },
    };
    const thread = createThread(
      {
        async run(options) {
          runs.push(options);
          if (runs.length === 1) return twoPendingApprovals;
          return { content: [{ type: "text", text: "done" }] };
        },
      },
      { history },
    );

    await thread.append(userMessage("send two emails"));
    await flush();

    const assistant = thread.messages.at(-1)!;
    expect(assistant.status?.type).toBe("requires-action");

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    // The second approval is still pending, so the run must not resume yet —
    // but the first decision has to survive a refresh in the meantime.
    expect(runs).toHaveLength(1);
    const persisted = updated
      .at(-1)
      ?.message.content.find(
        (c) => c.type === "tool-call" && c.toolCallId === "call-1",
      );
    expect(
      persisted?.type === "tool-call" && persisted.approval?.approved,
    ).toBe(true);
  });

  it("persists a partial tool result while another human tool call is still pending", async () => {
    const { history, updated } = createHistory();
    const runs: ChatModelRunOptions[] = [];
    const twoHumanTools: ChatModelRunResult = {
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "send_email",
          args: {},
          argsText: "{}",
        },
        {
          type: "tool-call",
          toolCallId: "call-2",
          toolName: "send_email",
          args: {},
          argsText: "{}",
        },
      ],
      status: { type: "requires-action", reason: "tool-calls" },
    };
    const thread = createThread(
      {
        async run(options) {
          runs.push(options);
          if (runs.length === 1) return twoHumanTools;
          return { content: [{ type: "text", text: "done" }] };
        },
      },
      { history },
    );

    await thread.append(userMessage("send two emails"));
    await flush();

    const assistant = thread.messages.at(-1)!;

    thread.addToolResult({
      messageId: assistant.id,
      toolName: "send_email",
      toolCallId: "call-1",
      result: { ok: true },
      isError: false,
    });
    await flush();

    expect(runs).toHaveLength(1);
    const persisted = updated
      .at(-1)
      ?.message.content.find(
        (c) => c.type === "tool-call" && c.toolCallId === "call-1",
      );
    expect(persisted?.type === "tool-call" && persisted.result).toEqual({
      ok: true,
    });
  });

  it("does not persist an existing falsy tool result again", async () => {
    const { history, updated } = createHistory();
    const twoHumanTools: ChatModelRunResult = {
      content: [
        {
          ...toolCallPart("send_email"),
          toolCallId: "call-1",
        },
        {
          ...toolCallPart("send_email"),
          toolCallId: "call-2",
        },
      ],
      status: { type: "requires-action", reason: "tool-calls" },
    };
    const thread = createThread(
      {
        async run() {
          return twoHumanTools;
        },
      },
      { history },
    );

    await thread.append(userMessage("send two emails"));
    await flush();

    const options = {
      messageId: thread.messages.at(-1)!.id,
      toolName: "send_email",
      toolCallId: "call-1",
      result: false,
      isError: false,
    };
    thread.addToolResult(options);
    await flush();
    expect(updated).toHaveLength(1);

    thread.addToolResult(options);
    await flush();
    expect(updated).toHaveLength(1);
  });

  it("persists a multi-step run once instead of writing intermediate steps", async () => {
    const { history, appended, updated } = createHistory();
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread(
      {
        async run(options) {
          runs.push(options);
          if (runs.length === 1)
            return {
              content: [
                { ...toolCallPart("lookup_weather"), result: { ok: true } },
              ],
              status: { type: "requires-action", reason: "tool-calls" },
            };
          return { content: [{ type: "text", text: "done" }] };
        },
      },
      { history },
    );

    await thread.append(userMessage("what is the weather"));
    await flush();

    expect(runs).toHaveLength(2);
    const assistants = appended.filter((i) => i.message.role === "assistant");
    expect(assistants).toHaveLength(1);
    expect(assistants[0]?.message.status?.type).toBe("complete");
    expect(updated).toHaveLength(0);
  });

  it("rewrites the same entry when a resumed run pauses again", async () => {
    const { history, appended, updated } = createHistory();
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread(
      {
        async run(options) {
          runs.push(options);
          if (runs.length === 1)
            return toolCallResult("send_email", { id: "a1" });
          if (runs.length === 2)
            return {
              content: [
                {
                  ...toolCallPart("send_email", { id: "a2" }),
                  toolCallId: "call-2",
                },
              ],
              status: { type: "requires-action", reason: "tool-calls" },
            };
          return { content: [{ type: "text", text: "done" }] };
        },
      },
      { history },
    );

    await thread.append(userMessage("send two emails"));
    await flush();

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(thread.messages.at(-1)?.status?.type).toBe("requires-action");

    thread.respondToToolApproval({ approvalId: "a2", approved: true });
    await flush();

    expect(runs).toHaveLength(3);
    const assistants = appended.filter((i) => i.message.role === "assistant");
    expect(assistants).toHaveLength(1);
    expect(assistants[0]?.message.status?.type).toBe("requires-action");
    expect(updated).toHaveLength(2);
    expect(
      updated.every((i) => i.message.id === assistants[0]?.message.id),
    ).toBe(true);
    expect(updated.at(-1)?.message.status?.type).toBe("complete");
  });

  it("finalizes the history entry when a resumed run hits max steps", async () => {
    const { history, appended, updated } = createHistory();
    const runs: ChatModelRunOptions[] = [];
    const thread = createThread(
      {
        async run(options) {
          runs.push(options);
          return {
            content: [toolCallPart("send_email", { id: "a1" })],
            status: { type: "requires-action", reason: "tool-calls" },
            metadata: { steps: [{}] },
          };
        },
      },
      { history, maxSteps: 1 },
    );

    await thread.append(userMessage("send an email"));
    await flush();

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(runs).toHaveLength(1);
    expect(thread.messages.at(-1)?.status?.type).toBe("incomplete");
    const assistants = appended.filter((i) => i.message.role === "assistant");
    expect(assistants).toHaveLength(1);
    expect(updated).toHaveLength(1);
    expect(updated.at(-1)?.message.status?.type).toBe("incomplete");
  });

  it("orders the terminal rewrite after an in-flight partial decision write", async () => {
    const order: string[] = [];
    let releasePartial!: () => void;
    const gate = new Promise<void>((resolve) => {
      releasePartial = resolve;
    });
    const history = {
      async load() {
        return { messages: [] };
      },
      async append() {},
      async update(item: ExportedMessageRepositoryItem) {
        const kind =
          item.message.status?.type === "requires-action"
            ? "partial"
            : "terminal";
        order.push(`${kind}:start`);
        if (kind === "partial") await gate;
        order.push(`${kind}:end`);
      },
    };
    const runs: ChatModelRunOptions[] = [];
    const twoPendingApprovals: ChatModelRunResult = {
      content: [
        { ...toolCallPart("send_email", { id: "a1" }), toolCallId: "call-1" },
        { ...toolCallPart("send_email", { id: "a2" }), toolCallId: "call-2" },
      ],
      status: { type: "requires-action", reason: "tool-calls" },
    };
    const thread = createThread(
      {
        async run(options) {
          runs.push(options);
          if (runs.length === 1) return twoPendingApprovals;
          return { content: [{ type: "text", text: "done" }] };
        },
      },
      { history },
    );

    await thread.append(userMessage("send two emails"));
    await flush();

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    thread.respondToToolApproval({ approvalId: "a2", approved: true });
    await flush();

    expect(order).toEqual(["partial:start"]);

    releasePartial();
    await flush();

    expect(order).toEqual([
      "partial:start",
      "partial:end",
      "terminal:start",
      "terminal:end",
    ]);
  });
});

describe("LocalThreadRuntimeCore runs", () => {
  const createPlainThread = (
    adapter: ChatModelAdapter,
    options?: { maxSteps?: number },
  ) => {
    const core = new LocalRuntimeCore(
      {
        adapters: { chatModel: adapter },
        ...(options?.maxSteps !== undefined && { maxSteps: options.maxSteps }),
      },
      undefined,
    );
    return core.threads.getMainThreadRuntimeCore();
  };

  it("appends the user message and the adapter result", async () => {
    const run = vi.fn(async (): Promise<ChatModelRunResult> => ({
      content: [{ type: "text", text: "Hello!" }],
      status: { type: "complete", reason: "stop" },
    }));
    const thread = createPlainThread({ run });

    await thread.append(userMessage("Hi"));

    expect(run).toHaveBeenCalledOnce();
    expect(thread.messages).toHaveLength(2);
    expect(thread.messages[0]?.role).toBe("user");
    const assistant = thread.messages[1]!;
    expect(assistant.role).toBe("assistant");
    expect(assistant.content).toContainEqual(
      expect.objectContaining({ type: "text", text: "Hello!" }),
    );
    expect(assistant.status).toEqual({ type: "complete", reason: "stop" });
  });

  it("streams the assistant response via an async generator", async () => {
    const thread = createPlainThread({
      async *run() {
        yield { content: [{ type: "text" as const, text: "Hel" }] };
        yield {
          content: [{ type: "text" as const, text: "Hello world" }],
          status: { type: "complete" as const, reason: "stop" as const },
        };
      },
    });

    await thread.append(userMessage("Stream test"));

    const assistant = thread.messages.at(-1)!;
    expect(assistant.content).toContainEqual(
      expect.objectContaining({ type: "text", text: "Hello world" }),
    );
    expect(assistant.status).toEqual({ type: "complete", reason: "stop" });
  });

  it("marks the message errored when the adapter rejects", async () => {
    const thread = createPlainThread({
      async run() {
        throw new Error("Model unavailable");
      },
    });

    await expect(thread.append(userMessage("Error test"))).rejects.toThrow(
      "Model unavailable",
    );

    const assistant = thread.messages.at(-1)!;
    expect(assistant.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: { code: "unknown", message: "Model unavailable" },
    });
  });

  it("does not run again after a tool result once maxSteps is reached", async () => {
    const run = vi.fn(async (): Promise<ChatModelRunResult> => ({
      content: [
        {
          type: "tool-call",
          toolCallId: "tc1",
          toolName: "myTool",
          args: {},
          argsText: "{}",
        },
      ],
      status: { type: "requires-action", reason: "tool-calls" },
      metadata: {
        steps: [{ usage: { inputTokens: 10, outputTokens: 5 } }],
      },
    }));
    const thread = createPlainThread({ run }, { maxSteps: 1 });

    await thread.append(userMessage("Tool call"));

    thread.addToolResult({
      messageId: thread.messages.at(-1)!.id,
      toolName: "myTool",
      toolCallId: "tc1",
      result: "result",
      isError: false,
    });
    await flush();

    expect(run).toHaveBeenCalledTimes(1);
    expect(thread.messages.at(-1)?.status).toMatchObject({
      type: "incomplete",
      reason: "tool-calls",
    });
  });

  it("derives capabilities from the configured adapters", () => {
    const adapter: ChatModelAdapter = {
      run: async () => ({ content: [] }),
    };
    const thread = createPlainThread(adapter);

    expect(thread.capabilities.speech).toBe(false);
    expect(thread.capabilities.dictation).toBe(false);
    expect(thread.capabilities.attachments).toBe(false);
    expect(thread.capabilities.feedback).toBe(false);

    thread.__internal_setOptions({
      adapters: {
        chatModel: adapter,
        speech: {} as any,
        dictation: {} as any,
        attachments: {} as any,
        feedback: {} as any,
      },
    });

    expect(thread.capabilities.speech).toBe(true);
    expect(thread.capabilities.dictation).toBe(true);
    expect(thread.capabilities.attachments).toBe(true);
    expect(thread.capabilities.feedback).toBe(true);

    thread.__internal_setOptions({ adapters: { chatModel: adapter } });

    expect(thread.capabilities.speech).toBe(false);
    expect(thread.capabilities.dictation).toBe(false);
    expect(thread.capabilities.attachments).toBe(false);
    expect(thread.capabilities.feedback).toBe(false);
  });

  it("loads history when the adapter arrives after the first load", async () => {
    const adapter: ChatModelAdapter = {
      run: async () => ({ content: [] }),
    };
    const thread = createPlainThread(adapter);
    const load = vi.fn<ThreadHistoryAdapter["load"]>(async () => ({
      headId: "restored",
      messages: [
        {
          parentId: null,
          message: {
            id: "restored",
            role: "user" as const,
            content: [{ type: "text" as const, text: "hello" }],
            attachments: [],
            createdAt: new Date(0),
            metadata: { custom: {} },
          },
        },
      ],
    }));

    thread.__internal_load();
    expect(load).not.toHaveBeenCalled();
    expect(thread.messages).toHaveLength(0);

    thread.__internal_setOptions({
      adapters: {
        chatModel: adapter,
        history: { load, append: async () => {} },
      },
    });
    await flush();

    expect(load).toHaveBeenCalledOnce();
    expect(thread.messages.map((message) => message.id)).toEqual(["restored"]);
  });

  it("does not load late history over a thread that already has messages", async () => {
    const adapter: ChatModelAdapter = {
      run: async () => ({ content: [] }),
    };
    const thread = createPlainThread(adapter);
    const load = vi.fn<ThreadHistoryAdapter["load"]>(async () => ({
      headId: "restored",
      messages: [
        {
          parentId: null,
          message: {
            id: "restored",
            role: "user" as const,
            content: [{ type: "text" as const, text: "hello" }],
            attachments: [],
            createdAt: new Date(0),
            metadata: { custom: {} },
          },
        },
      ],
    }));

    thread.__internal_load();
    await thread.append({ ...userMessage("typed"), startRun: false });
    expect(thread.messages).toHaveLength(1);

    thread.__internal_setOptions({
      adapters: {
        chatModel: adapter,
        history: { load, append: async () => {} },
      },
    });
    await flush();

    expect(load).not.toHaveBeenCalled();
    expect(thread.messages.map((message) => message.content)).toEqual([
      [{ type: "text", text: "typed" }],
    ]);
  });

  it("logs a rejected late history load", async () => {
    const adapter: ChatModelAdapter = {
      run: async () => ({ content: [] }),
    };
    const thread = createPlainThread(adapter);
    const error = new Error("history unavailable");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    thread.__internal_load();
    thread.__internal_setOptions({
      adapters: {
        chatModel: adapter,
        history: {
          load: async () => {
            throw error;
          },
          append: async () => {},
        },
      },
    });
    await flush();

    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] local thread history load failed:",
      error,
    );
  });
});

describe("LocalRuntimeCore composer.canCancel", () => {
  it("is true after append when the thread was created with initial messages", async () => {
    const core = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async *run({ abortSignal }) {
              await new Promise<void>((resolve) => {
                if (abortSignal.aborted) {
                  resolve();
                  return;
                }
                abortSignal.addEventListener("abort", () => resolve(), {
                  once: true,
                });
              });
            },
          },
        },
      },
      [
        {
          role: "assistant",
          content: [{ type: "text", text: "Hello" }],
          status: { type: "complete", reason: "stop" },
        },
      ],
    );
    const thread = core.threads.getMainThreadRuntimeCore();
    expect(thread.composer.canCancel).toBe(false);

    void thread.append(userMessage("Run"));
    await flush();

    expect(thread.composer.canCancel).toBe(true);
    thread.cancelRun();
  });
});

describe("LocalThreadRuntimeCore imported approvals", () => {
  const pausedOnApproval = (
    approval: { id: string } | undefined,
    extra: Record<string, unknown> = {},
  ): ThreadMessageLike[] => [
    { role: "user", content: [{ type: "text", text: "send an email" }] },
    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "call-send_email",
          toolName: "send_email",
          args: {},
          argsText: "{}",
          ...(approval !== undefined ? { approval } : {}),
          ...extra,
        },
      ],
    },
  ];

  const createImportedThread = (
    initialMessages: ThreadMessageLike[],
    history?: LocalRuntimeOptionsBase["adapters"]["history"],
  ) => {
    const runs: ChatModelRunOptions[] = [];
    const core = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run(options) {
              runs.push(options);
              return { content: [{ type: "text", text: "done" }] };
            },
          },
          ...(history !== undefined && { history }),
        },
        unstable_humanToolNames: ["send_email"],
      },
      initialMessages,
    );
    return { thread: core.threads.getMainThreadRuntimeCore(), runs };
  };

  it("resumes the run after approving an imported pending approval", async () => {
    const { thread, runs } = createImportedThread(
      pausedOnApproval({ id: "a1" }),
    );

    expect(thread.messages.at(-1)?.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(runs).toHaveLength(1);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("keeps the interrupt reason for an imported interrupted tool call", () => {
    const { thread } = createImportedThread(
      pausedOnApproval(undefined, {
        interrupt: { type: "human", payload: { question: "which one?" } },
      }),
    );

    expect(thread.messages.at(-1)?.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("resumes the run after approving an approval restored by the history adapter", async () => {
    const { thread, runs } = createImportedThread([], {
      async load() {
        return ExportedMessageRepository.fromArray(
          pausedOnApproval({ id: "a1" }),
        );
      },
      async append() {},
      async update() {},
    });

    thread.__internal_load();
    await flush();

    expect(thread.messages.at(-1)?.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(runs).toHaveLength(1);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("normalizes a serialized approval pause that lost its auto-status marker", async () => {
    const { thread, runs } = createImportedThread([]);
    thread.import(
      JSON.parse(
        JSON.stringify(
          ExportedMessageRepository.fromArray(pausedOnApproval({ id: "a1" })),
        ),
      ),
    );

    expect(thread.messages.at(-1)?.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });

    thread.respondToToolApproval({ approvalId: "a1", approved: true });
    await flush();

    expect(runs).toHaveLength(1);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("completes an imported interrupt that has nothing left to act on", () => {
    const { thread } = createImportedThread([
      { role: "user", content: [{ type: "text", text: "send an email" }] },
      {
        role: "assistant",
        status: { type: "requires-action", reason: "interrupt" },
        content: [
          {
            type: "tool-call",
            toolCallId: "call-send_email",
            toolName: "send_email",
            args: {},
            argsText: "{}",
            result: { sent: true },
          },
        ],
      } as ThreadMessageLike,
    ]);

    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("resumes the run after adding a result to an imported resultless tool call", async () => {
    const { thread, runs } = createImportedThread(pausedOnApproval(undefined));

    expect(thread.messages.at(-1)?.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });

    thread.addToolResult({
      messageId: thread.messages.at(-1)!.id,
      toolCallId: "call-send_email",
      toolName: "send_email",
      result: { sent: true },
      isError: false,
    });
    await flush();

    expect(runs).toHaveLength(1);
    expect(thread.messages.at(-1)?.status?.type).toBe("complete");
  });

  it("resumes an imported preliminary tool call and clears its marker", async () => {
    const { thread, runs } = createImportedThread([
      { role: "user", content: [{ type: "text", text: "send an email" }] },
      {
        role: "assistant",
        status: { type: "requires-action", reason: "tool-calls" },
        content: [
          {
            type: "tool-call",
            toolCallId: "call-send_email",
            toolName: "send_email",
            args: {},
            argsText: "{}",
            result: { preview: true },
            isPreliminary: true,
          },
        ],
      },
    ]);

    thread.addToolResult({
      messageId: thread.messages.at(-1)!.id,
      toolCallId: "call-send_email",
      toolName: "send_email",
      result: { sent: true },
      isError: false,
    });
    await flush();

    expect(runs).toHaveLength(1);
    const toolCall = runs[0]!
      .unstable_getMessage()
      .content.find((part) => part.type === "tool-call");
    expect(toolCall).toMatchObject({ result: { sent: true } });
    expect(toolCall?.type === "tool-call" && toolCall.isPreliminary).toBe(
      undefined,
    );
  });

  it("persists a final result for a preliminary tool call that remains paused", async () => {
    const updated: ExportedMessageRepositoryItem[] = [];
    const { thread } = createImportedThread(
      [
        { role: "user", content: [{ type: "text", text: "send an email" }] },
        {
          role: "assistant",
          status: { type: "requires-action", reason: "tool-calls" },
          content: [
            {
              type: "tool-call",
              toolCallId: "call-send_email",
              toolName: "send_email",
              args: {},
              argsText: "{}",
              result: { preview: true },
              isPreliminary: true,
            },
            {
              type: "tool-call",
              toolCallId: "call-other",
              toolName: "send_email",
              args: {},
              argsText: "{}",
            },
          ],
        },
      ],
      {
        async load() {
          return { messages: [] };
        },
        async append() {},
        async update(item) {
          updated.push(item);
        },
      },
    );

    thread.addToolResult({
      messageId: thread.messages.at(-1)!.id,
      toolCallId: "call-send_email",
      toolName: "send_email",
      result: { sent: true },
      isError: false,
    });
    await flush();

    expect(updated).toHaveLength(1);
    const toolCall = updated[0]!.message.content.find(
      (part) => part.type === "tool-call",
    );
    expect(toolCall).toMatchObject({ result: { sent: true } });
    expect(toolCall?.type === "tool-call" && toolCall.isPreliminary).toBe(
      undefined,
    );
  });
});

describe("LocalThreadRuntimeCore message queue", () => {
  const createQueuedThread = () => {
    const dispatched: string[] = [];
    let release!: () => void;
    let gate = new Promise<void>((resolve) => (release = resolve));

    const core = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: {
            async run(options) {
              const last = options.messages.at(-1);
              const text = last?.content
                .filter((part) => part.type === "text")
                .map((part) => (part as { text: string }).text)
                .join("");
              dispatched.push(text ?? "");
              await gate;
              return { content: [{ type: "text", text: "ok" }] };
            },
          },
        },
        unstable_enableMessageQueue: true,
      },
      undefined,
    );

    // the in-flight run already awaits the current gate, so the next gate has
    // to be installed before releasing it or the run dispatched next resolves
    // against an already-settled promise
    const releaseRun = async () => {
      const releaseCurrent = release;
      gate = new Promise<void>((resolve) => (release = resolve));
      releaseCurrent();
      await flush();
    };

    return {
      thread: core.threads.getMainThreadRuntimeCore(),
      dispatched,
      releaseRun,
    };
  };

  it("keeps the steer lane for implicit sends during back-to-back queued runs", async () => {
    const { thread, dispatched, releaseRun } = createQueuedThread();
    // the queue lane is only taken for a message appended onto the tail
    const appendToTail = (text: string, steer?: boolean) =>
      void thread.append({
        ...userMessage(text),
        parentId: thread.messages.at(-1)?.id ?? null,
        ...(steer !== undefined && { steer }),
      });

    appendToTail("first");
    await flush();
    expect(dispatched).toEqual(["first"]);

    // buffers behind the running dispatch, so releasing "first" dispatches it
    appendToTail("second", false);
    await flush();
    await releaseRun();
    expect(dispatched).toEqual(["first", "second"]);

    // "second" is a queue-dispatched run in flight, so an implicit send steers
    // ahead of a bulk item even though it is appended after it
    appendToTail("bulk", false);
    appendToTail("implicit");
    await flush();
    await releaseRun();

    expect(dispatched).toEqual(["first", "second", "implicit"]);

    await releaseRun();
    expect(dispatched).toEqual(["first", "second", "implicit", "bulk"]);
    await releaseRun();
  });
});
