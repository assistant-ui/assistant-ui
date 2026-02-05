import assert from "node:assert/strict";
import test from "node:test";
import { getAssistantMessageTokenUsage } from "./assistant-metrics";

test("getAssistantMessageTokenUsage returns empty for zero-token custom usage", () => {
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

  assert.deepEqual(usage, {});
});

test("getAssistantMessageTokenUsage returns totals for positive usage", () => {
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

  assert.deepEqual(usage, {
    totalTokens: 10,
    inputTokens: 4,
    outputTokens: 6,
  });
});
