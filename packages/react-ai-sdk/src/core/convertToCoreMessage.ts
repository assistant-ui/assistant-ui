import type { ThreadMessage } from "@assistant-ui/react";
import type {
  CoreMessage,
  ImagePart,
  TextPart,
  ToolCallPart,
  ToolResultPart,
} from "ai";

export const convertToCoreMessage = (message: ThreadMessage): CoreMessage[] => {
  const expandedMessages: CoreMessage[] = [
    {
      role: message.role,
      content: [],
    },
  ];

  const addContent = (
    content: TextPart | ImagePart | ToolCallPart | ToolResultPart,
  ) => {
    const lastMessage = expandedMessages.at(-1);
    if (!lastMessage) throw new Error("No last message");

    if (
      (lastMessage.role === "tool" && content.type !== "tool-result") ||
      (lastMessage.role !== "tool" && content.type === "tool-result")
    ) {
      expandedMessages.push({
        role: content.type === "tool-result" ? "tool" : message.role,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        content: [content] as any,
      });
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      (lastMessage.content as Array<any>).push(content);
    }
  };

  for (const part of message.content) {
    if (part.type === "text") {
      addContent({ type: "text", text: part.text });
    } else if (message.role === "user" && part.type === "image") {
      addContent({ type: "image", image: part.image });
    } else if (message.role === "assistant" && part.type === "tool-call") {
      // TODO bundle multiple tool calls
      addContent({
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args: part.args,
      });
      addContent({
        type: "tool-result",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        result: part.result,
      });
    } else throw new Error(`Unknown content part type: ${part.type}`);
  }

  return expandedMessages;
};
