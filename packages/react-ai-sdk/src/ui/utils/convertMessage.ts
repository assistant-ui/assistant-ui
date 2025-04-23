import { Message } from "@ai-sdk/ui-utils";
import {
  unstable_createMessageConverter,
  type ReasoningContentPart,
  type ToolCallContentPart,
  type TextContentPart,
  type CompleteAttachment,
  type SourceContentPart,
  type FileContentPart,
} from "@assistant-ui/react";

export const AISDKMessageConverter = unstable_createMessageConverter(
  (message: Message) => {
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
          content:
            message.parts
              ?.filter((p) => p.type !== "step-start")
              .map((part) => {
                const type = part.type;
                switch (type) {
                  case "text":
                    return {
                      type: "text",
                      text: part.text,
                    } satisfies TextContentPart;
                  case "tool-invocation":
                    return {
                      type: "tool-call",
                      toolName: part.toolInvocation.toolName,
                      toolCallId: part.toolInvocation.toolCallId,
                      argsText: JSON.stringify(part.toolInvocation.args),
                      args: part.toolInvocation.args,
                      result:
                        part.toolInvocation.state === "result" &&
                        part.toolInvocation.result,
                    } satisfies ToolCallContentPart;
                  case "reasoning":
                    return {
                      type: "reasoning",
                      text: part.reasoning,
                    } satisfies ReasoningContentPart;

                  case "source":
                    return {
                      type: "source",
                      ...part.source,
                    } satisfies SourceContentPart;

                  case "file":
                    return {
                      type: "file",
                      data: part.data,
                      mimeType: part.mimeType,
                    } satisfies FileContentPart;

                  default: {
                    const _unsupported: never = type;
                    throw new Error(
                      `You have a message with an unsupported part type. The type ${_unsupported} is not supported.`,
                    );
                  }
                }
              }) ??
            (message.content
              ? [
                  {
                    type: "text",
                    text: message.content,
                  } satisfies TextContentPart,
                ]
              : []),
          metadata: {
            unstable_annotations: message.annotations,
            unstable_data: Array.isArray(message.data)
              ? message.data
              : message.data
                ? [message.data]
                : undefined,
          },
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
  },
);
