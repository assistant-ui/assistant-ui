import type {
  ChatModelAdapter,
  ChatModelRunResult,
  MessageStatus,
  ToolCallMessagePart,
} from "@assistant-ui/react";
import type { EventBridge } from "./bridge";

export type ChatModelAdapterOptions = {
  bridge: EventBridge;
  onRunStart?: () => void;
};

type Part =
  | { type: "text"; text: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      argsText: string;
      result?: unknown;
    };

function finishStatus(reason: "stop" | "abort" | "error"): MessageStatus {
  if (reason === "stop") {
    return { type: "complete", reason: "stop" };
  }
  if (reason === "abort") {
    return { type: "incomplete", reason: "cancelled" };
  }
  return { type: "incomplete", reason: "error" };
}

export function buildChatModelAdapter(
  options: ChatModelAdapterOptions,
): ChatModelAdapter {
  return {
    run: async function* (): AsyncGenerator<ChatModelRunResult, void> {
      options.onRunStart?.();

      const parts: Part[] = [];
      let textIndex: number | null = null;

      for await (const event of options.bridge.consume()) {
        switch (event.type) {
          case "text-delta": {
            if (textIndex === null) {
              parts.push({ type: "text", text: event.delta });
              textIndex = parts.length - 1;
            } else {
              const current = parts[textIndex] as {
                type: "text";
                text: string;
              };
              parts[textIndex] = {
                type: "text",
                text: current.text + event.delta,
              };
            }
            yield { content: snapshot(parts) };
            break;
          }
          case "tool-call": {
            parts.push({
              type: "tool-call",
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.args,
              argsText: event.argsText,
            });
            textIndex = null;
            yield { content: snapshot(parts) };
            break;
          }
          case "tool-result": {
            const idx = parts.findIndex(
              (p): p is Extract<Part, { type: "tool-call" }> =>
                p.type === "tool-call" && p.toolCallId === event.toolCallId,
            );
            if (idx !== -1) {
              const tc = parts[idx] as Extract<Part, { type: "tool-call" }>;
              parts[idx] = { ...tc, result: event.value };
              yield { content: snapshot(parts) };
            }
            break;
          }
          case "finish": {
            yield {
              content: snapshot(parts),
              status: finishStatus(event.reason),
            };
            return;
          }
          case "transport-error":
          case "disconnect": {
            yield {
              content: snapshot(parts),
              status: { type: "incomplete", reason: "error" },
            };
            return;
          }
        }
      }

      yield { content: snapshot(parts) };
    },
  };
}

function snapshot(parts: Part[]): ChatModelRunResult["content"] {
  return parts.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text } as const;
    }
    return {
      type: "tool-call",
      toolCallId: part.toolCallId,
      toolName: part.toolName,
      args: part.args as ToolCallMessagePart["args"],
      argsText: part.argsText,
      ...(part.result !== undefined ? { result: part.result } : {}),
    } satisfies ToolCallMessagePart;
  });
}
