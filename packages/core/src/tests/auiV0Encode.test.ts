import { describe, expect, it, vi } from "vitest";
import { auiV0Decode, auiV0Encode } from "../react/runtimes/cloud/auiV0";

describe("auiV0Encode", () => {
  it("preserves document source parts in the core cloud encoder", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        {
          type: "source",
          sourceType: "document",
          id: "doc_123",
          title: "proposal.pdf",
          mediaType: "application/pdf",
          filename: "proposal.pdf",
          providerMetadata: {
            openai: {
              type: "file_citation",
              fileId: "file_123",
              index: 0,
            },
          },
        },
      ],
    });

    expect(encoded.content).toEqual([
      {
        type: "source",
        sourceType: "document",
        id: "doc_123",
        title: "proposal.pdf",
        mediaType: "application/pdf",
        filename: "proposal.pdf",
        providerMetadata: {
          openai: {
            type: "file_citation",
            fileId: "file_123",
            index: 0,
          },
        },
      },
    ]);
  });

  it("preserves a pending tool-call approval in the core cloud encoder", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "assistant",
      status: { type: "requires-action", reason: "tool-calls" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "send_email",
          args: {},
          argsText: "{}",
          approval: { id: "a1" },
        },
      ],
    });

    const toolCall = encoded.content.find((p) => p.type === "tool-call");
    expect(toolCall).toMatchObject({ approval: { id: "a1" } });
  });

  it("preserves user attachments in the core cloud encoder", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "user",
      metadata: { custom: {} },
      content: [{ type: "text", text: "please review this" }],
      attachments: [
        {
          id: "att-1",
          type: "document",
          name: "proposal.pdf",
          contentType: "application/pdf",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              data: "data:application/pdf;base64,JVBERi0xLjQ=",
              mimeType: "application/pdf",
              filename: "proposal.pdf",
            },
          ],
        },
      ],
    });

    expect(encoded.attachments).toEqual([
      {
        id: "att-1",
        type: "document",
        name: "proposal.pdf",
        contentType: "application/pdf",
        status: { type: "complete" },
        content: [
          {
            type: "file",
            data: "data:application/pdf;base64,JVBERi0xLjQ=",
            mimeType: "application/pdf",
            filename: "proposal.pdf",
          },
        ],
      },
    ]);
  });

  it("preserves file sourceType in the core cloud encoder", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "user",
      metadata: { custom: {} },
      content: [
        {
          type: "file",
          data: "file-abc123",
          mimeType: "application/pdf",
          filename: "a.pdf",
          sourceType: "id",
        },
      ],
      attachments: [
        {
          id: "att-1",
          type: "document",
          name: "a.pdf",
          contentType: "application/pdf",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              data: "file-abc123",
              mimeType: "application/pdf",
              filename: "a.pdf",
              sourceType: "id",
            },
          ],
        },
      ],
    });

    expect(encoded.content).toEqual([
      {
        type: "file",
        data: "file-abc123",
        mimeType: "application/pdf",
        filename: "a.pdf",
        sourceType: "id",
      },
    ]);
    expect(encoded.attachments?.[0]?.content).toEqual([
      {
        type: "file",
        data: "file-abc123",
        mimeType: "application/pdf",
        filename: "a.pdf",
        sourceType: "id",
      },
    ]);
  });

  it("omits missing attachment contentType in the core cloud encoder", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "user",
      metadata: { custom: {} },
      content: [{ type: "text", text: "please review this" }],
      attachments: [
        {
          id: "att-1",
          type: "document",
          name: "notes.txt",
          status: { type: "complete" },
          content: [{ type: "text", text: "notes" }],
        },
      ],
    });

    expect(encoded.attachments).toEqual([
      {
        id: "att-1",
        type: "document",
        name: "notes.txt",
        status: { type: "complete" },
        content: [{ type: "text", text: "notes" }],
      },
    ]);
  });

  it("drops per-part status from message parts in the core cloud encoder", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        { type: "reasoning", text: "thinking", status: { type: "complete" } },
        { type: "text", text: "answer", status: { type: "running" } },
      ],
    });

    expect(encoded.content).toEqual([
      { type: "reasoning", text: "thinking" },
      { type: "text", text: "answer" },
    ]);
  });

  it("preserves reasoning summaries and omits absent summaries", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        { type: "reasoning", text: "thinking", unstable_summary: "Planning" },
        { type: "reasoning", text: "more thinking", unstable_summary: "" },
        { type: "reasoning", text: "no summary" },
      ],
    });

    expect(encoded.content).toEqual([
      { type: "reasoning", text: "thinking", unstable_summary: "Planning" },
      { type: "reasoning", text: "more thinking", unstable_summary: "" },
      { type: "reasoning", text: "no summary" },
    ]);
  });

  it("drops per-part status from attachment content in the core cloud encoder", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "user",
      metadata: { custom: {} },
      content: [{ type: "text", text: "please review this" }],
      attachments: [
        {
          id: "att-1",
          type: "document",
          name: "notes.txt",
          status: { type: "complete" },
          content: [
            { type: "text", text: "notes", status: { type: "running" } },
          ],
        },
      ],
    });

    expect(encoded.attachments?.[0]?.content).toEqual([
      { type: "text", text: "notes" },
    ]);
  });

  it("preserves every attachment content field the wire shape carries in the core cloud encoder", () => {
    const encoded = auiV0Encode({
      id: "m1",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "user",
      metadata: { custom: {} },
      content: [{ type: "text", text: "please review these" }],
      attachments: [
        {
          id: "att-1",
          type: "file",
          name: "bundle",
          status: { type: "complete" },
          content: [
            {
              type: "image",
              image: "data:image/png;base64,iVBORw0KGgo=",
              filename: "shot.png",
            },
            {
              type: "audio",
              audio: { data: "data:audio/mp3;base64,SUQzAw==", format: "mp3" },
            },
            { type: "data", name: "telemetry", data: { runs: 3 } },
          ],
        },
      ],
    });

    expect(encoded.attachments?.[0]?.content).toEqual([
      {
        type: "image",
        image: "data:image/png;base64,iVBORw0KGgo=",
        filename: "shot.png",
      },
      {
        type: "audio",
        audio: { data: "data:audio/mp3;base64,SUQzAw==", format: "mp3" },
      },
      { type: "data", name: "telemetry", data: { runs: 3 } },
    ]);
  });
});

describe("auiV0Decode", () => {
  it("round-trips a reasoning summary", () => {
    const encoded = auiV0Encode({
      id: "local",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        { type: "reasoning", text: "thinking", unstable_summary: "Planning" },
      ],
    });

    const { message } = auiV0Decode({
      id: "cloud",
      parent_id: null,
      format: "aui/v0",
      content: encoded,
      created_at: new Date("2026-03-15T00:00:00.000Z"),
    } as unknown as Parameters<typeof auiV0Decode>[0]);

    expect(message.content).toEqual([
      { type: "reasoning", text: "thinking", unstable_summary: "Planning" },
    ]);
  });

  it("round-trips a reasoning summary without text", () => {
    const encoded = auiV0Encode({
      id: "local",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        {
          type: "reasoning",
          text: "",
          unstable_summary: "Searching the codebase",
        },
      ],
    });

    const { message } = auiV0Decode({
      id: "cloud",
      parent_id: null,
      format: "aui/v0",
      content: encoded,
      created_at: new Date("2026-03-15T00:00:00.000Z"),
    } as unknown as Parameters<typeof auiV0Decode>[0]);

    expect(message.content).toEqual([
      {
        type: "reasoning",
        text: "",
        unstable_summary: "Searching the codebase",
      },
    ]);
  });

  it("round-trips a pending tool-call approval so a paused run stays resumable", () => {
    const content = auiV0Encode({
      id: "local",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "assistant",
      status: { type: "requires-action", reason: "tool-calls" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "send_email",
          args: {},
          argsText: "{}",
          approval: { id: "a1" },
        },
      ],
    });

    const decoded = auiV0Decode({
      id: "cloud",
      parent_id: null,
      height: 0,
      created_at: new Date("2026-03-15T00:00:00.000Z"),
      updated_at: new Date("2026-03-15T00:00:00.000Z"),
      format: "aui/v0",
      content: content as never,
    });

    if (decoded.message.role !== "assistant")
      throw new Error("expected assistant");
    const toolCall = decoded.message.content.find(
      (p) => p.type === "tool-call",
    );
    expect(toolCall?.type === "tool-call" && toolCall.approval).toEqual({
      id: "a1",
    });
  });

  it("restores user attachments from core cloud history", () => {
    const content = auiV0Encode({
      id: "local",
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      role: "user",
      metadata: { custom: {} },
      content: [{ type: "text", text: "please review this" }],
      attachments: [
        {
          id: "att-1",
          type: "document",
          name: "proposal.pdf",
          contentType: "application/pdf",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              data: "data:application/pdf;base64,JVBERi0xLjQ=",
              mimeType: "application/pdf",
              filename: "proposal.pdf",
            },
          ],
        },
      ],
    });

    const decoded = auiV0Decode({
      id: "cloud",
      parent_id: null,
      height: 0,
      created_at: new Date("2026-03-15T00:00:00.000Z"),
      updated_at: new Date("2026-03-15T00:00:00.000Z"),
      format: "aui/v0",
      content: content as never,
    });

    expect(decoded.message.role).toBe("user");
    if (decoded.message.role !== "user") throw new Error("expected user");
    expect(decoded.message.attachments).toEqual([
      {
        id: "att-1",
        type: "document",
        name: "proposal.pdf",
        contentType: "application/pdf",
        status: { type: "complete" },
        content: [
          {
            type: "file",
            data: "data:application/pdf;base64,JVBERi0xLjQ=",
            mimeType: "application/pdf",
            filename: "proposal.pdf",
          },
        ],
      },
    ]);
  });

  const toolCallMessage = (
    part: Record<string, unknown>,
  ): Parameters<typeof auiV0Encode>[0] => ({
    id: "m1",
    createdAt: new Date("2026-03-15T00:00:00.000Z"),
    role: "assistant",
    status: { type: "complete", reason: "stop" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
    content: [
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "check_flag",
        args: {},
        argsText: "{}",
        ...part,
      },
    ],
  });

  it.each([
    ["false", false],
    ["zero", 0],
    ["an empty string", ""],
    ["null", null],
  ])("preserves %s as a tool-call result", (_label, result) => {
    const encoded = auiV0Encode(toolCallMessage({ result }));

    const toolCall = encoded.content.find((p) => p.type === "tool-call");
    expect(toolCall).toHaveProperty("result", result);
  });

  it("omits the result of a tool call that has not settled", () => {
    const encoded = auiV0Encode(toolCallMessage({}));

    const toolCall = encoded.content.find((p) => p.type === "tool-call");
    expect(toolCall).not.toHaveProperty("result");
  });

  it("does not warn about a tool call that has not settled", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      auiV0Encode(toolCallMessage({}));
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("carries a falsy tool-call result through a decode round trip", () => {
    const encoded = auiV0Encode(toolCallMessage({ result: false }));
    const { message } = auiV0Decode({
      id: "m1",
      parent_id: null,
      format: "aui/v0",
      content: encoded,
      created_at: new Date("2026-03-15T00:00:00.000Z"),
    } as unknown as Parameters<typeof auiV0Decode>[0]);

    const toolCall = message.content.find((p) => p.type === "tool-call");
    expect(toolCall).toHaveProperty("result", false);
  });
});
