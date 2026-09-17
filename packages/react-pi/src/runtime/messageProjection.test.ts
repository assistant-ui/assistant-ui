import { describe, expect, it } from "vitest";
import {
  projectPiThreadMessages,
  type PiProjectionInput,
} from "./messageProjection";
import type {
  PiAgentMessage,
  PiAssistantMessage,
  PiHostUiRequest,
  PiToolCall,
} from "../types";

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

describe("messageProjection", () => {
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

  it("does not re-wrap image data that is already an uppercase-scheme data URL", () => {
    const out = projectPiThreadMessages(
      input([
        {
          role: "user",
          content: [
            {
              type: "image",
              data: "DATA:image/png;base64,abc",
              mimeType: "image/png",
            },
          ],
          timestamp: 1,
        },
      ]),
    );
    expect(contentParts(out[0]!)[0]).toEqual({
      type: "image",
      image: "DATA:image/png;base64,abc",
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
    expect(part.modelContent).toBeUndefined();
  });

  it("preserves image tool result content", () => {
    const content = [
      { type: "image" as const, data: "AAAA", mimeType: "image/png" },
    ];
    const out = projectPiThreadMessages(
      input([
        assistant([toolCall("tc1", "screenshot", {})]),
        {
          role: "toolResult",
          toolCallId: "tc1",
          toolName: "screenshot",
          content,
          isError: false,
          timestamp: 2,
        },
      ]),
    );

    expect(contentParts(out[0]!)[0]).toMatchObject({
      type: "tool-call",
      toolCallId: "tc1",
      result: "",
      modelContent: [{ type: "file", data: "AAAA", mediaType: "image/png" }],
    });
  });

  it("normalizes data URL image tool result content", () => {
    const out = projectPiThreadMessages(
      input([
        assistant([toolCall("tc1", "screenshot", {})]),
        {
          role: "toolResult",
          toolCallId: "tc1",
          toolName: "screenshot",
          content: [
            {
              type: "image",
              data: "data:image/png;base64,AAAA",
              mimeType: "image/png",
            },
          ],
          isError: false,
          timestamp: 2,
        },
      ]),
    );

    expect(contentParts(out[0]!)[0]).toMatchObject({
      result: "",
      modelContent: [{ type: "file", data: "AAAA", mediaType: "image/png" }],
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

  it("preserves live image tool result content", () => {
    const out = projectPiThreadMessages(
      input([assistant([toolCall("tc1", "screenshot", {})])], {
        toolExecutions: {
          tc1: {
            toolCallId: "tc1",
            status: "running",
            partialResult: {
              content: [{ type: "image", data: "AAAA", mimeType: "image/png" }],
            },
          },
        },
        runStatus: "running",
      }),
    );

    expect(contentParts(out[0]!)[0]).toMatchObject({
      toolCallId: "tc1",
      result: "",
      modelContent: [{ type: "file", data: "AAAA", mediaType: "image/png" }],
    });
  });

  it("ignores unsupported tool result parts while preserving recognized content", () => {
    const out = projectPiThreadMessages(
      input(
        [
          assistant([
            toolCall("final", "search", {}),
            toolCall("live", "search", {}),
          ]),
          {
            role: "toolResult",
            toolCallId: "final",
            toolName: "search",
            content: [
              { type: "text", text: "final text" },
              { type: "resource", uri: "resource://result" },
            ],
            isError: false,
            timestamp: 2,
          } as PiAgentMessage,
        ],
        {
          toolExecutions: {
            live: {
              toolCallId: "live",
              status: "running",
              partialResult: {
                content: [
                  { type: "text", text: "live text" },
                  { type: "resource", uri: "resource://partial" },
                ],
              },
            },
          },
          runStatus: "running",
        },
      ),
    );

    expect(contentParts(out[0]!)).toEqual([
      expect.objectContaining({
        toolCallId: "final",
        result: "final text",
      }),
      expect.objectContaining({ toolCallId: "live", result: "live text" }),
    ]);
    expect(contentParts(out[0]!)[0]!.modelContent).toBeUndefined();
    expect(contentParts(out[0]!)[1]!.modelContent).toBeUndefined();
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
    expect(part.approval).toEqual({ id: "r1", prompt: "Run?\nok?" });
    expect(out[0]!.status).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("projects a tool-associated select request as a question with one option per choice", () => {
    const request: PiHostUiRequest = {
      id: "r2",
      kind: "select",
      title: "Deploy where?",
      options: ["staging", "production"],
      toolCallId: "tc1",
    };
    const out = projectPiThreadMessages(
      input([assistant([toolCall("tc1", "deploy", {})])], {
        hostUiRequests: [request],
      }),
    );
    const part = contentParts(out[0]!)[0]!;
    expect(part.approval).toEqual({
      id: "r2",
      prompt: "Deploy where?",
      display: "select",
      options: [
        { id: "0", kind: "_0", label: "staging" },
        { id: "1", kind: "_1", label: "production" },
      ],
    });
    expect(part.interrupt).toBeUndefined();
    expect(out[0]!.status).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("projects tool-associated input and editor requests as text questions", () => {
    const requests: PiHostUiRequest[] = [
      { id: "r3", kind: "input", title: "Name?", toolCallId: "tc1" },
      {
        id: "r4",
        kind: "editor",
        title: "Edit the plan",
        prefill: "step one",
        toolCallId: "tc2",
      },
    ];
    const out = projectPiThreadMessages(
      input(
        [assistant([toolCall("tc1", "ask", {}), toolCall("tc2", "plan", {})])],
        { hostUiRequests: requests },
      ),
    );
    const [inputPart, editorPart] = contentParts(out[0]!);
    expect(inputPart!.approval).toEqual({
      id: "r3",
      prompt: "Name?",
      display: "text",
    });
    expect(editorPart!.approval).toEqual({
      id: "r4",
      prompt: "Edit the plan",
      display: "text",
    });
    expect(out[0]!.status).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("leaves a sibling tool call that has not started without an answer to give", () => {
    const request: PiHostUiRequest = {
      id: "r2",
      kind: "select",
      title: "Deploy where?",
      options: ["staging", "production"],
      toolCallId: "tc1",
    };
    const out = projectPiThreadMessages(
      input(
        [
          assistant([
            toolCall("tc1", "deploy", {}),
            toolCall("tc2", "notify", {}),
          ]),
        ],
        { hostUiRequests: [request], runStatus: "running" },
      ),
    );
    const [gated, sibling] = contentParts(out[0]!);
    expect(gated!.approval).toMatchObject({ id: "r2" });
    expect(sibling!.approval).toBeUndefined();
    expect(sibling!.result).toBeUndefined();
    expect(out[0]!.status).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("leaves requests the approval cannot answer off the tool-call", () => {
    const requests = [
      {
        id: "r5",
        kind: "multiselect",
        title: "Pick any",
        toolCallId: "tc1",
      } as unknown as PiHostUiRequest,
      {
        id: "r6",
        kind: "select",
        title: "Pick one",
        options: [],
        toolCallId: "tc2",
      } satisfies PiHostUiRequest,
    ];
    const out = projectPiThreadMessages(
      input(
        [assistant([toolCall("tc1", "pick", {}), toolCall("tc2", "pick", {})])],
        { hostUiRequests: requests },
      ),
    );
    for (const part of contentParts(out[0]!)) {
      expect(part.approval).toBeUndefined();
      expect(part.interrupt).toBeUndefined();
    }
    expect(out[0]!.status).toEqual({ type: "complete", reason: "stop" });
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
