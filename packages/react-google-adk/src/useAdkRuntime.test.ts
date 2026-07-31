import { describe, it, expect } from "vitest";
import {
  getMessageContent,
  getPendingCancellations,
  getPendingToolCalls,
} from "./useAdkRuntime";
import { convertAdkMessage } from "./convertAdkMessages";
import type { AppendMessage } from "@assistant-ui/core";
import type { AdkMessage } from "./types";

const makeAppendMessage = (content: AppendMessage["content"]): AppendMessage =>
  ({
    role: "user",
    content,
    attachments: [],
    parentId: null,
    sourceId: null,
    runConfig: undefined,
    metadata: { custom: {} },
  }) as unknown as AppendMessage;

const aiWithToolCalls = (
  id: string,
  toolCalls: Array<{ id: string; name: string }>,
): AdkMessage => ({
  id,
  type: "ai",
  content: [],
  tool_calls: toolCalls.map((tc) => ({
    id: tc.id,
    name: tc.name,
    args: {},
    argsText: "{}",
  })),
});

const toolResponse = (
  id: string,
  toolCallId: string,
  name: string,
): AdkMessage => ({
  id,
  type: "tool",
  tool_call_id: toolCallId,
  name,
  content: JSON.stringify({ ok: true }),
  status: "success",
});

describe("getPendingToolCalls", () => {
  it("returns tool calls without matching tool responses", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [
        { id: "tc-1", name: "tool_a" },
        { id: "tc-2", name: "tool_b" },
      ]),
    ];
    expect(getPendingToolCalls(messages)).toEqual([
      { id: "tc-1", name: "tool_a", args: {}, argsText: "{}" },
      { id: "tc-2", name: "tool_b", args: {}, argsText: "{}" },
    ]);
  });

  it("excludes tool calls that have a matching tool response", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [
        { id: "tc-1", name: "tool_a" },
        { id: "tc-2", name: "tool_b" },
      ]),
      toolResponse("t-1", "tc-1", "tool_a"),
    ];
    expect(getPendingToolCalls(messages)).toEqual([
      { id: "tc-2", name: "tool_b", args: {}, argsText: "{}" },
    ]);
  });

  it("returns empty for threads with no ai messages", () => {
    expect(getPendingToolCalls([])).toEqual([]);
  });
});

describe("getPendingCancellations", () => {
  it("emits a {cancelled:true} tool message for every pending tool call", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [{ id: "tc-1", name: "tool_a" }]),
    ];
    const result = getPendingCancellations(messages, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "tool",
      name: "tool_a",
      tool_call_id: "tc-1",
      content: JSON.stringify({ cancelled: true }),
      status: "error",
    });
  });

  it("skips tool calls whose id is in longRunningToolIds", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [
        { id: "lrt-1", name: "adk_request_input" },
        { id: "tc-2", name: "regular_tool" },
      ]),
    ];
    const result = getPendingCancellations(messages, ["lrt-1"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "tool",
      name: "regular_tool",
      tool_call_id: "tc-2",
    });
  });

  it("skips all three HITL interrupt types", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [
        { id: "lrt-1", name: "adk_request_input" },
        { id: "lrt-2", name: "adk_request_confirmation" },
        { id: "lrt-3", name: "adk_request_credential" },
      ]),
    ];
    const result = getPendingCancellations(messages, [
      "lrt-1",
      "lrt-2",
      "lrt-3",
    ]);
    expect(result).toEqual([]);
  });

  it("returns empty when no tool calls are pending", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [{ id: "tc-1", name: "tool_a" }]),
      toolResponse("t-1", "tc-1", "tool_a"),
    ];
    expect(getPendingCancellations(messages, [])).toEqual([]);
  });

  it("cancels regular tool calls even when HITL interrupts are resolved", () => {
    const messages: AdkMessage[] = [
      aiWithToolCalls("ai-1", [
        { id: "lrt-1", name: "adk_request_input" },
        { id: "tc-2", name: "regular_tool" },
      ]),
      toolResponse("t-1", "lrt-1", "adk_request_input"),
    ];
    // lrt-1 lingering in longRunningToolIds is harmless because
    // getPendingToolCalls already excluded it via the tool response.
    const result = getPendingCancellations(messages, ["lrt-1"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      tool_call_id: "tc-2",
      name: "regular_tool",
    });
  });
});

describe("getMessageContent", () => {
  it("preserves file part data and mimeType end-to-end", () => {
    const result = getMessageContent(
      makeAppendMessage([
        { type: "text", text: "see attached" },
        {
          type: "file",
          mimeType: "application/pdf",
          data: "JVBERi0xLjQK",
          filename: "report.pdf",
        },
      ]),
    );
    expect(result).toEqual([
      { type: "text", text: "see attached" },
      {
        type: "file",
        mimeType: "application/pdf",
        data: "JVBERi0xLjQK",
        filename: "report.pdf",
      },
    ]);
  });

  it("keeps file-only content as an array (does not collapse to a text marker)", () => {
    const result = getMessageContent(
      makeAppendMessage([
        {
          type: "file",
          mimeType: "image/png",
          data: "AAAA",
          filename: "x.png",
        },
      ]),
    );
    expect(result).toEqual([
      {
        type: "file",
        mimeType: "image/png",
        data: "AAAA",
        filename: "x.png",
      },
    ]);
  });

  it("omits filename when not provided", () => {
    const result = getMessageContent(
      makeAppendMessage([
        { type: "file", mimeType: "application/pdf", data: "AAAA" },
      ]),
    );
    expect(result).toEqual([
      { type: "file", mimeType: "application/pdf", data: "AAAA" },
    ]);
  });

  it("emits a file_url part for file parts with sourceType url", () => {
    const result = getMessageContent(
      makeAppendMessage([
        {
          type: "file",
          mimeType: "application/pdf",
          data: "gs://bucket/report.pdf",
          filename: "report.pdf",
          sourceType: "url",
        },
      ]),
    );
    expect(result).toEqual([
      {
        type: "file_url",
        url: "gs://bucket/report.pdf",
        mimeType: "application/pdf",
      },
    ]);
  });

  it("keeps file parts inline without sourceType", () => {
    const result = getMessageContent(
      makeAppendMessage([
        {
          type: "file",
          mimeType: "application/pdf",
          data: "gs://bucket/report.pdf",
        },
      ]),
    );
    expect(result).toEqual([
      {
        type: "file",
        mimeType: "application/pdf",
        data: "gs://bucket/report.pdf",
      },
    ]);
  });

  it("round-trips a file_url part through convert and edit-resend", () => {
    const converted = convertAdkMessage(
      {
        id: "m1",
        type: "human",
        content: [
          {
            type: "file_url",
            url: "gs://bucket/report.pdf",
            mimeType: "application/pdf",
          },
        ],
      },
      {},
    );
    const content = (converted as { content: AppendMessage["content"] })
      .content;
    const result = getMessageContent(makeAppendMessage(content));
    expect(result).toEqual([
      {
        type: "file_url",
        url: "gs://bucket/report.pdf",
        mimeType: "application/pdf",
      },
    ]);
  });

  it("ignores sourceType id on file parts", () => {
    const result = getMessageContent(
      makeAppendMessage([
        {
          type: "file",
          mimeType: "application/pdf",
          data: "file-abc123",
          sourceType: "id",
        },
      ]),
    );
    expect(result).toEqual([
      { type: "file", mimeType: "application/pdf", data: "file-abc123" },
    ]);
  });

  it("forwards an audio part as a file block with the format-derived mime type", () => {
    const result = getMessageContent(
      makeAppendMessage([
        { type: "audio", audio: { data: "QUJD", format: "mp3" } },
      ]),
    );
    expect(result).toEqual([
      { type: "file", mimeType: "audio/mp3", data: "QUJD" },
    ]);
  });

  it("forwards a wav audio part with the audio/wav mime type", () => {
    const result = getMessageContent(
      makeAppendMessage([
        { type: "audio", audio: { data: "QUJD", format: "wav" } },
      ]),
    );
    expect(result).toEqual([
      { type: "file", mimeType: "audio/wav", data: "QUJD" },
    ]);
  });

  it("strips a data URL envelope from audio data", () => {
    const result = getMessageContent(
      makeAppendMessage([
        {
          type: "audio",
          audio: { data: "data:audio/mp3;base64,QUJD", format: "mp3" },
        },
      ]),
    );
    expect(result).toEqual([
      { type: "file", mimeType: "audio/mp3", data: "QUJD" },
    ]);
  });

  it("strips a data URL envelope from file data", () => {
    const result = getMessageContent(
      makeAppendMessage([
        {
          type: "file",
          data: "data:application/pdf;base64,QUJD",
          mimeType: "application/pdf",
          filename: "a.pdf",
        },
      ]),
    );
    expect(result).toEqual([
      {
        type: "file",
        mimeType: "application/pdf",
        data: "QUJD",
        filename: "a.pdf",
      },
    ]);
  });

  it("emits a file_url part for an unmarked http source", () => {
    const result = getMessageContent(
      makeAppendMessage([
        {
          type: "file",
          data: "https://cdn.example.com/a.pdf",
          mimeType: "application/pdf",
        },
      ]),
    );
    expect(result).toEqual([
      {
        type: "file_url",
        url: "https://cdn.example.com/a.pdf",
        mimeType: "application/pdf",
      },
    ]);
  });

  it("leaves bare base64 file data untouched", () => {
    const result = getMessageContent(
      makeAppendMessage([
        { type: "file", data: "QUJD", mimeType: "application/pdf" },
      ]),
    );
    expect(result).toEqual([
      { type: "file", mimeType: "application/pdf", data: "QUJD" },
    ]);
  });

  it("round-trips an audio file part through both converters", () => {
    const outbound = getMessageContent(
      makeAppendMessage([
        {
          type: "file",
          data: "data:audio/mp3;base64,QUJD",
          mimeType: "audio/mp3",
        },
      ]),
    );

    expect(outbound).toEqual([
      { type: "file", mimeType: "audio/mp3", data: "QUJD" },
    ]);

    const inbound = convertAdkMessage(
      { id: "m1", type: "human", content: outbound } as never,
      {},
    );

    expect(inbound).toMatchObject({
      role: "user",
      content: [{ type: "file", data: "QUJD", mimeType: "audio/mp3" }],
    });
  });

  it("skips data parts while keeping surrounding text", () => {
    const result = getMessageContent(
      makeAppendMessage([
        { type: "text", text: "hi" },
        { type: "data", name: "chart", data: { x: 1 } },
      ]),
    );
    expect(result).toBe("hi");
  });

  it("returns empty content for a data-only message", () => {
    const result = getMessageContent(
      makeAppendMessage([{ type: "data", name: "chart", data: { x: 1 } }]),
    );
    expect(result).toEqual([]);
  });

  it("still throws on assistant-only part types", () => {
    expect(() =>
      getMessageContent(
        makeAppendMessage([{ type: "reasoning", text: "thinking" }]),
      ),
    ).toThrow("Unsupported append message part type: reasoning");
  });
});
