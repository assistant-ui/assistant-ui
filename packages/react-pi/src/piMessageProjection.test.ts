import { describe, expect, it } from "vitest";
import {
  projectPiThreadMessages,
  type PiProjectionInput,
} from "./piMessageProjection";
import type {
  PiAgentMessage,
  PiAssistantMessage,
  PiHostUiRequest,
  PiToolCall,
} from "./piTypes";

const assistant = (
  content: PiAssistantMessage["content"],
  overrides: Partial<PiAssistantMessage> = {},
): PiAssistantMessage => ({
  role: "assistant",
  content,
  api: "anthropic-messages",
  provider: "anthropic",
  model: "claude",
  usage: {
    input: 10,
    output: 20,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 30,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  },
  stopReason: "stop",
  timestamp: 100,
  ...overrides,
});

const toolCall = (id: string, name: string, args: object): PiToolCall => ({
  type: "toolCall",
  id,
  name,
  arguments: args as Record<string, unknown>,
});

const input = (
  messages: PiAgentMessage[],
  extra: Partial<PiProjectionInput> = {},
): PiProjectionInput => ({
  messages,
  toolExecutions: {},
  runStatus: "idle",
  hostUiRequests: [],
  ...extra,
});

const contentParts = (m: { content: unknown }) =>
  m.content as ReadonlyArray<Record<string, unknown>>;

describe("piMessageProjection", () => {
  it("projects a user text message", () => {
    const out = projectPiThreadMessages(
      input([{ role: "user", content: "hello", timestamp: 1 }]),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.role).toBe("user");
    expect(out[0]!.content).toEqual([{ type: "text", text: "hello" }]);
  });

  it("projects user image content as a data URL", () => {
    const out = projectPiThreadMessages(
      input([
        {
          role: "user",
          content: [{ type: "image", data: "abc", mimeType: "image/png" }],
          timestamp: 1,
        },
      ]),
    );
    expect(contentParts(out[0]!)[0]).toEqual({
      type: "image",
      image: "data:image/png;base64,abc",
    });
  });

  it("projects assistant text vs thinking vs tool-call distinctly with parentId", () => {
    const out = projectPiThreadMessages(
      input([
        assistant([
          { type: "thinking", thinking: "let me think" },
          { type: "text", text: "the answer" },
          toolCall("tc1", "bash", { command: "ls" }),
        ]),
      ]),
    );
    expect(out).toHaveLength(1);
    const parts = contentParts(out[0]!);
    expect(parts[0]).toMatchObject({ type: "reasoning", text: "let me think" });
    expect(parts[1]).toMatchObject({ type: "text", text: "the answer" });
    expect(parts[2]).toMatchObject({ type: "tool-call", toolName: "bash" });
    // all parts grouped under the same turn step
    expect(parts[0]!.parentId).toBe("pi-step:0");
    expect(parts[1]!.parentId).toBe("pi-step:0");
    expect(parts[2]!.parentId).toBe("pi-step:0");
    // step recorded with usage
    expect(out[0]!.metadata?.steps).toEqual([
      { messageId: "pi-step:0", usage: { inputTokens: 10, outputTokens: 20 } },
    ]);
  });

  it("renders redacted thinking with an affordance", () => {
    const out = projectPiThreadMessages(
      input([assistant([{ type: "thinking", thinking: "", redacted: true }])]),
    );
    expect(contentParts(out[0]!)[0]).toMatchObject({
      type: "reasoning",
      text: "[reasoning redacted]",
    });
  });

  it("pairs a tool result into the tool-call by toolCallId", () => {
    const out = projectPiThreadMessages(
      input([
        assistant([toolCall("tc1", "bash", { command: "ls" })]),
        {
          role: "toolResult",
          toolCallId: "tc1",
          toolName: "bash",
          content: [{ type: "text", text: "file1\nfile2" }],
          isError: false,
          timestamp: 2,
        },
      ]),
    );
    // merged into one assistant message
    expect(out).toHaveLength(1);
    const part = contentParts(out[0]!)[0]!;
    expect(part).toMatchObject({
      type: "tool-call",
      toolCallId: "tc1",
      result: "file1\nfile2",
    });
  });

  it("pairs out-of-order parallel tool results by id", () => {
    const out = projectPiThreadMessages(
      input([
        assistant([toolCall("a", "bash", {}), toolCall("b", "read", {})]),
        {
          role: "toolResult",
          toolCallId: "b",
          toolName: "read",
          content: [{ type: "text", text: "B" }],
          isError: false,
          timestamp: 2,
        },
        {
          role: "toolResult",
          toolCallId: "a",
          toolName: "bash",
          content: [{ type: "text", text: "A" }],
          isError: true,
          timestamp: 3,
        },
      ]),
    );
    const parts = contentParts(out[0]!);
    expect(parts[0]).toMatchObject({
      toolCallId: "a",
      result: "A",
      isError: true,
    });
    expect(parts[1]).toMatchObject({ toolCallId: "b", result: "B" });
  });

  it("fills tool result from live streaming output before the result message lands", () => {
    const out = projectPiThreadMessages(
      input([assistant([toolCall("tc1", "bash", {})])], {
        toolExecutions: {
          tc1: {
            toolCallId: "tc1",
            status: "running",
            partialResult: { content: [{ type: "text", text: "partial..." }] },
          },
        },
        runStatus: "running",
      }),
    );
    expect(contentParts(out[0]!)[0]).toMatchObject({
      toolCallId: "tc1",
      result: "partial...",
    });
  });

  it("merges multiple assistant turns into one message with a step each", () => {
    const out = projectPiThreadMessages(
      input([
        assistant([toolCall("tc1", "bash", {})]),
        {
          role: "toolResult",
          toolCallId: "tc1",
          toolName: "bash",
          content: [{ type: "text", text: "ok" }],
          isError: false,
          timestamp: 2,
        },
        assistant([{ type: "text", text: "done" }], { timestamp: 200 }),
      ]),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.metadata?.steps).toHaveLength(2);
    const parts = contentParts(out[0]!);
    expect(parts[0]!.parentId).toBe("pi-step:0"); // tool-call from turn 1
    expect(parts[1]).toMatchObject({
      type: "text",
      text: "done",
      parentId: "pi-step:2",
    });
  });

  it("breaks the assistant group on a user message", () => {
    const out = projectPiThreadMessages(
      input([
        assistant([{ type: "text", text: "a1" }]),
        { role: "user", content: "u2", timestamp: 5 },
        assistant([{ type: "text", text: "a2" }], { timestamp: 6 }),
      ]),
    );
    expect(out.map((m) => m.role)).toEqual(["assistant", "user", "assistant"]);
  });

  it("projects non-LLM roles to data parts", () => {
    const out = projectPiThreadMessages(
      input([
        {
          role: "bashExecution",
          command: "ls",
          output: "x",
          exitCode: 0,
          cancelled: false,
          truncated: false,
          timestamp: 1,
        },
        {
          role: "branchSummary",
          summary: "branched",
          fromId: "e1",
          timestamp: 2,
        },
        {
          role: "compactionSummary",
          summary: "compacted",
          tokensBefore: 1000,
          timestamp: 3,
        },
      ]),
    );
    expect(contentParts(out[0]!)[0]).toMatchObject({
      type: "data",
      name: "pi-bash-execution",
      data: { command: "ls", exitCode: 0 },
    });
    expect(contentParts(out[1]!)[0]).toMatchObject({
      name: "pi-branch-summary",
    });
    expect(contentParts(out[2]!)[0]).toMatchObject({
      name: "pi-compaction-summary",
      data: { tokensBefore: 1000 },
    });
  });

  it("renders display:true custom messages and hides display:false", () => {
    const out = projectPiThreadMessages(
      input([
        {
          role: "custom",
          customType: "note",
          content: "visible note",
          display: true,
          timestamp: 1,
        },
        {
          role: "custom",
          customType: "hidden",
          content: "secret",
          display: false,
          timestamp: 2,
        },
      ]),
    );
    expect(out).toHaveLength(1);
    const parts = contentParts(out[0]!);
    expect(parts[0]).toMatchObject({ type: "data", name: "pi-custom-message" });
    expect(parts[1]).toMatchObject({ type: "text", text: "visible note" });
  });

  it("projects unknown roles to a pi-unsupported-message data part", () => {
    const out = projectPiThreadMessages(
      input([{ role: "futuristic_role", foo: "bar" } as PiAgentMessage]),
    );
    expect(contentParts(out[0]!)[0]).toMatchObject({
      type: "data",
      name: "pi-unsupported-message",
      data: { role: "futuristic_role" },
    });
  });

  it("sets running status on the trailing assistant message while running", () => {
    const out = projectPiThreadMessages(
      input([assistant([{ type: "text", text: "typing" }])], {
        runStatus: "running",
      }),
    );
    expect(out[0]!.status).toEqual({ type: "running" });
  });

  it("maps stop reasons to status + carries error metadata", () => {
    const err = projectPiThreadMessages(
      input([
        assistant([{ type: "text", text: "" }], {
          stopReason: "error",
          errorMessage: "rate limited",
        }),
      ]),
    );
    expect(err[0]!.status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: "rate limited",
    });
    const piCustom = err[0]!.metadata?.custom?.pi as
      | { errorMessage?: string }
      | undefined;
    expect(piCustom?.errorMessage).toBe("rate limited");

    const aborted = projectPiThreadMessages(
      input([assistant([], { stopReason: "aborted" })]),
    );
    expect(aborted[0]!.status).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("projects a tool-associated confirm request as a pending approval", () => {
    const request: PiHostUiRequest = {
      id: "r1",
      kind: "confirm",
      title: "Run?",
      message: "ok?",
      toolCallId: "tc1",
    };
    const out = projectPiThreadMessages(
      input([assistant([toolCall("tc1", "bash", {})])], {
        hostUiRequests: [request],
      }),
    );
    const part = contentParts(out[0]!)[0]!;
    expect(part.approval).toEqual({ id: "r1" });
    expect(out[0]!.status).toEqual({
      type: "requires-action",
      reason: "tool-calls",
    });
  });

  it("projects a tool-associated input request as a human interrupt", () => {
    const request: PiHostUiRequest = {
      id: "r2",
      kind: "input",
      title: "Name?",
      toolCallId: "tc1",
    };
    const out = projectPiThreadMessages(
      input([assistant([toolCall("tc1", "ask", {})])], {
        hostUiRequests: [request],
      }),
    );
    const part = contentParts(out[0]!)[0]!;
    expect(part.interrupt).toMatchObject({
      type: "human",
      payload: { requestId: "r2", kind: "input" },
    });
    expect(out[0]!.status).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("does not attach free-standing host-ui requests to tool-calls", () => {
    const request: PiHostUiRequest = {
      id: "r3",
      kind: "confirm",
      title: "x",
      message: "y",
      // no toolCallId → side channel only
    };
    const out = projectPiThreadMessages(
      input([assistant([toolCall("tc1", "bash", {})])], {
        hostUiRequests: [request],
      }),
    );
    expect(contentParts(out[0]!)[0]!.approval).toBeUndefined();
    expect(out[0]!.status).toEqual({ type: "complete", reason: "stop" });
  });
});
