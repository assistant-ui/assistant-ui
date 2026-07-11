import { describe, expect, it, vi } from "vitest";
import { LocalRuntimeCore } from "./local-runtime-core";
import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
} from "../../runtime/utils/chat-model-adapter";
import type { AppendMessage } from "../../types/message";
import type { LocalRuntimeOptionsBase } from "./local-runtime-options";

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

const createThread = (
  adapter: ChatModelAdapter,
  options?: {
    suggestion?: LocalRuntimeOptionsBase["adapters"]["suggestion"];
  },
) => {
  const core = new LocalRuntimeCore(
    {
      adapters: {
        chatModel: adapter,
        ...(options?.suggestion !== undefined && {
          suggestion: options.suggestion,
        }),
      },
      unstable_humanToolNames: ["send_email"],
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
  approval?: { id: string; resolution?: "cancelled" | "expired" },
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
  approval?: { id: string; resolution?: "cancelled" | "expired" },
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
});

describe("LocalThreadRuntimeCore tool approvals", () => {
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

describe("LocalThreadRuntimeCore suggestions", () => {
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
    await flush();

    expect(generate).toHaveBeenCalledTimes(1);
    const signal = generate.mock.calls[0]![0].signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    thread.cancelRun();
    expect(signal.aborted).toBe(true);

    await appendPromise;
    expect(thread.suggestions).toEqual([]);
  });
});
