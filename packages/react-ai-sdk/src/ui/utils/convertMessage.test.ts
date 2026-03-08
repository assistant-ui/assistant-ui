import { describe, expect, it } from "vitest";
import { AISDKMessageConverter } from "./convertMessage";

describe("AISDKMessageConverter", () => {
  it("converts user files into attachments and keeps text content", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "u1",
        role: "user",
        parts: [
          { type: "text", text: "hello" },
          {
            type: "file",
            mediaType: "image/png",
            url: "https://cdn/img.png",
            filename: "img.png",
          },
          {
            type: "file",
            mediaType: "application/pdf",
            url: "https://cdn/file.pdf",
            filename: "file.pdf",
          },
        ],
      } as any,
    ]);

    expect(converted).toHaveLength(1);
    expect(converted[0]?.role).toBe("user");
    expect(converted[0]?.content).toHaveLength(1);
    expect(converted[0]?.content[0]).toMatchObject({
      type: "text",
      text: "hello",
    });
    expect(converted[0]?.attachments).toHaveLength(2);
    expect(converted[0]?.attachments?.[0]?.type).toBe("image");
    expect(converted[0]?.attachments?.[1]?.type).toBe("file");
  });

  it("deduplicates tool calls by toolCallId and maps interrupt states", () => {
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "output-available",
              input: { city: "NYC" },
              output: { temp: 72 },
            },
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "output-available",
              input: { city: "NYC" },
              output: { temp: 73 },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-2",
              state: "approval-requested",
              input: { action: "deploy" },
              approval: { reason: "need human review" },
            },
            {
              type: "tool-human",
              toolCallId: "tc-3",
              state: "input-available",
              input: { task: "confirm" },
            },
          ],
        } as any,
      ],
      false,
      {
        toolStatuses: {
          "tc-3": {
            type: "interrupt",
            payload: { type: "human", payload: { kind: "human" } },
          },
        },
      },
    );

    const toolCalls = converted[0]?.content.filter(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCalls).toHaveLength(3);

    expect(toolCalls?.filter((p) => p.toolCallId === "tc-1")).toHaveLength(1);
    expect(toolCalls?.find((p) => p.toolCallId === "tc-2")?.status).toEqual({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(toolCalls?.find((p) => p.toolCallId === "tc-3")?.interrupt).toEqual({
      type: "human",
      payload: { kind: "human" },
    });
  });

  it("strips closing delimiters from streaming tool argsText", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-weather",
            toolCallId: "tc-1",
            state: "input-streaming",
            input: { city: "NYC" },
          },
        ],
      } as any,
    ]);

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.argsText).toBe('{"city":"NYC');
  });

  it("keeps observed key order from streaming snapshots for final tool args", () => {
    const metadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
    };

    const streaming = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-streaming",
              input: {
                type: "high_stock_model",
                limit: 5,
                filters: {
                  region: "us",
                  sector: "tech",
                },
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const streamingToolCall = streaming[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(streamingToolCall?.argsText).toBe(
      '{"type":"high_stock_model","limit":5,"filters":{"region":"us","sector":"tech',
    );

    const final = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-available",
              input: {
                filters: {
                  sector: "tech",
                  region: "us",
                },
                limit: 5,
                type: "high_stock_model",
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const finalToolCall = final[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(finalToolCall?.argsText).toBe(
      '{"type":"high_stock_model","limit":5,"filters":{"region":"us","sector":"tech"}}',
    );
  });

  it("merges duplicate toolCallId across assistant snapshots", () => {
    const metadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
    };

    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-streaming",
              input: {
                type: "high_stock_model",
                limit: 5,
              },
            },
          ],
        } as any,
        {
          id: "a2",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-available",
              input: {
                limit: 5,
                type: "high_stock_model",
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const toolCalls = converted[0]?.content.filter(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls?.[0]?.toolCallId).toBe("tc-order-1");
    expect(JSON.parse(toolCalls?.[0]?.argsText ?? "{}")).toEqual({
      type: "high_stock_model",
      limit: 5,
    });
  });
});
