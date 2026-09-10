import { convertExternalMessages } from "@assistant-ui/core/react";
import { bench, describe } from "vitest";

const makeMessage = (count: number) => ({
  role: "assistant" as const,
  content: Array.from({ length: count }, (_, index) => ({
    type: "tool-call" as const,
    toolCallId: `call-${index}`,
    toolName: "search",
    args: { query: `query-${index}` },
  })),
});

describe("core: external message tool calls", () => {
  for (const count of [100, 1_000, 5_000]) {
    const messages = [makeMessage(count)];
    bench(`${count} unique tool calls`, () => {
      convertExternalMessages(messages, (message) => message, false, {});
    });
  }
});
