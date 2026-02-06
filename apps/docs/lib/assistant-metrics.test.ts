import { expect, it } from "vitest";
import { getAssistantMessageTokenUsage } from "./assistant-metrics";

it("getAssistantMessageTokenUsage returns empty for zero-token custom usage", () => {
  const usage = getAssistantMessageTokenUsage({
    role: "assistant",
    metadata: {
      custom: {
        usage: {
          inputTokens: 0,
        },
      },
    },
  });

  expect(usage).toEqual({});
});

it("getAssistantMessageTokenUsage returns totals for positive usage", () => {
  const usage = getAssistantMessageTokenUsage({
    role: "assistant",
    metadata: {
      custom: {
        usage: {
          inputTokens: 4,
          outputTokens: 6,
        },
      },
    },
  });

  expect(usage).toEqual({
    totalTokens: 10,
    inputTokens: 4,
    outputTokens: 6,
  });
});
