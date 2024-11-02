import { Message } from "@ai-sdk/ui-utils";
import { useExternalMessageConverter } from "@assistant-ui/react";
import { ToolCallContentPart } from "@assistant-ui/react";
import { TextContentPart } from "@assistant-ui/react";
import { CompleteAttachment } from "@assistant-ui/react";

export const convertMessage: useExternalMessageConverter.Callback<Message> = (
  message,
) => {
  switch (message.role) {
    case "user":
      return {
        role: "user",
        id: message.id,
        createdAt: message.createdAt,
        content: message.content,

        attachments: message.experimental_attachments?.map(
          (attachment, idx) =>
            ({
              id: idx.toString(),
              type: "file",
              name: attachment.name ?? attachment.url,
              content: [],
              contentType: attachment.contentType ?? "unknown/unknown",
              status: { type: "complete" },
            }) satisfies CompleteAttachment,
        ),
      };

    case "system":
      return {
        role: "system",
        id: message.id,
        createdAt: message.createdAt,
        content: message.content,
      };

    case "assistant":
      return {
        role: "assistant",
        id: message.id,
        createdAt: message.createdAt,
        content: [
          ...(message.content
            ? [
                {
                  type: "text",
                  text: message.content,
                } satisfies TextContentPart,
              ]
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
        ],
      };

    case "data": {
      type MaybeSupportedDataMessage =
        | { type?: "unsafe_other" }
        | ToolCallContentPart
        | {
            type: "tool-result";
            toolCallId: string;
            result: any;
          };

      if (
        !message.data ||
        !(typeof message.data === "object") ||
        Array.isArray(message.data)
      )
        return [];

      const data = message.data as MaybeSupportedDataMessage;

      if (data.type === "tool-call") {
        return {
          role: "assistant",
          id: message.id,
          createdAt: message.createdAt,
          content: [data],
        };
      } else if (data.type === "tool-result") {
        return {
          role: "tool",
          id: message.id,
          toolCallId: data.toolCallId,
          result: data.result,
        };
      }
      return [];
    }

    default:
      // TODO handle tool and function messages
      const _unsupported: "function" | "tool" = message.role;
      throw new Error(
        `You have a message with an unsupported role. The role ${_unsupported} is not supported.`,
      );
  }
};
