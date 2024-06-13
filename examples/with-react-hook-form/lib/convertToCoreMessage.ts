import type { CoreMessage, Message } from "ai";

export const convertToCoreMessage = (message: Message): CoreMessage[] => {
  const expandedMessages: CoreMessage[] = [];
  if (message.toolInvocations?.length) {
    expandedMessages.push({
      role: "assistant",
      content: [
        { type: "text", text: message.content },
        ...message.toolInvocations.map(({ toolCallId, toolName, args }) => ({
          type: "tool-call" as const,
          toolName,
          toolCallId,
          args,
        })),
      ],
    });

    expandedMessages.push({
      role: "tool",
      content: message.toolInvocations.map((toolCall) => {
        if (!("result" in toolCall)) throw new Error("Missing result");
        return {
          type: "tool-result" as const,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          result: toolCall.result,
        };
      }),
    });
  } else {
    expandedMessages.push(message as CoreMessage);
  }

  return expandedMessages;
};
