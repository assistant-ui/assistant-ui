import {
  generateId,
  getExternalStoreMessages,
  type AppendMessage,
  type ThreadMessage,
} from "@assistant-ui/core";
import {
  createToolCallCancellationStub,
  httpUrlPattern,
  parseDataUrl,
  scanPendingToolCalls,
} from "@assistant-ui/core/internal";
import type { AdkMessage } from "./types";

/** Exported for unit tests. */
export const getMessageContent = (msg: AppendMessage) => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((a) => a.content) ?? []),
  ];
  const content = allContent.flatMap((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, url: part.image };
      case "file":
        if (part.sourceType === "url" || httpUrlPattern.test(part.data)) {
          return {
            type: "file_url" as const,
            url: part.data,
            mimeType: part.mimeType,
          };
        }
        return {
          type: "file" as const,
          mimeType: part.mimeType,
          // Lands in Gemini `inlineData.data`, which takes bare base64, so a
          // data URL envelope is stripped rather than forwarded.
          data: parseDataUrl(part.data)?.data ?? part.data,
          ...(part.filename != null && { filename: part.filename }),
        };
      case "audio": {
        const parsed = parseDataUrl(part.audio.data);
        return {
          type: "file" as const,
          mimeType: `audio/${part.audio.format}`,
          data: parsed?.data ?? part.audio.data,
        };
      }
      case "data":
        return [];

      case "tool-call":
        throw new Error("Tool call appends are not supported.");

      default: {
        const _exhaustiveCheck: "reasoning" | "source" | "generative-ui" = type;
        throw new Error(
          `Unsupported append message part type: ${_exhaustiveCheck}`,
        );
      }
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text ?? "";
  }

  return content;
};

/** Exported for unit tests. */
export const getPendingToolCalls = (messages: AdkMessage[]) => {
  return scanPendingToolCalls(
    messages,
    (message) => {
      if (message.type === "ai") {
        return { toolCalls: message.tool_calls ?? [] };
      }
      if (message.type === "tool") {
        return { toolCallId: message.tool_call_id };
      }
      return undefined;
    },
    (toolCall) => toolCall.id,
  );
};

/**
 * Exported for unit tests.
 *
 * Returns `{cancelled: true}` tool responses for pending tool calls when the
 * user sends a new turn, EXCEPT for HITL interrupts marked via
 * `long_running_tool_ids` (`adk_request_input`, `adk_request_confirmation`,
 * `adk_request_credential`). Those must be answered through a dedicated tool
 * UI + submit helper, not auto-cancelled.
 */
export const getPendingCancellations = (
  messages: AdkMessage[],
  longRunningToolIds: readonly string[],
): Array<AdkMessage & { type: "tool" }> => {
  const longRunningSet = new Set(longRunningToolIds);
  return getPendingToolCalls(messages)
    .filter((t) => !longRunningSet.has(t.id))
    .map(
      (t) =>
        ({
          id: generateId(),
          ...createToolCallCancellationStub(t),
        }) satisfies AdkMessage & { type: "tool" },
    );
};

export const truncateAdkMessages = (
  threadMessages: readonly ThreadMessage[],
  parentId: string | null,
): AdkMessage[] => {
  if (parentId === null) return [];
  const parentIndex = threadMessages.findIndex((m) => m.id === parentId);
  if (parentIndex === -1) return [];
  const truncated: AdkMessage[] = [];
  for (let i = 0; i <= parentIndex && i < threadMessages.length; i++) {
    truncated.push(...getExternalStoreMessages<AdkMessage>(threadMessages[i]!));
  }
  return truncated;
};

export const toAdkUserMessage = (
  msg: AppendMessage,
  id = generateId(),
): AdkMessage & { type: "human"; id: string } => ({
  id,
  type: "human",
  content: getMessageContent(msg),
});
