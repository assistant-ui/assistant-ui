import { describe, expect, it, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type {
  AppendMessage,
  ExportedMessageRepositoryItem,
  ThreadHistoryAdapter,
} from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

type Subscriber = Record<
  string,
  ((payload: { event: unknown }) => void) | undefined
>;

function emit(subscriber: Subscriber, event: Record<string, unknown>) {
  const name = `on${event.type
    ?.toString()
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join("")}Event`;
  subscriber[name]?.({ event });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const userMessage = {
  parentId: null,
  role: "user",
  content: [{ type: "text", text: "order item 7" }],
} as unknown as AppendMessage;

function storedHistory(): ThreadHistoryAdapter {
  const rows = new Map<string, ExportedMessageRepositoryItem>();
  const write = async (item: ExportedMessageRepositoryItem) => {
    rows.set(item.message.id, item);
  };
  return {
    load: async () => ({
      headId: [...rows.keys()].at(-1) ?? null,
      messages: [...rows.values()],
    }),
    append: write,
    update: write,
  };
}

function createController(
  history: ThreadHistoryAdapter,
  resumeWithResult: boolean,
) {
  const runAgent = vi.fn(
    async (input: { runId: string }, subscriber: Subscriber) => {
      if (runAgent.mock.calls.length === 1) {
        emit(subscriber, {
          type: "TOOL_CALL_START",
          toolCallId: "call-1",
          toolCallName: "place_order",
          parentMessageId: "assistant-1",
        });
        emit(subscriber, { type: "TOOL_CALL_END", toolCallId: "call-1" });
        emit(subscriber, {
          type: "RUN_FINISHED",
          runId: input.runId,
          outcome: {
            type: "interrupt",
            interrupts: [
              {
                id: "int-1",
                reason: "tool_call",
                toolCallId: "call-1",
                message: "Approve?",
              },
            ],
          },
        });
        return;
      }
      if (resumeWithResult) {
        emit(subscriber, {
          type: "TOOL_CALL_RESULT",
          messageId: "tool-1",
          toolCallId: "call-1",
          role: "tool",
          content: '"order placed"',
        });
      }
      emit(subscriber, {
        type: "TEXT_MESSAGE_START",
        messageId: "assistant-2",
        role: "assistant",
      });
      emit(subscriber, {
        type: "TEXT_MESSAGE_CONTENT",
        messageId: "assistant-2",
        delta: "Done.",
      });
      emit(subscriber, { type: "TEXT_MESSAGE_END", messageId: "assistant-2" });
      emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
    },
  );
  const core = new AgUiThreadController({
    agent: { runAgent, abortRun: vi.fn() } as unknown as AbstractAgent,
    history,
    logger: makeLogger(),
    showThinking: false,
  });
  return { core, runAgent };
}

describe("AgUiThreadController answered interrupt history", () => {
  it.each([
    { status: "resolved" as const, resumeWithResult: true },
    { status: "cancelled" as const, resumeWithResult: false },
  ])(
    "keeps a $status interrupt answered after a reload",
    async ({ status, resumeWithResult }) => {
      const history = storedHistory();
      const { core, runAgent } = createController(history, resumeWithResult);
      await core.append(userMessage);
      await flush();
      await core.submitInterruptResponses([{ interruptId: "int-1", status }]);
      await flush();

      const reloaded = createController(history, false).core;
      await reloaded.__internal_load();

      expect(runAgent).toHaveBeenCalledTimes(2);
      expect(reloaded.getPendingInterrupts()).toBeNull();
      expect(
        reloaded.getMessages().find(({ id }) => id === "assistant-1"),
      ).toMatchObject({
        status: { type: "complete" },
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            ...(resumeWithResult ? { result: "order placed" } : {}),
          },
        ],
      });
    },
  );
});
