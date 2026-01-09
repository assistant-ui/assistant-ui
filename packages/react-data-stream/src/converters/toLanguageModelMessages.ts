import type {
  JSONValue,
  LanguageModelV2FilePart,
  LanguageModelV2Message,
  LanguageModelV2TextPart,
  LanguageModelV2ToolCallPart,
  LanguageModelV2ToolResultPart,
} from "@ai-sdk/provider";
import {
  TextMessagePart,
  ThreadMessage,
  ToolCallMessagePart,
} from "@assistant-ui/react";

const IMAGE_MEDIA_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  tiff: "image/tiff",
  tif: "image/tiff",
};

const inferImageMediaType = (url: string): string => {
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0] ?? "";
  return IMAGE_MEDIA_TYPES[ext] ?? "image/png";
};

const assistantMessageSplitter = () => {
  const stash: LanguageModelV2Message[] = [];
  let assistantMessage = {
    role: "assistant" as const,
    content: [] as (LanguageModelV2TextPart | LanguageModelV2ToolCallPart)[],
  };
  let toolMessage = {
    role: "tool" as const,
    content: [] as LanguageModelV2ToolResultPart[],
  };

  return {
    addTextMessagePart: (part: TextMessagePart) => {
      if (toolMessage.content.length > 0) {
        stash.push(assistantMessage);
        stash.push(toolMessage);

        assistantMessage = {
          role: "assistant" as const,
          content: [] as (
            | LanguageModelV2TextPart
            | LanguageModelV2ToolCallPart
          )[],
        };

        toolMessage = {
          role: "tool" as const,
          content: [] as LanguageModelV2ToolResultPart[],
        };
      }

      assistantMessage.content.push(part);
    },
    addToolCallPart: (part: ToolCallMessagePart) => {
      assistantMessage.content.push({
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.args,
      });

      toolMessage.content.push({
        type: "tool-result",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        output:
          part.result === undefined
            ? { type: "error-text", value: "Error: tool has no configured code to run" }
            : part.isError
              ? { type: "error-json", value: part.result as JSONValue }
              : { type: "json", value: part.result as JSONValue },
      });
    },
    getMessages: () => {
      if (toolMessage.content.length > 0) {
        return [...stash, assistantMessage, toolMessage];
      }

      return [...stash, assistantMessage];
    },
  };
};

/**
 * @deprecated This is an internal API and may change without notice.
 */
export function toLanguageModelMessages(
  message: readonly ThreadMessage[],
  options: { unstable_includeId?: boolean | undefined } = {},
): LanguageModelV2Message[] {
  const includeId = options.unstable_includeId ?? false;
  return message.flatMap((message) => {
    const role = message.role;
    switch (role) {
      case "system": {
        return [
          {
            ...(includeId
              ? { unstable_id: (message as ThreadMessage).id }
              : {}),
            role: "system",
            content: message.content[0].text,
          },
        ];
      }

      case "user": {
        const attachments = "attachments" in message ? message.attachments : [];
        const content = [
          ...message.content,
          ...attachments.map((a) => a.content).flat(),
        ];
        const msg: LanguageModelV2Message = {
          ...(includeId ? { unstable_id: (message as ThreadMessage).id } : {}),
          role: "user",
          content: content.map(
            (part): LanguageModelV2TextPart | LanguageModelV2FilePart => {
              const type = part.type;
              switch (type) {
                case "text": {
                  return part;
                }

                case "image": {
                  // ImageMessagePart doesn't include media type info, so we infer from URL
                  return {
                    type: "file",
                    data: new URL(part.image),
                    mediaType: inferImageMediaType(part.image),
                  };
                }

                case "file": {
                  return {
                    type: "file",
                    data: new URL(part.data),
                    mediaType: part.mimeType,
                  };
                }

                default: {
                  const unhandledType: "audio" = type;
                  throw new Error(
                    `Unsupported message part type: ${unhandledType}`,
                  );
                }
              }
            },
          ),
        };
        return [msg];
      }

      case "assistant": {
        const splitter = assistantMessageSplitter();
        for (const part of message.content) {
          const type = part.type;
          switch (type) {
            case "reasoning":
            case "source":
            case "file":
            case "data":
            case "image": {
              break; // reasoning, source, file, and image parts are omitted
            }

            case "text": {
              splitter.addTextMessagePart(part);
              break;
            }
            case "tool-call": {
              splitter.addToolCallPart(part);
              break;
            }
            default: {
              const unhandledType: never = type;
              throw new Error(`Unhandled message part type: ${unhandledType}`);
            }
          }
        }
        return splitter.getMessages();
      }

      default: {
        const unhandledRole: never = role;
        throw new Error(`Unknown message role: ${unhandledRole}`);
      }
    }
  });
}
