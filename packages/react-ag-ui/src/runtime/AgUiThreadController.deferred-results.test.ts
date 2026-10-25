import { describe, expect, it, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type {
  AppendMessage,
  ThreadAssistantMessage,
  ThreadMessage,
} from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

type Subscriber = {
  onTextMessageStartEvent?: (payload: { event: unknown }) => void;
  onTextMessageEndEvent?: (payload: { event: unknown }) => void;
  onToolCallStartEvent?: (payload: { event: unknown }) => void;
  onToolCallEndEvent?: (payload: { event: unknown }) => void;
  onRunFinishedEvent?: (payload: { event: unknown }) => void;
};

const userMessage = {
  parentId: null,
  role: "user",
  content: [{ type: "text", text: "look up both" }],
} as unknown as AppendMessage;

function openToolTurn() {
  let release!: () => void;
  const transportClosed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const runAgent = vi.fn(
    async (
      input: { runId: string; messages: unknown[] },
      subscriber: Subscriber,
    ) => {
      if (runAgent.mock.calls.length !== 1) {
        subscriber.onRunFinishedEvent?.({
          event: { type: "RUN_FINISHED", runId: input.runId },
        });
        return;
      }
      for (const [messageId, toolCallId] of [
        ["assistant-a", "tool-a"],
        ["assistant-b", "tool-b"],
      ]) {
        subscriber.onTextMessageStartEvent?.({
          event: { type: "TEXT_MESSAGE_START", messageId },
        });
        subscriber.onTextMessageEndEvent?.({
          event: { type: "TEXT_MESSAGE_END", messageId },
        });
        subscriber.onToolCallStartEvent?.({
          event: {
            type: "TOOL_CALL_START",
            toolCallId,
            toolCallName: "lookup",
          },
        });
        subscriber.onToolCallEndEvent?.({
          event: { type: "TOOL_CALL_END", toolCallId },
        });
      }
      subscriber.onRunFinishedEvent?.({
        event: { type: "RUN_FINISHED", runId: input.runId },
      });
      await transportClosed;
    },
  );
  const core = new AgUiThreadController({
    agent: { runAgent, abortRun: vi.fn() } as unknown as AbstractAgent,
    logger: makeLogger(),
    showThinking: false,
  });
  return { core, runAgent, release };
}

function addResult(
  core: AgUiThreadController,
  messageId: string,
  toolCallId: string,
) {
  core.addToolResult({
    messageId,
    toolCallId,
    toolName: "lookup",
    result: `${toolCallId}-result`,
    isError: false,
  });
}

function withResolvedResults(
  messages: readonly ThreadMessage[],
  results: Readonly<Record<string, string>>,
): ThreadMessage[] {
  return messages.map((message) => {
    if (message.role !== "assistant") return message;
    return {
      ...message,
      content: message.content.map((part) => {
        if (part.type !== "tool-call") return part;
        const result = results[part.toolCallId];
        return result === undefined
          ? part
          : { ...part, result, isError: false };
      }),
    };
  });
}

function toolCallResults(core: AgUiThreadController) {
  return core
    .getMessages()
    .flatMap((message) =>
      message.role !== "assistant"
        ? []
        : message.content.flatMap((part) =>
            part.type === "tool-call"
              ? [{ toolCallId: part.toolCallId, result: part.result }]
              : [],
          ),
    );
}

describe("AgUiThreadController deferred tool results", () => {
  it.each([
    {
      snapshot: "stale",
      snapshotResults: undefined,
      expectedResults: {
        "tool-a": "tool-a-result",
        "tool-b": "tool-b-result",
      },
    },
    {
      snapshot: "fresh resolved",
      snapshotResults: {
        "tool-a": "fresh tool-a result",
        "tool-b": "fresh tool-b result",
      },
      expectedResults: {
        "tool-a": "fresh tool-a result",
        "tool-b": "fresh tool-b result",
      },
    },
  ])(
    "preserves result authority when applying a same-parent $snapshot snapshot",
    async ({ snapshotResults, expectedResults }) => {
      const { core, runAgent, release } = openToolTurn();
      const firstRun = core.append(userMessage);

      try {
        const captured = core.getMessages();
        const externalSnapshot = snapshotResults
          ? withResolvedResults(captured, snapshotResults)
          : captured;

        addResult(core, "assistant-a", "tool-a");
        addResult(core, "assistant-b", "tool-b");
        expect(core.getPendingToolCalls()).toBeNull();
        expect(runAgent).toHaveBeenCalledOnce();

        core.applyExternalMessages(externalSnapshot);

        expect(toolCallResults(core)).toEqual([
          { toolCallId: "tool-a", result: expectedResults["tool-a"] },
          { toolCallId: "tool-b", result: expectedResults["tool-b"] },
        ]);
        expect(runAgent).toHaveBeenCalledOnce();
      } finally {
        release();
        await firstRun;
      }

      await vi.waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));
      expect(runAgent).toHaveBeenCalledTimes(2);

      const wireMessages = runAgent.mock.calls[1]?.[0].messages ?? [];
      const wireToolResults = wireMessages.filter(
        (message) =>
          typeof message === "object" &&
          message !== null &&
          "role" in message &&
          message.role === "tool",
      );
      expect(wireToolResults).toHaveLength(2);
      expect(wireToolResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            toolCallId: "tool-a",
            content: expectedResults["tool-a"],
          }),
          expect.objectContaining({
            toolCallId: "tool-b",
            content: expectedResults["tool-b"],
          }),
        ]),
      );
    },
  );

  it("continues a surviving owner after a snapshot removes another pending tool", async () => {
    const { core, runAgent, release } = openToolTurn();
    const firstRun = core.append(userMessage);
    expect(core.getPendingToolCalls()?.toolCallIds).toEqual([
      "tool-a",
      "tool-b",
    ]);

    addResult(core, "assistant-a", "tool-a");
    const retained = core
      .getMessages()
      .filter((message) => message.id !== "assistant-b");
    core.applyExternalMessages(retained);
    release();
    await firstRun;
    await vi.waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));

    const messages = core.getMessages();
    expect(
      messages.find((message) => message.id === "assistant-b"),
    ).toBeUndefined();
    expect(
      (
        messages.find(
          (message) => message.id === "assistant-a",
        ) as ThreadAssistantMessage
      ).content,
    ).toContainEqual(
      expect.objectContaining({
        toolCallId: "tool-a",
        result: "tool-a-result",
      }),
    );
    expect(runAgent.mock.calls[1]?.[0].messages).toContainEqual(
      expect.objectContaining({ id: "assistant-a" }),
    );
    expect(runAgent.mock.calls[1]?.[0].messages).toContainEqual(
      expect.objectContaining({
        role: "tool",
        toolCallId: "tool-a",
        content: "tool-a-result",
      }),
    );
  });

  it("keeps a second result owner when a snapshot removes the first", async () => {
    const { core, runAgent, release } = openToolTurn();
    const firstRun = core.append(userMessage);
    addResult(core, "assistant-a", "tool-a");
    addResult(core, "assistant-b", "tool-b");
    const [user, , second] = core.getMessages();
    core.applyExternalMessages([user!, second!] as ThreadMessage[]);
    release();
    await firstRun;
    await vi.waitFor(() => expect(runAgent).toHaveBeenCalledTimes(2));

    expect(
      core.getMessages().some((message) => message.id === "assistant-a"),
    ).toBe(false);
    expect(
      (
        core
          .getMessages()
          .find(
            (message) => message.id === "assistant-b",
          ) as ThreadAssistantMessage
      ).content,
    ).toContainEqual(
      expect.objectContaining({
        toolCallId: "tool-b",
        result: "tool-b-result",
      }),
    );
    expect(runAgent.mock.calls[1]?.[0].messages).toContainEqual(
      expect.objectContaining({ id: "assistant-b" }),
    );
    expect(runAgent.mock.calls[1]?.[0].messages).toContainEqual(
      expect.objectContaining({
        role: "tool",
        toolCallId: "tool-b",
        content: "tool-b-result",
      }),
    );
  });

  it("does not continue when a snapshot removes every result owner", async () => {
    const { core, runAgent, release } = openToolTurn();
    const firstRun = core.append(userMessage);
    addResult(core, "assistant-a", "tool-a");
    core.applyExternalMessages(core.getMessages().slice(0, 1));
    release();
    await firstRun;
    expect(runAgent).toHaveBeenCalledOnce();
  });

  it("waits when a different tool in the turn is still pending", async () => {
    const { core, runAgent, release } = openToolTurn();
    const firstRun = core.append(userMessage);
    addResult(core, "assistant-a", "tool-a");
    release();
    await firstRun;

    expect(core.getPendingToolCalls()?.toolCallIds).toEqual(["tool-b"]);
    expect(runAgent).toHaveBeenCalledOnce();
  });

  it("does not continue a deferred result past a later interrupt", async () => {
    const { core, runAgent, release } = openToolTurn();
    const firstRun = core.append(userMessage);
    addResult(core, "assistant-a", "tool-a");
    const [user, first, second] = core.getMessages();
    const interrupted = {
      ...second!,
      status: {
        type: "requires-action" as const,
        reason: "interrupt" as const,
      },
      metadata: {
        ...second!.metadata,
        custom: {
          ...second!.metadata.custom,
          agui: {
            interrupts: [
              { id: "gate", reason: "tool_call", toolCallId: "tool-b" },
            ],
          },
        },
      },
    } as ThreadAssistantMessage;
    core.applyExternalMessages([user!, first!, interrupted]);
    release();
    await firstRun;

    expect(core.getPendingInterrupts()?.interrupts).toContainEqual(
      expect.objectContaining({ id: "gate" }),
    );
    expect(runAgent).toHaveBeenCalledOnce();
  });
});
