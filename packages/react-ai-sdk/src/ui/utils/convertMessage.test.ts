// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { unstable_AISDKDataSpecTelemetryEvent } from "./convertMessage";
import { AISDKMessageConverter } from "./convertMessage";

const convertWithBothPaths = (
  messages: any[],
  metadata: any = {},
  isRunning = false,
) => {
  const toThreadMessages = AISDKMessageConverter.toThreadMessages(
    messages,
    isRunning,
    metadata,
  );
  const { result } = renderHook(() =>
    AISDKMessageConverter.useThreadMessages({
      messages,
      isRunning,
      metadata,
    }),
  );

  return {
    toThreadMessages,
    useThreadMessages: result.current,
  };
};

const expectAcrossBothPaths = (
  messages: any[],
  assertResult: (converted: any[]) => void,
  metadata: any = {},
  isRunning = false,
) => {
  const { toThreadMessages, useThreadMessages } = convertWithBothPaths(
    messages,
    metadata,
    isRunning,
  );
  assertResult(toThreadMessages);
  assertResult(useThreadMessages);
};

const assistantMessage = (id: string, parts: any[]) =>
  ({ id, role: "assistant", parts, metadata: {} }) as any;

const userMessage = (id: string, parts: any[]) =>
  ({ id, role: "user", parts, metadata: {} }) as any;

const dataSpecPart = (data: Record<string, unknown>) => ({
  type: "data-spec",
  data,
});

const cardSpec = (title: string, extraProps: Record<string, unknown> = {}) => ({
  type: "card",
  props: { title, ...extraProps },
});

const replacePatch = (path: string, value?: unknown) => ({
  op: "replace" as const,
  path,
  ...(value !== undefined ? { value } : {}),
});

const addPatch = (path: string, value: unknown) => ({
  op: "add" as const,
  path,
  value,
});

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

  it("deduplicates tool calls by toolCallId using the latest occurrence and maps interrupt states", () => {
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
    expect(toolCalls?.find((p) => p.toolCallId === "tc-1")?.result).toEqual({
      temp: 73,
    });
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

  it("ignores data-spec chunks in non-assistant messages", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        userMessage("user-1", [
          { type: "text", text: "hello" },
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            spec: cardSpec("Should Not Render"),
          }),
        ]),
      ],
      false,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.role).toBe("user");
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "text",
      text: "hello",
    });
  });

  it("converts data-spec chunks into a hosted component and applies patches", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        assistantMessage("assistant-1", [
          { type: "text", text: "before" },
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            spec: cardSpec("Draft", { items: ["A"] }),
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: 2,
            patch: [
              replacePatch("/props/title", "Ready"),
              addPatch("/props/items/1", "B"),
            ],
          }),
          { type: "text", text: "after" },
        ]),
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
      instanceId: "spec1",
      props: {
        spec: {
          type: "card",
          props: { title: "Ready", items: ["A", "B"] },
        },
      },
    });
  });

  it("preserves custom data-spec component names across patch-only updates", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        assistantMessage("assistant-1", [
          dataSpecPart({
            instanceId: "spec_1",
            name: "status-card",
            sequence: 1,
            spec: cardSpec("Draft"),
          }),
          dataSpecPart({
            instanceId: "spec_1",
            sequence: 2,
            patch: [replacePatch("/props/title", "Ready")],
          }),
        ]),
      ],
      false,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "status-card",
      instanceId: "spec_1",
      props: {
        spec: {
          type: "card",
          props: { title: "Ready" },
        },
      },
    });
  });

  it("ignores stale data-spec chunks when sequence goes backwards", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        assistantMessage("assistant-1", [
          dataSpecPart({
            instanceId: "spec1",
            sequence: 2,
            spec: cardSpec("Latest"),
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            patch: [replacePatch("/props/title", "Stale")],
          }),
        ]),
      ],
      false,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec1",
      props: {
        spec: {
          type: "card",
          props: { title: "Latest" },
        },
      },
    });
  });

  it("rejects prototype-polluting data-spec patches", () => {
    try {
      expectAcrossBothPaths(
        [
          assistantMessage("assistant-1", [
            dataSpecPart({
              instanceId: "spec1",
              sequence: 1,
              spec: cardSpec("Safe"),
            }),
            dataSpecPart({
              instanceId: "spec1",
              sequence: 2,
              patch: [{ op: "add", path: "/__proto__/polluted", value: "yes" }],
            }),
          ]),
        ],
        (result) => {
          expect(result).toHaveLength(1);
          expect(result[0]!.content).toHaveLength(1);
          expect(result[0]!.content[0]).toMatchObject({
            type: "component",
            instanceId: "spec1",
            props: {
              spec: {
                type: "card",
                props: { title: "Safe" },
              },
            },
          });
        },
      );

      expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
    } finally {
      delete (Object.prototype as { polluted?: unknown }).polluted;
    }
  });

  it("drops malformed data-spec patches and keeps the last valid spec", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        assistantMessage("assistant-1", [
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            spec: cardSpec("Initial"),
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: 2,
            patch: [replacePatch("props/title", "Broken")],
          }),
        ]),
      ],
      false,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec1",
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
        assistantMessage("assistant-1", [
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            spec: {
              type: "unknown-layout",
              props: { title: "Draft" },
            },
          }),
        ]),
      ],
      false,
      {
        unstable_dataSpec: {
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
      instanceId: "spec1",
      props: {
        spec: {
          type: "card",
          props: { title: "Repaired" },
        },
      },
    });
  });

  it("emits telemetry events for stale sequence updates and malformed patches", () => {
    const events: unstable_AISDKDataSpecTelemetryEvent[] = [];
    const onTelemetry = (event: unstable_AISDKDataSpecTelemetryEvent) => {
      events.push(event);
    };

    AISDKMessageConverter.toThreadMessages(
      [
        assistantMessage("assistant-1", [
          dataSpecPart({
            instanceId: "spec1",
            sequence: 2,
            spec: cardSpec("Initial"),
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            patch: [replacePatch("/props/title", "Stale")],
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: 3,
            patch: [replacePatch("props/title", "Malformed")],
          }),
        ]),
      ],
      false,
      {
        unstable_dataSpec: {
          onTelemetry,
        },
      },
    );

    expect(events).toContainEqual({
      type: "stale-sequence-ignored",
      instanceId: "spec1",
      sequence: 1,
      latestSequence: 2,
    });
    expect(events).toContainEqual({
      type: "malformed-patch-dropped",
      instanceId: "spec1",
      sequence: 3,
    });
  });

  it("does not re-emit data-spec telemetry on rerender when inputs are unchanged", () => {
    const onTelemetry = vi.fn();
    const args = {
      messages: [
        assistantMessage("assistant-1", [
          dataSpecPart({
            instanceId: "spec1",
            sequence: 2,
            spec: cardSpec("Initial"),
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            patch: [replacePatch("/props/title", "Stale")],
          }),
        ]),
      ],
      isRunning: false,
      metadata: {
        unstable_dataSpec: {
          onTelemetry,
        },
      },
    };

    const { rerender } = renderHook(
      (props) => AISDKMessageConverter.useThreadMessages(props),
      {
        initialProps: args,
      },
    );

    rerender(args);
    expect(onTelemetry).toHaveBeenCalledTimes(1);
    expect(onTelemetry).toHaveBeenCalledWith({
      type: "stale-sequence-ignored",
      instanceId: "spec1",
      sequence: 1,
      latestSequence: 2,
    });
  });

  it("drops malformed data-spec envelopes with invalid props/spec payloads", () => {
    const result = AISDKMessageConverter.toThreadMessages(
      [
        assistantMessage("assistant-1", [
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            spec: cardSpec("Initial"),
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: 2,
            props: [],
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: 3,
            spec: [],
          }),
        ]),
      ],
      false,
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec1",
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
        assistantMessage("assistant-1", [
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            spec: {
              type: "card",
              props: {
                "a/b": "slash-old",
                "tilde~k": "tilde-old",
              },
            },
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: 2,
            patch: [
              replacePatch("/props/a~1b", "slash-new"),
              replacePatch("/props/tilde~0k", "tilde-new"),
            ],
          }),
        ]),
      ],
      false,
      {},
    );

    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec1",
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
    const events: unstable_AISDKDataSpecTelemetryEvent[] = [];

    const result = AISDKMessageConverter.toThreadMessages(
      [
        assistantMessage("assistant-1", [
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            spec: cardSpec("Initial"),
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: 2,
            patch: [replacePatch("/props/title")],
          }),
        ]),
      ],
      false,
      {
        unstable_dataSpec: {
          onTelemetry: (event) => {
            events.push(event);
          },
        },
      },
    );

    expect(events).toContainEqual({
      type: "malformed-patch-dropped",
      instanceId: "spec1",
      sequence: 2,
    });
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec1",
      props: {
        spec: {
          type: "card",
          props: { title: "Initial" },
        },
      },
    });
  });

  it("drops missing/invalid sequence updates and emits telemetry", () => {
    const events: unstable_AISDKDataSpecTelemetryEvent[] = [];
    const result = AISDKMessageConverter.toThreadMessages(
      [
        assistantMessage("assistant-1", [
          dataSpecPart({
            instanceId: "spec1",
            sequence: 1,
            spec: cardSpec("Initial"),
          }),
          dataSpecPart({
            instanceId: "spec1",
            patch: [replacePatch("/props/title", "Missing")],
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: Number.NaN,
            patch: [replacePatch("/props/title", "NaN")],
          }),
          dataSpecPart({
            instanceId: "spec1",
            sequence: -1,
            patch: [replacePatch("/props/title", "Negative")],
          }),
        ]),
      ],
      false,
      {
        unstable_dataSpec: {
          onTelemetry: (event) => events.push(event),
        },
      },
    );

    expect(events).toContainEqual({
      type: "missing-sequence-dropped",
      instanceId: "spec1",
    });
    expect(
      events.filter((event) => event.type === "invalid-sequence-dropped"),
    ).toHaveLength(2);
    expect(result).toHaveLength(1);
    expect(result[0]!.content).toHaveLength(1);
    expect(result[0]!.content[0]).toMatchObject({
      type: "component",
      name: "json-render",
      instanceId: "spec1",
      props: {
        spec: {
          type: "card",
          props: { title: "Initial" },
        },
      },
    });
  });

  it("applies cross-message data-spec patches within a merged assistant chunk", () => {
    const messages = [
      assistantMessage("assistant-1", [
        { type: "text", text: "before" },
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 1,
          spec: cardSpec("Draft"),
        }),
      ]),
      assistantMessage("assistant-2", [
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 2,
          patch: [replacePatch("/props/title", "Ready")],
        }),
        { type: "text", text: "after" },
      ]),
    ] as any[];

    expectAcrossBothPaths(messages, (converted) => {
      expect(converted).toHaveLength(1);
      expect(converted[0]!.content.map((part) => part.type)).toEqual([
        "text",
        "component",
        "text",
      ]);
      expect(converted[0]!.content[1]).toMatchObject({
        type: "component",
        instanceId: "spec_1",
        props: {
          spec: {
            type: "card",
            props: { title: "Ready" },
          },
        },
      });
    });
  });

  it("ignores stale sequence data-spec updates from later assistant messages", () => {
    const messages = [
      assistantMessage("assistant-1", [
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 2,
          spec: cardSpec("Latest"),
        }),
      ]),
      assistantMessage("assistant-2", [
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 1,
          spec: cardSpec("Stale"),
        }),
      ]),
    ] as any[];

    expectAcrossBothPaths(messages, (converted) => {
      expect(converted).toHaveLength(1);
      expect(converted[0]!.content).toHaveLength(1);
      expect(converted[0]!.content[0]).toMatchObject({
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
  });

  it("preserves custom data-spec component names across later updates", () => {
    const messages = [
      assistantMessage("assistant-1", [
        dataSpecPart({
          instanceId: "spec_1",
          name: "status-card",
          sequence: 1,
          spec: cardSpec("Draft"),
        }),
      ]),
      assistantMessage("assistant-2", [
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 2,
          spec: cardSpec("Ready"),
        }),
      ]),
    ] as any[];

    expectAcrossBothPaths(messages, (converted) => {
      expect(converted).toHaveLength(1);
      expect(converted[0]!.content).toHaveLength(1);
      expect(converted[0]!.content[0]).toMatchObject({
        type: "component",
        name: "status-card",
        instanceId: "spec_1",
        props: {
          spec: {
            type: "card",
            props: { title: "Ready" },
          },
        },
      });
    });
  });

  it("dedupes data-spec components to one per instanceId in a final assistant chunk", () => {
    const messages = [
      assistantMessage("assistant-1", [
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 1,
          spec: cardSpec("Initial"),
        }),
      ]),
      assistantMessage("assistant-2", [
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 2,
          spec: cardSpec("Latest"),
        }),
        dataSpecPart({
          instanceId: "spec_2",
          sequence: 1,
          spec: {
            type: "badge",
            props: { label: "Secondary" },
          },
        }),
      ]),
    ] as any[];

    expectAcrossBothPaths(messages, (converted) => {
      expect(converted).toHaveLength(1);
      const componentParts = converted[0]!.content.filter(
        (part): part is any => part.type === "component",
      );
      expect(componentParts).toHaveLength(2);
      expect(
        componentParts.filter((part) => part.instanceId === "spec_1"),
      ).toHaveLength(1);
      expect(
        componentParts.filter((part) => part.instanceId === "spec_2"),
      ).toHaveLength(1);
      expect(
        componentParts.find((part) => part.instanceId === "spec_1"),
      ).toMatchObject({
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
  });

  it("keeps prior valid spec when a later assistant message sends a malformed patch", () => {
    const messages = [
      assistantMessage("assistant-1", [
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 1,
          spec: cardSpec("Initial"),
        }),
      ]),
      assistantMessage("assistant-2", [
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 2,
          patch: [replacePatch("props/title", "Broken")],
        }),
      ]),
    ] as any[];

    expectAcrossBothPaths(messages, (converted) => {
      const component = converted[0]!.content.find(
        (part): part is any =>
          part.type === "component" && part.instanceId === "spec_1",
      );
      expect(component).toMatchObject({
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

  it("applies interleaved multi-instance updates independently across messages", () => {
    const messages = [
      assistantMessage("assistant-1", [
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 1,
          spec: cardSpec("Draft A"),
        }),
      ]),
      assistantMessage("assistant-2", [
        dataSpecPart({
          instanceId: "spec_2",
          sequence: 1,
          spec: { type: "badge", props: { label: "Draft B" } },
        }),
      ]),
      assistantMessage("assistant-3", [
        dataSpecPart({
          instanceId: "spec_1",
          sequence: 2,
          patch: [replacePatch("/props/title", "Ready A")],
        }),
        dataSpecPart({
          instanceId: "spec_2",
          sequence: 2,
          patch: [replacePatch("/props/label", "Ready B")],
        }),
      ]),
    ] as any[];

    expectAcrossBothPaths(messages, (converted) => {
      const componentParts = converted[0]!.content.filter(
        (part): part is any => part.type === "component",
      );
      expect(componentParts).toHaveLength(2);
      expect(
        componentParts.find((part) => part.instanceId === "spec_1"),
      ).toMatchObject({
        props: { spec: { type: "card", props: { title: "Ready A" } } },
      });
      expect(
        componentParts.find((part) => part.instanceId === "spec_2"),
      ).toMatchObject({
        props: { spec: { type: "badge", props: { label: "Ready B" } } },
      });
    });
  });
});
