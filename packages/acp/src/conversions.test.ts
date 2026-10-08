import { describe, expect, it } from "vitest";
import type { ToolCallMessagePart } from "@assistant-ui/core";
import {
  appendContentBlock,
  applyToolCallUpdate,
  attachToolCallApproval,
  buildToolCallPart,
  isAllowKind,
  isRejectKind,
  mergeToolCallPart,
  permissionOptionToApprovalOption,
  resolvePermissionOutcome,
  resolveToolCallApproval,
  stopReasonToMessageStatus,
  threadContentToAcpBlocks,
  toolCallContentToText,
} from "./conversions";
import type { AcpPermissionRequest, AcpSessionUpdate } from "./types";

const toolCall = (content: unknown, update: unknown) =>
  applyToolCallUpdate(
    content as Parameters<typeof applyToolCallUpdate>[0],
    update as Parameters<typeof applyToolCallUpdate>[1],
  )!;

const chunk = (content: unknown, update: unknown) => {
  const current = content as Parameters<typeof appendContentBlock>[0];
  const u = update as AcpSessionUpdate;
  switch (u.sessionUpdate) {
    case "agent_message_chunk":
      return appendContentBlock(current, u.content, "text")!;
    case "agent_thought_chunk":
      return appendContentBlock(current, u.content, "reasoning")!;
    case "tool_call":
    case "tool_call_update":
      return applyToolCallUpdate(current, u)!;
    default:
      throw new Error(`not a content update: ${u.sessionUpdate}`);
  }
};

describe("stopReasonToMessageStatus", () => {
  it("maps end_turn to complete", () => {
    expect(stopReasonToMessageStatus("end_turn")).toEqual({
      type: "complete",
      reason: "stop",
    });
  });

  it("maps cancelled to incomplete/cancelled", () => {
    expect(stopReasonToMessageStatus("cancelled")).toEqual({
      type: "incomplete",
      reason: "cancelled",
    });
  });

  it("maps max_tokens to incomplete/length", () => {
    expect(stopReasonToMessageStatus("max_tokens")).toEqual({
      type: "incomplete",
      reason: "length",
    });
  });

  it("maps refusal to content-filter and max_turn_requests to other", () => {
    expect(stopReasonToMessageStatus("refusal")).toEqual({
      type: "incomplete",
      reason: "content-filter",
    });
    expect(stopReasonToMessageStatus("max_turn_requests")).toEqual({
      type: "incomplete",
      reason: "other",
    });
  });

  it("treats an unknown stop reason as complete for an unknown reason", () => {
    expect(stopReasonToMessageStatus("something_new" as never)).toEqual({
      type: "complete",
      reason: "unknown",
    });
  });
});

describe("permissionOptionToApprovalOption", () => {
  it("maps ACP underscore kinds to assistant-ui dash kinds", () => {
    expect(
      permissionOptionToApprovalOption({
        optionId: "o1",
        name: "Allow once",
        kind: "allow_once",
      }),
    ).toEqual({ id: "o1", kind: "allow-once", label: "Allow once" });
    expect(
      permissionOptionToApprovalOption({
        optionId: "o2",
        name: "Reject always",
        kind: "reject_always",
      }),
    ).toEqual({ id: "o2", kind: "reject-always", label: "Reject always" });
  });

  it("classifies option families", () => {
    expect(isAllowKind("allow_once")).toBe(true);
    expect(isAllowKind("allow_always")).toBe(true);
    expect(isAllowKind("reject_once")).toBe(false);
    expect(isRejectKind("reject_once")).toBe(true);
    expect(isRejectKind("reject_always")).toBe(true);
    expect(isRejectKind("allow_always")).toBe(false);
  });
});

describe("resolvePermissionOutcome", () => {
  const request: AcpPermissionRequest = {
    sessionId: "s1",
    toolCall: { toolCallId: "t1" },
    options: [
      { optionId: "allow", name: "Allow", kind: "allow_once" },
      { optionId: "deny", name: "Deny", kind: "reject_once" },
    ],
  };

  it("honours an explicit optionId", () => {
    expect(
      resolvePermissionOutcome(request, {
        approvalId: "a1",
        approved: true,
        optionId: "deny",
      }),
    ).toEqual({ outcome: "selected", optionId: "deny" });
  });

  it("falls back within the approved family only", () => {
    expect(
      resolvePermissionOutcome(request, { approvalId: "a1", approved: true }),
    ).toEqual({ outcome: "selected", optionId: "allow" });
    expect(
      resolvePermissionOutcome(request, { approvalId: "a1", approved: false }),
    ).toEqual({ outcome: "selected", optionId: "deny" });
  });

  it("cancels rather than crossing families when the agent offers no match", () => {
    const allowOnly: AcpPermissionRequest = {
      ...request,
      options: [{ optionId: "allow", name: "Allow", kind: "allow_once" }],
    };
    expect(
      resolvePermissionOutcome(allowOnly, {
        approvalId: "a1",
        approved: false,
      }),
    ).toEqual({ outcome: "cancelled" });
  });

  it("cancels when the agent offers no options at all", () => {
    expect(
      resolvePermissionOutcome(
        { ...request, options: [] },
        {
          approvalId: "a1",
          approved: true,
        },
      ),
    ).toEqual({ outcome: "cancelled" });
  });
});

describe("threadContentToAcpBlocks", () => {
  it("converts text parts and skips empty text", () => {
    expect(
      threadContentToAcpBlocks([
        { type: "text", text: "" },
        { type: "text", text: "hello" },
      ]),
    ).toEqual([{ type: "text", text: "hello" }]);
  });

  it("converts data-url images to image blocks", () => {
    expect(
      threadContentToAcpBlocks([
        { type: "image", image: "data:image/png;base64,QUJD" },
      ]),
    ).toEqual([{ type: "image", data: "QUJD", mimeType: "image/png" }]);
  });

  it("converts url images to resource links", () => {
    expect(
      threadContentToAcpBlocks([
        { type: "image", image: "https://example.com/x.png" },
      ]),
    ).toEqual([
      {
        type: "resource_link",
        uri: "https://example.com/x.png",
        name: "https://example.com/x.png",
      },
    ]);
  });

  it("converts url files to resource links", () => {
    expect(
      threadContentToAcpBlocks([
        {
          type: "file",
          data: "https://example.com/notes.pdf",
          mimeType: "application/pdf",
          sourceType: "url",
        },
      ]),
    ).toEqual([
      {
        type: "resource_link",
        uri: "https://example.com/notes.pdf",
        name: "https://example.com/notes.pdf",
        mimeType: "application/pdf",
      },
    ]);
  });

  it("keeps raw base64 file data as an embedded resource", () => {
    expect(
      threadContentToAcpBlocks([
        {
          type: "file",
          data: "QUJD",
          mimeType: "application/pdf",
          filename: "n.pdf",
        },
      ]),
    ).toEqual([
      {
        type: "resource",
        resource: {
          uri: "file:///n.pdf",
          mimeType: "application/pdf",
          blob: "QUJD",
        },
      },
    ]);
  });

  it("converts data-url files to embedded resources", () => {
    expect(
      threadContentToAcpBlocks([
        {
          type: "file",
          data: "data:application/pdf;base64,QUJD",
          mimeType: "application/pdf",
        },
      ]),
    ).toEqual([
      {
        type: "resource",
        resource: {
          uri: "file:///attachment",
          mimeType: "application/pdf",
          blob: "QUJD",
        },
      },
    ]);
  });

  it("routes image and audio files to their own block types", () => {
    expect(
      threadContentToAcpBlocks([
        { type: "file", data: "QUJD", mimeType: "image/png" },
        { type: "file", data: "QUJD", mimeType: "audio/wav" },
      ]),
    ).toEqual([
      { type: "image", data: "QUJD", mimeType: "image/png" },
      { type: "audio", data: "QUJD", mimeType: "audio/wav" },
    ]);
  });

  it("converts audio parts", () => {
    expect(
      threadContentToAcpBlocks([
        { type: "audio", audio: { data: "QUJD", format: "wav" } },
      ]),
    ).toEqual([{ type: "audio", data: "QUJD", mimeType: "audio/wav" }]);
  });
});

describe("toolCallContentToText", () => {
  it("reads the spec's single content block", () => {
    expect(
      toolCallContentToText([
        { type: "content", content: { type: "text", text: "solo block" } },
      ]),
    ).toBe("solo block");
  });

  it("accepts an array of content blocks", () => {
    expect(
      toolCallContentToText([
        {
          type: "content",
          content: [
            { type: "text", text: "line 1" },
            { type: "text", text: "line 2" },
          ] as never,
        },
      ]),
    ).toBe("line 1\nline 2");
  });

  it("renders embedded text resources and resource links", () => {
    expect(
      toolCallContentToText([
        {
          type: "content",
          content: {
            type: "resource",
            resource: { uri: "file:///a", text: "body" },
          },
        },
        {
          type: "content",
          content: {
            type: "resource_link",
            uri: "https://example.com",
            name: "example",
          },
        },
      ]),
    ).toBe("body\n[example](https://example.com)");
  });

  it("renders diffs", () => {
    expect(
      toolCallContentToText([{ type: "diff", path: "a.md", newText: "new" }]),
    ).toContain("a.md");
  });

  it("returns undefined for empty content", () => {
    expect(toolCallContentToText(undefined)).toBeUndefined();
    expect(toolCallContentToText([])).toBeUndefined();
    expect(toolCallContentToText(null)).toBeUndefined();
  });
});

describe("buildToolCallPart", () => {
  it("leaves result unset while the call is running", () => {
    const part = buildToolCallPart({
      toolCallId: "t1",
      title: "Searching recipes",
      status: "in_progress",
      rawInput: { query: "queso" },
    });
    expect(part.toolName).toBe("Searching recipes");
    expect(part.args).toEqual({ query: "queso" });
    expect(part.argsText).toBe(JSON.stringify({ query: "queso" }));
    expect(part.result).toBeUndefined();
    expect(part.isError).toBeUndefined();
  });

  it("prefers the programmatic name over the title", () => {
    expect(
      buildToolCallPart({
        toolCallId: "t1",
        title: "Search",
        name: "web_search",
      }).toolName,
    ).toBe("web_search");
  });

  it("prefers a stable kind over a title that changes", () => {
    const part = buildToolCallPart({
      toolCallId: "t1",
      title: "Reading src/a.ts",
      kind: "read",
    });
    expect(part.toolName).toBe("read");
    expect(part.providerMetadata).toEqual({
      acp: { title: "Reading src/a.ts", kind: "read" },
    });
  });

  it("falls back to kind then a placeholder when unnamed", () => {
    expect(buildToolCallPart({ toolCallId: "t1", kind: "read" }).toolName).toBe(
      "read",
    );
    expect(buildToolCallPart({ toolCallId: "t1" }).toolName).toBe("tool_call");
  });

  it("marks a completed call with its raw output", () => {
    const part = buildToolCallPart({
      toolCallId: "t1",
      title: "search",
      status: "completed",
      rawOutput: { hits: 3 },
    });
    expect(part.result).toEqual({ hits: 3 });
    expect(part.isError).toBe(false);
  });

  it("keeps an explicit null output instead of substituting content", () => {
    const part = buildToolCallPart({
      toolCallId: "t1",
      title: "search",
      status: "completed",
      rawOutput: null,
      content: [{ type: "content", content: { type: "text", text: "body" } }],
    });
    expect(part.result).toBeNull();
  });

  it("derives result from content text when rawOutput is absent", () => {
    const part = buildToolCallPart({
      toolCallId: "t1",
      title: "fetch",
      status: "completed",
      content: [{ type: "content", content: { type: "text", text: "page" } }],
    });
    expect(part.result).toBe("page");
  });

  it("marks a failed call as an error", () => {
    const part = buildToolCallPart({
      toolCallId: "t1",
      title: "fetch",
      status: "failed",
    });
    expect(part.isError).toBe(true);
    expect(part.result).toBeNull();
  });

  it("marks an early output as preliminary", () => {
    const part = buildToolCallPart({
      toolCallId: "t1",
      title: "fetch",
      status: "in_progress",
      rawOutput: "partial",
    });
    expect(part.result).toBe("partial");
    expect(part.isPreliminary).toBe(true);
  });
});

describe("mergeToolCallPart", () => {
  const running = buildToolCallPart({
    toolCallId: "t1",
    title: "search",
    status: "in_progress",
    rawInput: { query: "queso" },
  });

  it("returns the same object when nothing changed", () => {
    expect(mergeToolCallPart(running, { toolCallId: "t1" })).toBe(running);
    expect(
      mergeToolCallPart(running, {
        toolCallId: "t1",
        rawInput: { query: "queso" },
      }),
    ).toBe(running);
  });

  it("completes with the raw output", () => {
    const merged = mergeToolCallPart(running, {
      toolCallId: "t1",
      status: "completed",
      rawOutput: { hits: 3 },
    });
    expect(merged.result).toEqual({ hits: 3 });
    expect(merged.isError).toBe(false);
  });

  it("clears isError when a failed call later completes", () => {
    const failed = mergeToolCallPart(running, {
      toolCallId: "t1",
      status: "failed",
    });
    expect(failed.isError).toBe(true);
    expect(
      mergeToolCallPart(failed, { toolCallId: "t1", status: "completed" })
        .isError,
    ).toBe(false);
  });

  it("clears isPreliminary once the call settles", () => {
    const preliminary = mergeToolCallPart(running, {
      toolCallId: "t1",
      rawOutput: "partial",
    });
    expect(preliminary.isPreliminary).toBe(true);
    expect(
      mergeToolCallPart(preliminary, {
        toolCallId: "t1",
        status: "completed",
      }).isPreliminary,
    ).toBe(false);
  });

  it("updates the tool name and args", () => {
    const merged = mergeToolCallPart(running, {
      toolCallId: "t1",
      title: "Search the web",
      rawInput: { query: "salsa" },
    });
    expect(merged.toolName).toBe("Search the web");
    expect(merged.args).toEqual({ query: "salsa" });
  });

  it("keeps a kind-derived tool name while the title changes", () => {
    const started = buildToolCallPart({
      toolCallId: "t1",
      title: "Reading src/a.ts",
      kind: "read",
      status: "in_progress",
    });
    const renamed = mergeToolCallPart(started, {
      toolCallId: "t1",
      title: "Read src/a.ts",
      kind: "read",
    });
    expect(renamed.toolName).toBe("read");
    expect(renamed.providerMetadata).toEqual({
      acp: { title: "Read src/a.ts", kind: "read", status: "in_progress" },
    });
    expect(
      mergeToolCallPart(renamed, {
        toolCallId: "t1",
        title: "Read src/a.ts",
        kind: "read",
      }),
    ).toBe(renamed);
  });

  it("keeps a programmatic tool name when a later update only changes the title", () => {
    const started = buildToolCallPart({
      toolCallId: "t1",
      title: "Search",
      name: "web_search",
      status: "in_progress",
    });
    expect(started.toolName).toBe("web_search");

    const retitled = mergeToolCallPart(started, {
      toolCallId: "t1",
      title: "Searching the web",
    });
    expect(retitled.toolName).toBe("web_search");
    expect(retitled.providerMetadata).toEqual({
      acp: {
        name: "web_search",
        title: "Searching the web",
        status: "in_progress",
      },
    });
  });

  it("keeps the kind an earlier update reported when a later one omits it", () => {
    const started = buildToolCallPart({
      toolCallId: "t1",
      title: "Reading src/a.ts",
      kind: "read",
    });
    const retitled = mergeToolCallPart(started, {
      toolCallId: "t1",
      title: "Read src/a.ts",
    });
    expect(retitled.toolName).toBe("read");
    expect(retitled.providerMetadata).toEqual({
      acp: { kind: "read", title: "Read src/a.ts" },
    });
  });

  it("treats a null name on an update as unchanged", () => {
    const started = buildToolCallPart({
      toolCallId: "t1",
      title: "Search",
      name: "web_search",
    });
    const nulled = mergeToolCallPart(started, {
      toolCallId: "t1",
      name: null,
      title: "Search the web",
    });
    expect(nulled.toolName).toBe("web_search");
    expect(nulled.providerMetadata).toEqual({
      acp: { name: "web_search", title: "Search the web" },
    });
  });

  it("adopts a programmatic name the agent reports after the call started", () => {
    const started = buildToolCallPart({
      toolCallId: "t1",
      title: "Search",
      kind: "read",
    });
    expect(started.toolName).toBe("read");
    expect(
      mergeToolCallPart(started, { toolCallId: "t1", name: "web_search" })
        .toolName,
    ).toBe("web_search");
  });

  const text = (value: string) => [
    {
      type: "content" as const,
      content: { type: "text" as const, text: value },
    },
  ];

  it("keeps a streamed result preliminary while the reported status is running", () => {
    const pending = buildToolCallPart({
      toolCallId: "t1",
      title: "search",
      status: "in_progress",
    });
    const streamed = mergeToolCallPart(pending, {
      toolCallId: "t1",
      content: text("half"),
    });
    expect(streamed).toMatchObject({ result: "half", isPreliminary: true });

    const settled = mergeToolCallPart(streamed, {
      toolCallId: "t1",
      status: "completed",
    });
    expect(settled).toMatchObject({
      result: "half",
      isPreliminary: false,
      isError: false,
    });
  });

  it("never infers completion from a result already on the part", () => {
    const streamed = mergeToolCallPart(running, {
      toolCallId: "t1",
      content: text("half"),
    });
    expect(streamed.result).toBe("half");

    const next = mergeToolCallPart(streamed, { toolCallId: "t1" });
    expect(next).toBe(streamed);
    expect(next.isPreliminary).toBe(true);
    expect(next.isError).toBeUndefined();
  });

  it("replaces streamed content instead of dropping later updates", () => {
    const first = mergeToolCallPart(running, {
      toolCallId: "t1",
      content: text("one"),
    });
    expect(first.result).toBe("one");

    const second = mergeToolCallPart(first, {
      toolCallId: "t1",
      content: text("one two"),
    });
    expect(second.result).toBe("one two");
    expect(second.isPreliminary).toBe(true);
  });
});

describe("streamed session updates", () => {
  it("merges consecutive text chunks into one part", () => {
    let content = chunk([], {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "Hello " },
    });
    content = chunk(content, {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "world" },
    });
    expect(content).toEqual([{ type: "text", text: "Hello world" }]);
  });

  it("accumulates thought chunks separately from message chunks", () => {
    let content = chunk([], {
      sessionUpdate: "agent_thought_chunk",
      content: { type: "text", text: "thinking..." },
    });
    content = chunk(content, {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "answer" },
    });
    expect(content).toEqual([
      { type: "reasoning", text: "thinking..." },
      { type: "text", text: "answer" },
    ]);
  });

  it("starts a new text part after a tool call", () => {
    let content = chunk([], {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "before" },
    });
    content = chunk(content, {
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      title: "web_search",
      status: "in_progress",
    });
    content = chunk(content, {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "after" },
    });
    expect(content.map((p) => p.type)).toEqual(["text", "tool-call", "text"]);
  });

  it("creates and merges tool calls by id", () => {
    let content = chunk([], {
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      title: "Searching recipes",
      status: "in_progress",
      rawInput: { query: "queso" },
    });
    content = chunk(content, {
      sessionUpdate: "tool_call_update",
      toolCallId: "t1",
      status: "completed",
      rawOutput: { hits: 3 },
    });
    expect(content).toHaveLength(1);
    const part = content[0] as ToolCallMessagePart;
    expect(part.toolName).toBe("Searching recipes");
    expect(part.result).toEqual({ hits: 3 });
  });

  it("converts image, audio and resource blocks", () => {
    let content = chunk([], {
      sessionUpdate: "agent_message_chunk",
      content: { type: "image", data: "QUJD", mimeType: "image/png" },
    });
    content = chunk(content, {
      sessionUpdate: "agent_message_chunk",
      content: { type: "audio", data: "QUJD", mimeType: "audio/wav" },
    });
    content = chunk(content, {
      sessionUpdate: "agent_message_chunk",
      content: {
        type: "resource",
        resource: { uri: "file:///a", text: "embedded" },
      },
    });
    expect(content).toEqual([
      { type: "image", image: "data:image/png;base64,QUJD" },
      { type: "file", data: "QUJD", mimeType: "audio/wav" },
      { type: "text", text: "embedded" },
    ]);
  });

  it("converts resource links and blob resources", () => {
    let content = chunk([], {
      sessionUpdate: "agent_message_chunk",
      content: {
        type: "resource_link",
        uri: "https://example.com/a.pdf",
        name: "a.pdf",
        mimeType: "application/pdf",
      },
    });
    content = chunk(content, {
      sessionUpdate: "agent_message_chunk",
      content: {
        type: "resource",
        resource: { uri: "file:///b.png", blob: "QUJD", mimeType: "image/png" },
      },
    });
    content = chunk(content, {
      sessionUpdate: "agent_message_chunk",
      content: {
        type: "resource",
        resource: {
          uri: "file:///c.pdf",
          blob: "QUJD",
          mimeType: "application/pdf",
        },
      },
    });
    expect(content).toEqual([
      {
        type: "file",
        data: "https://example.com/a.pdf",
        mimeType: "application/pdf",
        sourceType: "url",
        filename: "a.pdf",
      },
      { type: "image", image: "data:image/png;base64,QUJD" },
      { type: "file", data: "QUJD", mimeType: "application/pdf" },
    ]);
  });

  it("ignores blocks it cannot represent", () => {
    expect(appendContentBlock([], null as never, "text")).toBeUndefined();
    expect(
      appendContentBlock([], { type: "some_future_block" } as never, "text"),
    ).toBeUndefined();
    expect(
      appendContentBlock([], { type: "resource" } as never, "text"),
    ).toBeUndefined();
  });
});

describe("appendContentBlock", () => {
  it("returns undefined for an empty block", () => {
    expect(appendContentBlock([], { type: "text", text: "" }, "text")).toBe(
      undefined,
    );
  });

  it("tolerates an unknown block type", () => {
    expect(
      appendContentBlock([], { type: "hologram" } as never, "text"),
    ).toBeUndefined();
  });
});

describe("tool call approvals", () => {
  const approval = {
    id: "acp-permission-1",
    options: [{ id: "allow", kind: "allow-once" as const }],
  };

  it("creates the tool-call part when it does not exist yet", () => {
    const content = attachToolCallApproval(
      [],
      { toolCallId: "t1", title: "write_file", status: "pending" },
      approval,
    );
    const part = content[0] as ToolCallMessagePart;
    expect(part.toolName).toBe("write_file");
    expect(part.approval?.id).toBe("acp-permission-1");
    expect(part.approval?.approved).toBeUndefined();
  });

  it("records the resolution on the matching part", () => {
    const content = attachToolCallApproval(
      [],
      { toolCallId: "t1", title: "write_file" },
      approval,
    );
    const resolved = resolveToolCallApproval(content, "acp-permission-1", {
      approved: true,
      optionId: "allow",
    })!;
    const part = resolved[0] as ToolCallMessagePart;
    expect(part.approval?.approved).toBe(true);
    expect(part.approval?.optionId).toBe("allow");
  });

  it("returns undefined for an unknown approval id", () => {
    const content = attachToolCallApproval(
      [],
      { toolCallId: "t1", title: "write_file" },
      approval,
    );
    expect(resolveToolCallApproval(content, "nope", { approved: true })).toBe(
      undefined,
    );
  });

  it("records a cancellation without a decision", () => {
    const content = attachToolCallApproval(
      [],
      { toolCallId: "t1", title: "write_file" },
      approval,
    );
    const part = resolveToolCallApproval(content, "acp-permission-1", {
      resolution: "cancelled",
    })![0] as ToolCallMessagePart;
    expect(part.approval?.approved).toBeUndefined();
    expect(part.approval?.resolution).toBe("cancelled");
  });
});

describe("applyToolCallUpdate", () => {
  it("appends a new part for an unknown tool call id", () => {
    const content = toolCall([], { toolCallId: "t1", title: "search" });
    expect(content).toHaveLength(1);
  });

  it("returns undefined when the update changes nothing", () => {
    const content = toolCall([], {
      toolCallId: "t1",
      title: "search",
      status: "in_progress",
    });
    expect(applyToolCallUpdate(content, { toolCallId: "t1" })).toBeUndefined();
  });
});
