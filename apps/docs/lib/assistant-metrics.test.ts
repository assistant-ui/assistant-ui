import { expect, it } from "vitest";
import { getThreadMessageTokenUsage } from "@assistant-ui/react-ai-sdk";

it("getThreadMessageTokenUsage returns zero-token usage for custom usage metadata", () => {
  const assistantMessage = {
    id: "m-1",
    createdAt: new Date(),
    content: [],
    status: { type: "complete" },
    role: "assistant",
    metadata: {
      custom: {
        usage: {
          inputTokens: 0,
        },
      },
    },
  };
  const usage = getThreadMessageTokenUsage(assistantMessage);

  expect(usage).toEqual({
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
  });
});

it("getThreadMessageTokenUsage returns totals for positive usage", () => {
  const assistantMessage = {
    id: "m-1",
    createdAt: new Date(),
    content: [],
    status: { type: "complete" },
    role: "assistant",
    metadata: {
      custom: {
        usage: {
          inputTokens: 4,
          outputTokens: 6,
        },
      },
    },
  };
  const usage = getThreadMessageTokenUsage(assistantMessage);

  expect(usage).toEqual({
    totalTokens: 10,
    inputTokens: 4,
    outputTokens: 6,
  });
});
