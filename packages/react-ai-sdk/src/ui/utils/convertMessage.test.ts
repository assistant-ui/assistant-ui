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
          "tc-3": { type: "interrupt", payload: { kind: "human" } },
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
      kind: "human",
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

  it("converts direct component parts", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "component",
              name: "status-chip",
              props: { label: "Ready" },
              parentId: "group-1",
            },
          ],
          metadata: {},
        } as any,
      ],
      false,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.role).toBe("assistant");
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "status-chip",
      props: { label: "Ready" },
      parentId: "group-1",
    });
  });

  it("converts data-component payloads", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "data-component",
              data: {
                name: "notice-banner",
                props: { level: "info" },
                parentId: "group-2",
              },
            },
          ],
          metadata: {},
        } as any,
      ],
      false,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "notice-banner",
      props: { level: "info" },
      parentId: "group-2",
    });
  });
});
