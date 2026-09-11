import { bench, describe } from "vitest";
import {
  fromThreadMessageLike,
  type ThreadMessageLike,
} from "@assistant-ui/core";

const status = { type: "complete", reason: "unknown" } as const;

const textMessage = (parts: number): ThreadMessageLike => ({
  role: "assistant",
  content: Array.from({ length: parts }, (_, i) => ({
    type: "text" as const,
    text: `part ${i} of the answer, long enough to look like a sentence.`,
  })),
});

const toolMessage = (calls: number): ThreadMessageLike => ({
  role: "assistant",
  content: Array.from({ length: calls }, (_, i) => ({
    type: "tool-call" as const,
    toolCallId: `call_${i}`,
    toolName: "search_docs",
    args: { query: `query ${i}`, page: i },
    result: { hits: [i, i + 1, i + 2] },
  })),
});

describe("core: fromThreadMessageLike text parts", () => {
  for (const n of [1, 10, 100]) {
    const like = textMessage(n);
    bench(`${n} text parts`, () => {
      fromThreadMessageLike(like, "fallback-id", status);
    });
  }
});

describe("core: fromThreadMessageLike tool calls", () => {
  for (const n of [1, 10, 100]) {
    const like = toolMessage(n);
    bench(`${n} tool calls`, () => {
      fromThreadMessageLike(like, "fallback-id", status);
    });
  }
});
