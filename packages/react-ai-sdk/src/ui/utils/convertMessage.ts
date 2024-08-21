import { Message } from "ai";
import { ThreadMessageLike } from "@assistant-ui/react";
import { ToolCallContentPart } from "@assistant-ui/react";
import { TextContentPart } from "@assistant-ui/react";

export const convertMessage = (messages: Message[]): ThreadMessageLike => {
  const firstMessage = messages[0];
  if (!firstMessage) throw new Error("No messages found");

  const common = {
    id: firstMessage.id,
    createdAt: firstMessage.createdAt ?? new Date(),
  };

  switch (firstMessage.role) {
    case "user":
      if (messages.length > 1) {
        throw new Error(
          "Multiple user messages found. This is likely an internal bug in assistant-ui.",
        );
      }

      return {
        ...common,
        role: "user",
        content: [{ type: "text", text: firstMessage.content }],
      };

    case "system":
      return {
        ...common,
        role: "system",
        content: [{ type: "text", text: firstMessage.content }],
      };

    case "data":
    case "assistant": {
      const res: ThreadMessageLike = {
        ...common,
        role: "assistant",
        content: messages.flatMap((message) => {
          return [
            ...(message.content
              ? [{ type: "text", text: message.content } as TextContentPart]
              : []),
            ...(message.toolInvocations?.map(
              (t) =>
                ({
                  type: "tool-call",
                  toolName: t.toolName,
                  toolCallId: t.toolCallId,
                  argsText: JSON.stringify(t.args),
                  args: t.args,
                  result: "result" in t ? t.result : undefined,
                }) satisfies ToolCallContentPart,
            ) ?? []),
            ...(typeof message.data === "object" &&
            !Array.isArray(message.data) &&
            message.data?.["type"] === "tool-call"
              ? [message.data as ToolCallContentPart]
              : []),
          ];
        }),
      };

      for (const message of messages) {
        if (
          typeof message.data === "object" &&
          !Array.isArray(message.data) &&
          message.data?.["type"] === "tool-result"
        ) {
          const toolCallId = message.data["toolCallId"];
          const toolContent = res.content.find(
            (c) => c.type === "tool-call" && c.toolCallId === toolCallId,
          ) as ToolCallContentPart | undefined;
          if (!toolContent) throw new Error("Tool call not found");
          toolContent.result = message.data["result"];
        }
      }

      return res;
    }

    default:
      const _unsupported: "function" | "tool" = firstMessage.role;
      throw new Error(
        `You have a message with an unsupported role. The role ${_unsupported} is not supported.`,
      );
  }
};
