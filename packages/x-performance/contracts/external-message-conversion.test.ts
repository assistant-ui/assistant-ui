// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  convertExternalMessages,
  createExternalMessageConversionCache,
  type useExternalMessageConverter,
} from "@assistant-ui/core/react";

type Message = useExternalMessageConverter.Message;
type Source = { message: Message };

let contentReads = 0;

// Joining a chunk reads the content of each of its messages, so content reads
// of finished messages count how often their chunks are joined.
const withCountedContent = <T extends Message & { content: unknown }>(
  message: T,
): T => {
  const { content, ...rest } = message;
  return Object.defineProperty(rest, "content", {
    enumerable: true,
    get() {
      contentReads += 1;
      return content;
    },
  }) as T;
};

const history: Source[] = [
  {
    message: withCountedContent({
      id: "user",
      role: "user",
      content: "question",
    }),
  },
  {
    message: withCountedContent({
      id: "assistant",
      role: "assistant",
      content: [
        { type: "text", text: "answer" },
        { type: "tool-call", toolCallId: "done", toolName: "search", args: {} },
        {
          type: "tool-call",
          toolCallId: "pending",
          toolName: "search",
          args: {},
        },
      ],
    }),
  },
  {
    message: {
      role: "tool",
      toolCallId: "done",
      toolName: "search",
      result: {},
    },
  },
  // A user message ends the finished turn, so the streaming assistant joins
  // a chunk of its own.
  {
    message: withCountedContent({
      id: "user-last",
      role: "user",
      content: "last question",
    }),
  },
];

const streaming = (text: string): Source => ({
  message: { id: "streaming", role: "assistant", content: text },
});

const callback = (source: Source) => source.message;
const metadata = {};

describe("external message conversion on a streaming delta", () => {
  it("joins only the streaming chunk while finished chunks stay cached", () => {
    const cache = createExternalMessageConversionCache();
    const convert = (sources: Source[], isRunning: boolean) =>
      convertExternalMessages(sources, callback, isRunning, metadata, cache);

    const initial = convert([...history, streaming("")], true);
    const finished = initial.slice(0, -1);
    expect(finished[1]?.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });

    contentReads = 0;
    const last = streaming("token");
    const latest = convert([...history, last], true);

    expect(contentReads).toBe(0);
    latest.slice(0, -1).forEach((m, i) => expect(m).toBe(finished[i]));
    expect(latest.at(-1)?.status?.type).toBe("running");

    const settled = convert([...history, last], false);
    expect(contentReads).toBe(0);
    settled.slice(0, -1).forEach((m, i) => expect(m).toBe(finished[i]));
    expect(settled.at(-1)?.status?.type).toBe("complete");
  });
});
