import {
  PiThreadController,
  type PiAgentMessage,
  type PiAssistantMessage,
  type PiClient,
  type PiClientEvent,
  type PiThreadSnapshot,
} from "@assistant-ui/react-pi";
import { bench, describe } from "vitest";

const assistantMessage = (
  text: string,
  timestamp: number,
): PiAssistantMessage => ({
  role: "assistant",
  content: [{ type: "text", text }],
  api: "anthropic-messages",
  provider: "anthropic",
  model: "claude",
  usage: {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  },
  stopReason: "stop",
  timestamp,
});

const createStreamingUpdate = async (size: number) => {
  const threadId = `thread-${size}`;
  const messages: PiAgentMessage[] = Array.from(
    { length: size },
    (_, index) => ({
      role: "user",
      content: `message-${index}`,
      timestamp: index,
    }),
  );
  const snapshot: PiThreadSnapshot = {
    metadata: { id: threadId, status: "running" },
    messages,
  };
  let listener: ((event: PiClientEvent) => void) | undefined;
  const client = {
    getThread: async () => snapshot,
    subscribe: (_threadId, next) => {
      listener = next;
      return () => {};
    },
  } as PiClient;
  const scheduled: Array<() => void> = [];
  const controller = new PiThreadController(client, threadId, {
    scheduleNotify: (flush) => scheduled.push(flush),
  });
  controller.connect();
  await controller.load();

  let sequence = 1;
  listener?.({
    type: "message_start",
    threadId,
    seq: sequence,
    message: assistantMessage("", size),
  });

  return () => {
    sequence += 1;
    const message = assistantMessage(`token-${sequence}`, size);
    listener?.({
      type: "message_update",
      threadId,
      seq: sequence,
      message,
      assistantMessageEvent: {
        type: "text_delta",
        contentIndex: 0,
        delta: "x",
        partial: message,
      },
    });
    scheduled.shift()?.();
  };
};

describe("react-pi: streaming tail projection", async () => {
  for (const size of [10, 1_000, 5_000]) {
    const update = await createStreamingUpdate(size);
    bench(`${size} stable messages`, update);
  }
});
