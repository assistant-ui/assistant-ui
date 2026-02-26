import { describe, expect, it } from "vitest";
import { getThreadMessageTokenUsage } from "./usage";

const msg = (metadata: unknown) => ({
  role: "assistant" as const,
  metadata,
});

describe("getThreadMessageTokenUsage", () => {
  it("does not double-count reasoning/cached in fallback totalTokens", () => {
    const usage = getThreadMessageTokenUsage(
      msg({
        usage: {
          inputTokens: 4,
          outputTokens: 6,
          reasoningTokens: 9,
          cachedInputTokens: 3,
        },
      }),
    );

    // totalTokens = input + output only; reasoning/cached are detail fields
    expect(usage).toEqual({
      totalTokens: 10,
      inputTokens: 4,
      outputTokens: 6,
      reasoningTokens: 9,
      cachedInputTokens: 3,
    });
  });

  it("does not fabricate zero splits when only totalTokens is present", () => {
    const usage = getThreadMessageTokenUsage(
      msg({ usage: { totalTokens: 12 } }),
    );

    expect(usage).toEqual({ totalTokens: 12 });
    expect(usage).not.toHaveProperty("inputTokens");
    expect(usage).not.toHaveProperty("outputTokens");
  });

  it("aggregates multi-step usage without inflating totals", () => {
    const usage = getThreadMessageTokenUsage(
      msg({
        steps: [
          { usage: { inputTokens: 3, outputTokens: 2, reasoningTokens: 11 } },
          { usage: { inputTokens: 4, outputTokens: 1, reasoningTokens: 13 } },
        ],
      }),
    );

    expect(usage).toEqual({
      totalTokens: 10,
      inputTokens: 7,
      outputTokens: 3,
      reasoningTokens: 24,
    });
  });
});
