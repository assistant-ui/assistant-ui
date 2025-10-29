import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";

import { __test__ } from "./convertMessage";
import {
  createReasoningOrdinalContext,
  resolveReasoningDuration,
  sanitizeHistoryForOutbound,
} from "./reasoning";

const { convertParts } = __test__;

const makeAssistantMessage = (
  parts: UIMessage["parts"],
  metadata?: Record<string, unknown>,
): UIMessage =>
  ({
    id: "assistant-1",
    role: "assistant",
    parts,
    metadata,
  }) as UIMessage;

const reasoningPart = (
  overrides: Partial<UIMessage["parts"] extends (infer P)[] ? P : never> = {},
) =>
  ({
    type: "reasoning",
    text: "thinking",
    state: "done",
    ...overrides,
  }) as any;

describe("reasoningHelpers", () => {
  it("assigns ordinals consistently for repeated itemIds", () => {
    const message = makeAssistantMessage([
      reasoningPart({ providerMetadata: { openai: { itemId: "rs" } } }),
      reasoningPart({ providerMetadata: { openai: { itemId: "rs" } } }),
    ]);

    const context = createReasoningOrdinalContext();
    const first = context.getOrdinal(message.parts![0]!, 0);
    const second = context.getOrdinal(message.parts![1]!, 1);

    expect(first).toEqual({ ordinal: 0, itemId: "rs" });
    expect(second).toEqual({ ordinal: 0, itemId: "rs" });
  });

  it("falls back to part index when itemId missing", () => {
    const message = makeAssistantMessage([
      reasoningPart({ providerMetadata: undefined }),
      reasoningPart({ providerMetadata: undefined }),
    ]);

    const context = createReasoningOrdinalContext();
    const first = context.getOrdinal(message.parts![0]!, 0);
    const second = context.getOrdinal(message.parts![1]!, 1);

    expect(first).toEqual({ ordinal: 0 });
    expect(second).toEqual({ ordinal: 1 });
  });

  it("resolves runtime and stored durations", () => {
    const runtimeDurations = { "assistant-1#r0": 6 };
    const storedDurations = { r0: 8 };

    const fromRuntime = resolveReasoningDuration(
      runtimeDurations,
      storedDurations,
      "assistant-1",
      0,
    );
    expect(fromRuntime).toEqual({ duration: 6, storedKey: "r0" });

    const withoutRuntime = resolveReasoningDuration(
      {},
      storedDurations,
      "assistant-1",
      0,
    );
    expect(withoutRuntime).toEqual({ duration: 8, storedKey: "r0" });

    const missing = resolveReasoningDuration({}, {}, "assistant-1", 0);
    expect(missing).toEqual({ duration: undefined, storedKey: "r0" });
  });
});

describe("reasoning integration", () => {
  it("maps runtime durations to stored rN keys", () => {
    const message = makeAssistantMessage([
      reasoningPart({ providerMetadata: { openai: { itemId: "rs_1" } } }),
      { type: "text", text: "answer" } as any,
    ]);

    const { parts, storedReasoningDurations } = convertParts(message, {
      reasoningDurations: {
        "assistant-1#r0": 7,
      },
    });

    expect(parts[0]).toMatchObject({
      type: "reasoning",
      duration: 7,
    });
    expect(storedReasoningDurations).toEqual({ r0: 7 });
  });

  it("reads persisted rN durations from message metadata", () => {
    const message = makeAssistantMessage(
      [
        reasoningPart({ providerMetadata: { openai: { itemId: "rs_1" } } }),
        { type: "text", text: "answer" } as any,
      ],
      {
        reasoningDurations: {
          r0: 9,
        },
      },
    );

    const { parts, storedReasoningDurations } = convertParts(message, {});

    expect(parts[0]).toMatchObject({
      type: "reasoning",
      duration: 9,
    });
    expect(storedReasoningDurations).toEqual({ r0: 9 });
  });

  it("assigns ordinals when provider itemId is absent", () => {
    const message = makeAssistantMessage(
      [
        reasoningPart({ providerMetadata: undefined }),
        { type: "text", text: "answer" } as any,
      ],
      {
        reasoningDurations: {
          r0: 3,
        },
      },
    );

    const { parts, storedReasoningDurations } = convertParts(message, {});

    expect(parts[0]).toMatchObject({
      type: "reasoning",
      duration: 3,
    });
    expect(storedReasoningDurations).toEqual({ r0: 3 });
  });
});

describe("sanitizeHistoryForOutbound", () => {
  it("strips provider itemId while keeping other metadata", () => {
    const [sanitized] = sanitizeHistoryForOutbound([
      makeAssistantMessage(
        [
          reasoningPart({
            providerMetadata: {
              openai: { itemId: "rs_1", custom: "keep" },
            },
          }),
          { type: "text", text: "answer" } as any,
        ],
        {
          reasoningDurations: { r0: 1 },
          custom: { note: "keep" },
        },
      ),
    ]);

    expect(sanitized.parts?.[0]?.providerMetadata).toEqual({
      openai: { custom: "keep" },
    });
    expect((sanitized as any).metadata).toEqual({
      reasoningDurations: { r0: 1 },
      custom: { note: "keep" },
    });
  });

  it("removes provider metadata entirely when itemId was the only field", () => {
    const [sanitized] = sanitizeHistoryForOutbound([
      makeAssistantMessage([
        reasoningPart({ providerMetadata: { openai: { itemId: "rs_only" } } }),
      ]),
    ]);

    expect(sanitized.parts?.[0]?.providerMetadata).toBeUndefined();
  });
});
