import { describe, expect, it, vi } from "vitest";
import type { AISDKDataSpecTelemetryEvent } from "./convertMessage";
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
              instanceId: "status-chip-1",
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
      instanceId: "status-chip-1",
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
                instanceId: "notice-banner-1",
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
      instanceId: "notice-banner-1",
      props: { level: "info" },
      parentId: "group-2",
    });
  });

  it("converts data-spec chunks into a hosted component and applies patches", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            { type: "text", text: "before" },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 1,
                spec: {
                  type: "card",
                  props: { title: "Draft", items: ["A"] },
                },
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 2,
                patch: [
                  { op: "replace", path: "/props/title", value: "Ready" },
                  { op: "add", path: "/props/items/1", value: "B" },
                ],
              },
            },
            { type: "text", text: "after" },
          ],
          metadata: {},
        } as any,
      ],
      false,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.content.map((part) => part.type)).toEqual([
      "text",
      "component",
      "text",
    ]);

    expect(result[0]!.content[1]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec_1",
      props: {
        spec: {
          type: "card",
          props: { title: "Ready", items: ["A", "B"] },
        },
      },
    });
  });

  it("ignores stale data-spec chunks when seq goes backwards", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 2,
                spec: {
                  type: "card",
                  props: { title: "Latest" },
                },
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 1,
                patch: [
                  { op: "replace", path: "/props/title", value: "Stale" },
                ],
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
      name: "json-render",
      instanceId: "spec_1",
      props: {
        spec: {
          type: "card",
          props: { title: "Latest" },
        },
      },
    });
  });

  it("drops malformed data-spec patches and keeps the last valid spec", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 1,
                spec: {
                  type: "card",
                  props: { title: "Initial" },
                },
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 2,
                patch: [
                  { op: "replace", path: "props/title", value: "Broken" },
                ],
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
      name: "json-render",
      instanceId: "spec_1",
      props: {
        spec: {
          type: "card",
          props: { title: "Initial" },
        },
      },
    });
  });

  it("repairs invalid specs with repairSpec when validateSpec fails", () => {
    const validateSpec = vi.fn(
      (
        context,
      ): context is { spec: { type: "card"; props: { title: string } } } =>
        Boolean(
          context &&
            typeof context === "object" &&
            context.spec &&
            typeof context.spec === "object" &&
            (context.spec as { type?: unknown }).type === "card",
        ),
    );
    const repairSpec = vi.fn(() => ({
      type: "card",
      props: { title: "Repaired" },
    }));

    const result = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 1,
                spec: {
                  type: "unknown-layout",
                  props: { title: "Draft" },
                },
              },
            },
          ],
        } as any,
      ],
      false,
      {
        dataSpec: {
          validateSpec,
          repairSpec,
        },
      },
    );

    expect(validateSpec).toHaveBeenCalled();
    expect(repairSpec).toHaveBeenCalled();
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec_1",
      props: {
        spec: {
          type: "card",
          props: { title: "Repaired" },
        },
      },
    });
  });

  it("emits telemetry events for stale seq updates and malformed patches", () => {
    const events: AISDKDataSpecTelemetryEvent[] = [];
    const onTelemetry = (event: AISDKDataSpecTelemetryEvent) => {
      events.push(event);
    };

    AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 2,
                spec: {
                  type: "card",
                  props: { title: "Initial" },
                },
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 1,
                patch: [
                  { op: "replace", path: "/props/title", value: "Stale" },
                ],
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 3,
                patch: [
                  { op: "replace", path: "props/title", value: "Malformed" },
                ],
              },
            },
          ],
        } as any,
      ],
      false,
      {
        dataSpec: {
          onTelemetry,
        },
      },
    );

    expect(events).toContainEqual({
      type: "stale-seq-ignored",
      instanceId: "spec_1",
      seq: 1,
      latestSeq: 2,
    });
    expect(events).toContainEqual({
      type: "malformed-patch-dropped",
      instanceId: "spec_1",
      seq: 3,
    });
  });

  it("drops malformed data-spec envelopes with invalid props/spec payloads", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 1,
                spec: {
                  type: "card",
                  props: { title: "Initial" },
                },
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 2,
                props: [],
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 3,
                spec: [],
              },
            },
          ],
        } as any,
      ],
      false,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec_1",
      props: {
        spec: {
          type: "card",
          props: { title: "Initial" },
        },
      },
    });
  });

  it("supports escaped JSON pointer tokens in data-spec patch paths", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 1,
                spec: {
                  type: "card",
                  props: {
                    "a/b": "slash-old",
                    "tilde~k": "tilde-old",
                  },
                },
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 2,
                patch: [
                  { op: "replace", path: "/props/a~1b", value: "slash-new" },
                  {
                    op: "replace",
                    path: "/props/tilde~0k",
                    value: "tilde-new",
                  },
                ],
              },
            },
          ],
        } as any,
      ],
      false,
      {},
    );

    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec_1",
      props: {
        spec: {
          type: "card",
          props: {
            "a/b": "slash-new",
            "tilde~k": "tilde-new",
          },
        },
      },
    });
  });

  it("drops add/replace data-spec patch ops without value payloads", () => {
    const events: AISDKDataSpecTelemetryEvent[] = [];

    const result = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 1,
                spec: {
                  type: "card",
                  props: { title: "Initial" },
                },
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 2,
                patch: [{ op: "replace", path: "/props/title" }],
              },
            },
          ],
        } as any,
      ],
      false,
      {
        dataSpec: {
          onTelemetry: (event) => {
            events.push(event);
          },
        },
      },
    );

    expect(events).toContainEqual({
      type: "malformed-patch-dropped",
      instanceId: "spec_1",
      seq: 2,
    });
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec_1",
      props: {
        spec: {
          type: "card",
          props: { title: "Initial" },
        },
      },
    });
  });

  it("drops data-spec updates with invalid seq values and empty component names", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: 1,
                spec: {
                  type: "card",
                  props: { title: "Initial" },
                },
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_1",
                seq: Number.NaN,
                patch: [{ op: "replace", path: "/props/title", value: "NaN" }],
              },
            },
            {
              type: "data-spec",
              data: {
                instanceId: "spec_2",
                name: "",
                seq: 1,
                spec: {
                  type: "card",
                  props: { title: "Should Drop" },
                },
              },
            },
          ],
        } as any,
      ],
      false,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec_1",
      props: {
        spec: {
          type: "card",
          props: { title: "Initial" },
        },
      },
    });
  });
});
