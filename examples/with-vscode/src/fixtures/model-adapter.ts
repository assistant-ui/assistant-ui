import type {
  ChatModelAdapter,
  ThreadAssistantMessagePart,
  ThreadMessage,
} from "@assistant-ui/react";
import { playFixture, selectFixture } from "./fixtures";

const lastUserText = (messages: readonly ThreadMessage[]) => {
  const last = messages.findLast((m) => m.role === "user");
  return (
    last?.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("") ?? ""
  );
};

const toolResultsOf = (message: ThreadMessage) => {
  const results = new Map<string, unknown>();
  if (message.role !== "assistant") return results;
  for (const part of message.content) {
    if (part.type === "tool-call" && part.result !== undefined) {
      results.set(part.toolCallId, part.result);
    }
  }
  return results;
};

export const createFixtureModelAdapter = ({
  delayMs,
}: { delayMs?: number } = {}): ChatModelAdapter => ({
  async *run({ messages, abortSignal, unstable_getMessage }) {
    const prompt = lastUserText(messages);
    const steps = selectFixture(prompt).script({
      prompt,
      toolResults: toolResultsOf(unstable_getMessage()),
    });

    const parts: ThreadAssistantMessagePart[] = [];
    const textIndex = new Map<string, number>();
    for await (const event of playFixture(steps, {
      signal: abortSignal,
      ...(delayMs !== undefined && { delayMs }),
    })) {
      switch (event.type) {
        case "text-delta": {
          const index = textIndex.get(event.id);
          if (index === undefined) {
            textIndex.set(
              event.id,
              parts.push({ type: "text", text: event.delta }) - 1,
            );
          } else {
            const part = parts[index] as { type: "text"; text: string };
            parts[index] = { type: "text", text: part.text + event.delta };
          }
          break;
        }
        case "tool-call":
          parts.push({
            type: "tool-call",
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: event.args as never,
            argsText: JSON.stringify(event.args),
          });
          break;
        case "tool-result": {
          const index = parts.findIndex(
            (p) => p.type === "tool-call" && p.toolCallId === event.toolCallId,
          );
          parts[index] = {
            ...(parts[index] as Extract<
              ThreadAssistantMessagePart,
              { type: "tool-call" }
            >),
            result: event.result,
          };
          break;
        }
        case "error":
          throw new Error(event.message);
      }
      yield { content: [...parts] };
    }

    const awaitingClient = parts.some(
      (p) => p.type === "tool-call" && p.result === undefined,
    );
    if (awaitingClient) {
      yield {
        content: [...parts],
        status: { type: "requires-action", reason: "tool-calls" },
      };
    }
  },
});
