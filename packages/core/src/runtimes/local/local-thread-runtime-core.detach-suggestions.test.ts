import { describe, expect, it, vi } from "vitest";
import { LocalRuntimeCore } from "./local-runtime-core";
import type {
  ChatModelAdapter,
  ChatModelRunResult,
} from "../../runtime/utils/chat-model-adapter";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { AppendMessage } from "../../types/message";

const userMessage: AppendMessage = {
  parentId: null,
  sourceId: null,
  runConfig: {},
  role: "user",
  content: [{ type: "text", text: "start" }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(0),
};

const createThread = (chatModel: ChatModelAdapter) => {
  const appendHistory = vi.fn<ThreadHistoryAdapter["append"]>(async () => {});
  const generate = vi.fn(async () => []);
  const thread = new LocalRuntimeCore(
    {
      adapters: {
        chatModel,
        history: {
          load: async () => ({ messages: [] }),
          append: appendHistory,
        },
        suggestion: { generate },
      },
    },
    undefined,
  ).threads.getMainThreadRuntimeCore();
  return { thread, appendHistory, generate };
};

describe("LocalThreadRuntimeCore detached suggestions", () => {
  it.each([
    { action: "detach", suggestionCalls: 0 },
    { action: "cancelRun", suggestionCalls: 1 },
  ] as const)(
    "preserves cancelled history after $action",
    async ({ action, suggestionCalls }) => {
      const { thread, appendHistory, generate } = createThread({
        async *run({ abortSignal }) {
          yield { content: [{ type: "text", text: "partial answer" }] };
          await new Promise<void>((_, reject) => {
            abortSignal.addEventListener(
              "abort",
              () => reject(abortSignal.reason),
              { once: true },
            );
          });
        },
      });
      await thread.__internal_load();
      const append = thread.append(userMessage);
      await vi.waitFor(() =>
        expect(thread.messages.at(-1)?.content).toEqual([
          { type: "text", text: "partial answer" },
        ]),
      );
      thread[action]();
      await append;

      expect(appendHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            role: "assistant",
            content: [{ type: "text", text: "partial answer" }],
            status: { type: "incomplete", reason: "cancelled" },
          }),
        }),
      );
      expect(generate).toHaveBeenCalledTimes(suggestionCalls);
    },
  );

  it("preserves a late non-streaming answer without starting detached suggestions", async () => {
    let finishRun!: (result: ChatModelRunResult) => void;
    const run = vi.fn(
      () =>
        new Promise<ChatModelRunResult>((resolve) => {
          finishRun = resolve;
        }),
    );
    const { thread, appendHistory, generate } = createThread({ run });
    await thread.__internal_load();
    const append = thread.append(userMessage);
    await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
    thread.detach();
    finishRun({ content: [{ type: "text", text: "late answer" }] });
    await append;

    expect(appendHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          role: "assistant",
          content: [{ type: "text", text: "late answer" }],
          status: { type: "incomplete", reason: "cancelled" },
        }),
      }),
    );
    expect(generate).not.toHaveBeenCalled();
  });
});
