import type { StreamingTimingAccessors } from "@assistant-ui/core/react";
import type { LangChainBaseMessage, LangChainContentBlock } from "./types";
import { getMessageType } from "./convertMessages";

const findAiMessage = (
  messages: readonly LangChainBaseMessage[],
  messageId: string,
): LangChainBaseMessage | undefined =>
  messages.find((m) => getMessageType(m) === "ai" && m.id === messageId);

const getTextLength = (
  messages: readonly LangChainBaseMessage[],
  messageId: string,
): number => {
  const m = findAiMessage(messages, messageId);
  if (!m) return 0;
  const content = m.content;
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  let len = 0;
  for (const part of content as readonly LangChainContentBlock[]) {
    if ("text" in part && typeof part.text === "string")
      len += part.text.length;
    if ("thinking" in part && typeof part.thinking === "string")
      len += part.thinking.length;
  }
  return len;
};

const getToolCallCount = (
  messages: readonly LangChainBaseMessage[],
  messageId: string,
): number => findAiMessage(messages, messageId)?.tool_calls?.length ?? 0;

const getAssistantMessageId = (
  messages: readonly LangChainBaseMessage[],
): string | undefined => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && getMessageType(m) === "ai" && m.id) return m.id;
  }
  return undefined;
};

/**
 * Adapts the shared `useStreamingTiming` primitive to the LangChain
 * `LangChainBaseMessage` shape (`_getType()` -> "ai", duck-typed content
 * blocks, `tool_calls`). The timing state machine itself lives in core.
 */
export const langChainStreamingTimingAccessors: StreamingTimingAccessors<LangChainBaseMessage> =
  {
    getAssistantMessageId,
    getTextLength,
    getToolCallCount,
  };
