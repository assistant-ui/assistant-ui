import { describe, expect, it } from "vitest";
import type { ToolCallMessagePart } from "@assistant-ui/core";
import {
  AcpContentAccumulator,
  acpToolStatusToPartStatus,
  isAllowKind,
  permissionOptionToApprovalOption,
  stopReasonToMessageStatus,
  threadContentToAcpBlocks,
  toolCallContentToText,
} from "./conversions";

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

  it("maps refusal to incomplete/other", () => {
    expect(stopReasonToMessageStatus("refusal")).toEqual({
      type: "incomplete",
      reason: "other",
    });
  });
});

describe("acpToolStatusToPartStatus", () => {
  it("maps pending and in_progress to running", () => {
    expect(acpToolStatusToPartStatus("pending")).toEqual({ type: "running" });
    expect(acpToolStatusToPartStatus("in_progress")).toEqual({
      type: "running",
    });
  });

  it("maps completed to complete", () => {
    expect(acpToolStatusToPartStatus("completed")).toEqual({
      type: "complete",
    });
  });

  it("maps failed to incomplete/error", () => {
    expect(acpToolStatusToPartStatus("failed")).toEqual({
      type: "incomplete",
      reason: "error",
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
        description: "never again",
      }),
    ).toEqual({
      id: "o2",
      kind: "reject-always",
      label: "Reject always",
      description: "never again",
    });
  });

  it("classifies allow kinds", () => {
    expect(isAllowKind("allow_once")).toBe(true);
    expect(isAllowKind("allow_always")).toBe(true);
    expect(isAllowKind("reject_once")).toBe(false);
  });
});

describe("threadContentToAcpBlocks", () => {
  it("converts text parts", () => {
    expect(threadContentToAcpBlocks([{ type: "text", text: "hello" }])).toEqual(
      [{ type: "text", text: "hello" }],
    );
  });

  it("converts data-url images to image blocks", () => {
    const blocks = threadContentToAcpBlocks([
      { type: "image", image: "data:image/png;base64,QUJD" },
    ]);
    expect(blocks).toEqual([
      { type: "image", data: "QUJD", mimeType: "image/png" },
    ]);
  });

  it("converts url images to resource links", () => {
    const blocks = threadContentToAcpBlocks([
      { type: "image", image: "https://example.com/x.png" },
    ]);
    expect(blocks).toEqual([
      { type: "resource", resource: { uri: "https://example.com/x.png" } },
    ]);
  });

  it("converts url files to resource links and skips empty text", () => {
    const blocks = threadContentToAcpBlocks([
      { type: "text", text: "" },
      {
        type: "file",
        data: "https://example.com/notes.pdf",
        mimeType: "application/pdf",
        sourceType: "url",
      },
    ]);
    expect(blocks).toEqual([
      {
        type: "resource",
        resource: {
          uri: "https://example.com/notes.pdf",
          mimeType: "application/pdf",
        },
      },
    ]);
  });
});

describe("toolCallContentToText", () => {
  it("joins text content blocks", () => {
    expect(
      toolCallContentToText([
        {
          type: "content",
          content: [
            { type: "text", text: "line 1" },
            { type: "text", text: "line 2" },
          ],
        },
      ]),
    ).toBe("line 1\nline 2");
  });

  it("accepts a single content block object where the spec says array", () => {
    // crow-cli sends {type:"content", content: <one block>} — must not throw
    expect(
      toolCallContentToText([
        {
          type: "content",
          content: { type: "text", text: "solo block" } as any,
        },
      ]),
    ).toBe("solo block");
  });

  it("renders diffs", () => {
    expect(
      toolCallContentToText([{ type: "diff", path: "a.md", newText: "new" }]),
    ).toContain("a.md");
  });

  it("returns undefined for empty content", () => {
    expect(toolCallContentToText(undefined)).toBeUndefined();
    expect(toolCallContentToText([])).toBeUndefined();
  });
});

describe("AcpContentAccumulator", () => {
  it("merges consecutive text chunks into one part", () => {
    const acc = new AcpContentAccumulator();
    acc.consume({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "Hello " },
    } as any);
    acc.consume({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "world" },
    } as any);
    expect(acc.content).toEqual([{ type: "text", text: "Hello world" }]);
  });

  it("accumulates thought chunks separately from message chunks", () => {
    const acc = new AcpContentAccumulator();
    acc.consume({
      sessionUpdate: "agent_thought_chunk",
      content: { type: "text", text: "thinking..." },
    } as any);
    acc.consume({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "answer" },
    } as any);
    expect(acc.content).toEqual([
      { type: "reasoning", text: "thinking..." },
      { type: "text", text: "answer" },
    ]);
  });

  it("starts a new text part after a tool call", () => {
    const acc = new AcpContentAccumulator();
    acc.consume({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "before" },
    } as any);
    acc.consume({
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      title: "web_search",
      status: "in_progress",
    } as any);
    acc.consume({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "after" },
    } as any);
    expect(acc.content.map((p) => p.type)).toEqual([
      "text",
      "tool-call",
      "text",
    ]);
  });

  it("creates and merges tool calls by id", () => {
    const acc = new AcpContentAccumulator();
    acc.consume({
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      title: "Searching recipes",
      status: "in_progress",
      rawInput: { query: "queso" },
    } as any);
    acc.consume({
      sessionUpdate: "tool_call_update",
      toolCallId: "t1",
      status: "completed",
      rawOutput: { hits: 3 },
    } as any);

    expect(acc.content).toHaveLength(1);
    const part = acc.content[0] as ToolCallMessagePart;
    expect(part.type).toBe("tool-call");
    expect(part.toolCallId).toBe("t1");
    expect(part.toolName).toBe("Searching recipes");
    expect(part.args).toEqual({ query: "queso" });
    expect(part.argsText).toBe(JSON.stringify({ query: "queso" }));
    expect(part.result).toEqual({ hits: 3 });
    expect(part.status).toEqual({ type: "complete" });
  });

  it("derives result from content text when rawOutput is absent", () => {
    const acc = new AcpContentAccumulator();
    acc.consume({
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      title: "fetch",
      status: "in_progress",
    } as any);
    acc.consume({
      sessionUpdate: "tool_call_update",
      toolCallId: "t1",
      status: "completed",
      content: [
        { type: "content", content: [{ type: "text", text: "page body" }] },
      ],
    } as any);
    const part = acc.content[0] as ToolCallMessagePart;
    expect(part.result).toBe("page body");
  });

  it("marks failed tool calls with isError", () => {
    const acc = new AcpContentAccumulator();
    acc.consume({
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      status: "failed",
    } as any);
    const part = acc.content[0] as ToolCallMessagePart;
    expect(part.isError).toBe(true);
    expect(part.status).toEqual({ type: "incomplete", reason: "error" });
  });

  it("attaches and resolves approvals on tool-call parts", () => {
    const acc = new AcpContentAccumulator();
    acc.attachApproval(
      { toolCallId: "t1", title: "write_file", status: "pending" },
      { id: "acp-permission-1", options: [{ id: "a", kind: "allow-once" }] },
    );
    let part = acc.content[0] as ToolCallMessagePart;
    expect(part.approval?.id).toBe("acp-permission-1");
    expect(part.approved).toBeUndefined();

    acc.resolveApproval("acp-permission-1", { approved: true, optionId: "a" });
    part = acc.content[0] as ToolCallMessagePart;
    expect(part.approval?.approved).toBe(true);
    expect(part.approval?.optionId).toBe("a");
  });

  it("ignores unknown update kinds", () => {
    const acc = new AcpContentAccumulator();
    expect(acc.consume({ sessionUpdate: "plan", entries: [] } as any)).toBe(
      false,
    );
    expect(acc.content).toEqual([]);
  });
});
