import { describe, expect, it, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type {
  AppendMessage,
  ExportedMessageRepositoryItem,
  ThreadAssistantMessage,
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

function storedHistory(heldAppendId?: string) {
  const rows: ExportedMessageRepositoryItem[] = [];
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const write = async (item: ExportedMessageRepositoryItem) => {
    const index = rows.findIndex(
      ({ message }) => message.id === item.message.id,
    );
    if (index < 0) throw new Error(`Missing history row ${item.message.id}`);
    rows[index] = item;
  };
  const history: ThreadHistoryAdapter = {
    load: async () => ({
      headId: rows.at(-1)?.message.id ?? null,
      messages: [...rows],
    }),
    append: async (item) => {
      if (item.message.id === heldAppendId) await held;
      rows.push(item);
    },
    update: write,
  };
  return { history, release, rows };
}

function createController(
  history: ThreadHistoryAdapter,
  resumeWithResult: boolean,
  startsWithResume = false,
) {
  const runAgent = vi.fn(
    async (input: { runId: string }, subscriber: Subscriber) => {
      if (runAgent.mock.calls.length === 1 && !startsWithResume) {
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
  it("persists a loaded pending tool call after its result completes it", async () => {
    const { history, rows } = storedHistory();
    const pending: ThreadAssistantMessage = {
      id: "assistant-1",
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "place_order",
          args: {},
          argsText: "{}",
        },
      ],
      status: { type: "requires-action", reason: "tool-calls" },
      createdAt: new Date(0),
      metadata: {
        custom: {},
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
      },
    };
    await history.append({ parentId: null, message: pending });

    const agent = {
      runAgent: vi.fn(
        async (input: { runId: string }, subscriber: Subscriber) => {
          emit(subscriber, { type: "RUN_FINISHED", runId: input.runId });
        },
      ),
      abortRun: vi.fn(),
    } as unknown as AbstractAgent;
    const core = new AgUiThreadController({
      agent,
      history,
      logger: makeLogger(),
      showThinking: false,
    });
    await core.__internal_load();
    core.addToolResult({
      messageId: "assistant-1",
      toolCallId: "call-1",
      toolName: "place_order",
      result: "order placed",
      isError: false,
    });
    await flush();

    expect(core.getMessages()[0]).toMatchObject({
      status: { type: "complete" },
      content: [{ toolCallId: "call-1", result: "order placed" }],
    });

    const reloaded = new AgUiThreadController({
      agent,
      history,
      logger: makeLogger(),
      showThinking: false,
    });
    await reloaded.__internal_load();

    const storedAssistant = rows.filter(
      ({ message }) => message.id === "assistant-1",
    );
    expect(storedAssistant).toHaveLength(1);
    expect(storedAssistant[0]?.message).toMatchObject({
      status: { type: "complete" },
      content: [{ toolCallId: "call-1", result: "order placed" }],
    });
    expect(reloaded.getMessages()[0]).toMatchObject({
      status: { type: "complete" },
      content: [{ toolCallId: "call-1", result: "order placed" }],
    });
  });

  it("updates one stored interrupt when it is answered after a reload", async () => {
    const { history, rows } = storedHistory();
    const first = createController(history, false).core;
    await first.append(userMessage);
    await flush();

    const second = createController(history, true, true).core;
    await second.__internal_load();
    await second.submitInterruptResponses([
      { interruptId: "int-1", status: "resolved" },
    ]);
    await flush();

    const third = createController(history, false).core;
    await third.__internal_load();

    expect(
      rows.filter(({ message }) => message.id === "assistant-1"),
    ).toHaveLength(1);
    expect(
      third.getMessages().find(({ id }) => id === "assistant-1"),
    ).toMatchObject({
      status: { type: "complete" },
      content: [{ toolCallId: "call-1", result: "order placed" }],
    });
  });

  it.each([
    { status: "resolved" as const, resumeWithResult: true, append: "settled" },
    {
      status: "cancelled" as const,
      resumeWithResult: false,
      append: "settled",
    },
    { status: "resolved" as const, resumeWithResult: true, append: "pending" },
    {
      status: "cancelled" as const,
      resumeWithResult: false,
      append: "pending",
    },
  ])(
    "keeps a $status interrupt answered after a reload when the first append is $append",
    async ({ status, resumeWithResult, append }) => {
      const { history, release } = storedHistory(
        append === "pending" ? "assistant-1" : undefined,
      );
      const { core, runAgent } = createController(history, resumeWithResult);
      await core.append(userMessage);
      await flush();
      await core.submitInterruptResponses([{ interruptId: "int-1", status }]);
      release();
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
