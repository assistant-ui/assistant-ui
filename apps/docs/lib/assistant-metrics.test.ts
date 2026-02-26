import { expect, it } from "vitest";
import { getThreadMessageTokenUsage } from "@assistant-ui/react-ai-sdk";

it("reads usage from legacy custom.usage metadata path", () => {
  const usage = getThreadMessageTokenUsage({
    role: "assistant",
    metadata: {
      custom: {
        usage: { inputTokens: 4, outputTokens: 6 },
      },
    },
  });

  expect(usage).toEqual({
    totalTokens: 10,
    inputTokens: 4,
    outputTokens: 6,
  });
});
