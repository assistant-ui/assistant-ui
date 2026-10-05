import { describe, expect, it } from "vitest";
import { toMessagePartStatus } from "@assistant-ui/core/internal";
import {
  PiThreadMessageProjector,
  projectPiThreadMessages,
  projectPiThreadRepository,
  type PiProjectionInput,
} from "./messageProjection";
import { isCompleteTranscriptMessage } from "../client/validation";
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

  it("drops user content parts of a type it does not project", () => {
    const message = {
      role: "user",
      content: [
        { type: "text", text: "hello" },
        { type: "audio", data: "abc", mimeType: "audio/wav" },
      ],
      timestamp: 1,
    } as unknown as PiAgentMessage;
    expect(isCompleteTranscriptMessage(message)).toBe(true);

    const out = projectPiThreadMessages(input([message]));
    expect(out[0]!.content).toEqual([{ type: "text", text: "hello" }]);
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
      isPreliminary: true,
    });
  });

  it.each([
    [
      "the execution ended",
      {
        toolExecutions: {
          tc1: {
            toolCallId: "tc1",
            status: "complete" as const,
            partialResult: {
              content: [{ type: "text" as const, text: "done" }],
            },
          },
        },
      },
    ],
    [
      "the result message landed",
      {
        toolExecutions: {
          tc1: {
            toolCallId: "tc1",
            status: "running" as const,
            partialResult: {
              content: [{ type: "text" as const, text: "partial..." }],
            },
          },
        },
        messages: [
          assistant([toolCall("tc1", "bash", {})]),
          {
            role: "toolResult" as const,
            toolCallId: "tc1",
            toolName: "bash",
            content: [{ type: "text" as const, text: "done" }],
            isError: false,
            timestamp: 101,
          },
        ],
      },
    ],
  ])("settles the streamed result once %s", (_label, extra) => {
    const out = projectPiThreadMessages(
      input([assistant([toolCall("tc1", "bash", {})])], {
        runStatus: "running",
        ...extra,
      }),
    );
    const part = contentParts(out[0]!)[0]!;
    expect(part.result).toBe("done");
    expect(part.isPreliminary).toBeUndefined();
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
      dismissible: true,
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
      dismissible: true,
    });
    expect(editorPart!.approval).toEqual({
      id: "r4",
      prompt: "Edit the plan",
      display: "text",
      dismissible: true,
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

  it.each<PiHostUiRequest>([
    {
      id: "r1",
      kind: "confirm",
      title: "Run?",
      message: "ok?",
      toolCallId: "tc1",
    },
    {
      id: "r2",
      kind: "select",
      title: "Deploy where?",
      options: ["staging", "production"],
      toolCallId: "tc1",
    },
    { id: "r3", kind: "input", title: "Name?", toolCallId: "tc1" },
    { id: "r4", kind: "editor", title: "Edit", toolCallId: "tc1" },
  ])(
    "keeps the $kind request answerable on a tool that already streamed output",
    (request) => {
      const repository = projectPiThreadRepository(
        input([assistant([toolCall("tc1", "bash", {})])], {
          toolExecutions: {
            tc1: {
              toolCallId: "tc1",
              status: "running",
              partialResult: {
                content: [{ type: "text", text: "partial..." }],
              },
            },
          },
          hostUiRequests: [request],
          runStatus: "running",
        }),
      );
      const message = repository.messages[0]!.message;
      const part = message.content[0]!;
      expect(part).toMatchObject({
        type: "tool-call",
        result: "partial...",
        approval: { id: request.id },
      });
      expect(message.status).toEqual({
        type: "requires-action",
        reason: "interrupt",
      });
      expect(toMessagePartStatus(message, 0, part)).toEqual(message.status);
    },
  );

  it("projects the request the side channel leaves to the tool-call when one tool raised two", () => {
    const requests: PiHostUiRequest[] = [
      {
        id: "r7",
        kind: "select",
        title: "Pick one",
        options: [],
        toolCallId: "tc1",
      },
      {
        id: "r8",
        kind: "confirm",
        title: "Run?",
        message: "ok?",
        toolCallId: "tc1",
      },
    ];
    const out = projectPiThreadMessages(
      input([assistant([toolCall("tc1", "bash", {})])], {
        hostUiRequests: requests,
      }),
    );
    expect(contentParts(out[0]!)[0]!.approval).toEqual({
      id: "r8",
      prompt: "Run?\nok?",
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

  it("keeps incremental projection equivalent across external state changes", () => {
    const projector = new PiThreadMessageProjector();
    const user: PiAgentMessage = {
      role: "user",
      content: "run it",
      timestamp: 1,
    };
    const call = assistant([toolCall("tc1", "bash", { command: "ls" })]);
    const messages: PiAgentMessage[] = [user, call];
    const assertEquivalent = (next: PiProjectionInput) => {
      expect(projector.project(next)).toEqual(projectPiThreadMessages(next));
    };

    assertEquivalent(input(messages));
    assertEquivalent(
      input(messages, {
        toolExecutions: {
          tc1: {
            toolCallId: "tc1",
            status: "running",
            partialResult: {
              content: [{ type: "text", text: "partial" }],
            },
          },
        },
        runStatus: "running",
      }),
    );
    assertEquivalent(
      input(messages, {
        runStatus: "running",
        hostUiRequests: [
          {
            id: "request-1",
            kind: "confirm",
            title: "Run command?",
            message: "Allow this command",
            toolCallId: "tc1",
          },
        ],
      }),
    );
    assertEquivalent(
      input([
        ...messages,
        {
          role: "toolResult",
          toolCallId: "tc1",
          toolName: "bash",
          content: [{ type: "text", text: "done" }],
          isError: false,
          timestamp: 2,
        },
      ]),
    );
    assertEquivalent(input([user]));
  });

  it("restores an earlier tool result when a later duplicate is removed", () => {
    const projector = new PiThreadMessageProjector();
    const call = assistant([toolCall("tc1", "bash", {})]);
    const firstResult: PiAgentMessage = {
      role: "toolResult",
      toolCallId: "tc1",
      toolName: "bash",
      content: [{ type: "text", text: "first" }],
      isError: false,
      timestamp: 2,
    };
    const secondResult: PiAgentMessage = {
      ...firstResult,
      content: [{ type: "text", text: "second" }],
      timestamp: 3,
    };

    projector.project(input([call, firstResult, secondResult]));
    const next = input([call, firstResult]);
    const projected = projector.project(next);

    expect(projected).toEqual(projectPiThreadMessages(next));
    expect(contentParts(projected[0]!)[0]).toMatchObject({ result: "first" });
  });

  it("restores an earlier tool-call index when a later duplicate is removed", () => {
    const projector = new PiThreadMessageProjector();
    const firstCall = assistant([toolCall("tc1", "bash", {})]);
    const separator: PiAgentMessage = {
      role: "user",
      content: "continue",
      timestamp: 2,
    };
    const duplicateCall = assistant([toolCall("tc1", "bash", {})], {
      timestamp: 3,
    });

    projector.project(input([firstCall, separator, duplicateCall]));
    projector.project(input([firstCall, separator]));
    const next = input([firstCall, separator], {
      toolExecutions: {
        tc1: {
          toolCallId: "tc1",
          status: "running",
          partialResult: {
            content: [{ type: "text", text: "partial" }],
          },
        },
      },
    });
    const projected = projector.project(next);

    expect(projected).toEqual(projectPiThreadMessages(next));
    expect(contentParts(projected[0]!)[0]).toMatchObject({ result: "partial" });
  });

  it("updates every duplicate tool-call when execution state changes", () => {
    const projector = new PiThreadMessageProjector();
    const firstCall = assistant([toolCall("tc1", "bash", {})]);
    const separator: PiAgentMessage = {
      role: "user",
      content: "continue",
      timestamp: 2,
    };
    const duplicateCall = assistant([toolCall("tc1", "bash", {})], {
      timestamp: 3,
    });
    const messages = [firstCall, separator, duplicateCall];

    projector.project(input(messages));
    const next = input(messages, {
      toolExecutions: {
        tc1: {
          toolCallId: "tc1",
          status: "running",
          partialResult: {
            content: [{ type: "text", text: "partial" }],
          },
        },
      },
    });
    const projected = projector.project(next);

    expect(projected).toEqual(projectPiThreadMessages(next));
    expect(contentParts(projected[0]!)[0]).toMatchObject({ result: "partial" });
    expect(contentParts(projected[2]!)[0]).toMatchObject({ result: "partial" });
  });

  it("falls back to full projection for an unexpected cached message id", () => {
    const projector = new PiThreadMessageProjector();
    const first: PiAgentMessage = {
      role: "user",
      content: "first",
      timestamp: 1,
    };
    const second: PiAgentMessage = {
      role: "user",
      content: "second",
      timestamp: 2,
    };
    const third: PiAgentMessage = {
      role: "user",
      content: "third",
      timestamp: 3,
    };
    const projected = projector.project(input([first, second, third]));
    const cachedProjector = projector as unknown as {
      projectedMessages: typeof projected;
      projectedSourceIndices: undefined;
    };
    cachedProjector.projectedMessages = projected.map((message, index) =>
      index === 1 ? { ...message, id: "unexpected" } : message,
    );
    cachedProjector.projectedSourceIndices = undefined;

    const next = input([
      first,
      second,
      { role: "user", content: "updated", timestamp: 4 },
    ]);

    expect(projector.project(next)).toEqual(projectPiThreadMessages(next));
  });

  it("updates the trailing assistant status when a user message is appended", () => {
    const projector = new PiThreadMessageProjector();
    const reply = assistant([{ type: "text", text: "done" }]);

    projector.project(input([reply], { runStatus: "running" }));
    const next = input(
      [reply, { role: "user", content: "continue", timestamp: 2 }],
      { runStatus: "running" },
    );
    const projected = projector.project(next);

    expect(projected).toEqual(projectPiThreadMessages(next));
    expect(projected[0]!.status).toEqual({ type: "complete", reason: "stop" });
  });

  it("matches full projection across seeded transcript transitions", () => {
    let seed = 0x7205;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const pick = (length: number) => Math.floor(random() * length);
    const projector = new PiThreadMessageProjector();
    const toolCallIds: string[] = [];
    let serial = 0;
    let messages: PiAgentMessage[] = [];
    let toolExecutions: PiProjectionInput["toolExecutions"] = {};
    let hostUiRequests: readonly PiHostUiRequest[] = [];
    let runStatus: PiProjectionInput["runStatus"] = "idle";

    const nextMessage = (): PiAgentMessage => {
      const index = serial++;
      switch (pick(9)) {
        case 0:
          return { role: "user", content: `user-${index}`, timestamp: index };
        case 1: {
          const id = `tool-${index}`;
          toolCallIds.push(id);
          return assistant(
            [toolCall(id, "bash", { command: `echo ${index}` })],
            { timestamp: index },
          );
        }
        case 2:
          return assistant([{ type: "text", text: `answer-${index}` }], {
            timestamp: index,
          });
        case 3:
          return {
            role: "toolResult",
            toolCallId:
              toolCallIds.length === 0
                ? `missing-${index}`
                : toolCallIds[pick(toolCallIds.length)]!,
            toolName: "bash",
            content: [{ type: "text", text: `result-${index}` }],
            isError: index % 5 === 0,
            timestamp: index,
          };
        case 4:
          return {
            role: "bashExecution",
            command: `echo ${index}`,
            output: `${index}`,
            exitCode: 0,
            cancelled: false,
            truncated: false,
            timestamp: index,
          };
        case 5:
          return {
            role: "custom",
            customType: "test",
            content: `custom-${index}`,
            display: index % 2 === 0,
            timestamp: index,
          };
        case 6:
          return {
            role: "branchSummary",
            summary: `summary-${index}`,
            fromId: `message-${index}`,
            timestamp: index,
          };
        case 7:
          return {
            role: "compactionSummary",
            summary: `compaction-${index}`,
            tokensBefore: index,
            timestamp: index,
          };
        default:
          return {
            role: "future-role",
            payload: index,
            timestamp: index,
          } as PiAgentMessage;
      }
    };

    for (let step = 0; step < 5000; step++) {
      const operation = messages.length === 0 ? 0 : pick(6);
      if (operation === 0) {
        messages = [...messages, nextMessage()];
      } else if (operation === 1) {
        const index = pick(messages.length);
        messages = messages.map((message, current) =>
          current === index ? nextMessage() : message,
        );
      } else if (operation === 2 || messages.length >= 40) {
        messages = messages.slice(0, pick(messages.length + 1));
      } else if (operation === 3) {
        runStatus = (["idle", "running", "failed"] as const)[pick(3)]!;
      } else if (operation === 4) {
        const id =
          toolCallIds.length === 0
            ? "missing"
            : toolCallIds[pick(toolCallIds.length)]!;
        const next = { ...toolExecutions };
        if (next[id]) delete next[id];
        else {
          next[id] = {
            toolCallId: id,
            status: "running",
            partialResult: {
              content: [{ type: "text", text: `partial-${step}` }],
            },
          };
        }
        toolExecutions = next;
      } else {
        const id =
          toolCallIds.length === 0
            ? "missing"
            : toolCallIds[pick(toolCallIds.length)]!;
        hostUiRequests =
          hostUiRequests.length === 0
            ? [
                {
                  id: `request-${step}`,
                  kind: "confirm",
                  title: "Run tool?",
                  message: "Allow this tool call",
                  toolCallId: id,
                },
              ]
            : [];
      }

      const next = input(messages, {
        toolExecutions,
        hostUiRequests,
        runStatus,
      });
      expect(projector.project(next), `transition ${step}`).toEqual(
        projectPiThreadMessages(next),
      );
    }
  });
});
