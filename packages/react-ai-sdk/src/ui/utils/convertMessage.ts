import { isToolUIPart, UIMessage } from "ai";
import {
  unstable_createMessageConverter,
  type ReasoningMessagePart,
  type ToolCallMessagePart,
  type TextMessagePart,
  type SourceMessagePart,
} from "@assistant-ui/react";

const convertParts = (message: UIMessage) => {
  if (!message.parts || message.parts.length === 0) {
    return [];
  }

  return message.parts
    .filter((p) => p.type !== "step-start" && p.type !== "file")
    .map((part) => {
      const type = part.type;

      // Handle text parts
      if (type === "text") {
        return {
          type: "text",
          text: part.text,
        } satisfies TextMessagePart;
      }

      // Handle reasoning parts
      if (type === "reasoning") {
        return {
          type: "reasoning",
          text: part.text,
        } satisfies ReasoningMessagePart;
      }

      // Handle tool-* parts (AI SDK v5 tool calls)
      if (isToolUIPart(part)) {
        const toolName = type.replace("tool-", "");
        const toolCallId = part.toolCallId;

        // Extract args and result based on state
        let args: any = {};
        let result: any = undefined;
        let isError = false;

        if (
          part.state === "input-streaming" ||
          part.state === "input-available"
        ) {
          args = part.input || {};
        } else if (part.state === "output-available") {
          args = part.input || {};
          result = part.output;
        } else if (part.state === "output-error") {
          args = part.input || {};
          isError = true;
          result = { error: part.errorText };
        }

        return {
          type: "tool-call",
          toolName,
          toolCallId,
          argsText: JSON.stringify(args),
          args,
          result,
          isError,
        } satisfies ToolCallMessagePart;
      }

      // Handle dynamic-tool parts
      if (type === "dynamic-tool") {
        const toolName = part.toolName;
        const toolCallId = part.toolCallId;

        // Extract args and result based on state
        let args: any = {};
        let result: any = undefined;
        let isError = false;

        if (
          part.state === "input-streaming" ||
          part.state === "input-available"
        ) {
          args = part.input || {};
        } else if (part.state === "output-available") {
          args = part.input || {};
          result = part.output;
        } else if (part.state === "output-error") {
          args = part.input || {};
          isError = true;
          result = { error: part.errorText };
        }

        return {
          type: "tool-call",
          toolName,
          toolCallId,
          argsText: JSON.stringify(args),
          args,
          result,
          isError,
        } satisfies ToolCallMessagePart;
      }

      // Handle source-url parts
      if (type === "source-url") {
        return {
          type: "source",
          sourceType: "url",
          id: part.sourceId,
          url: part.url,
          title: part.title || "",
        } satisfies SourceMessagePart;
      }

      // Handle source-document parts
      if (type === "source-document") {
        console.warn(
          `Source document part type ${type} is not yet supported in conversion`,
        );
        return null;
      }

      // Handle data-* parts (AI SDK v5 data parts)
      if (type.startsWith("data-")) {
        // For now, we'll skip data parts as they don't have a direct equivalent
        // in the assistant-ui types. They could be converted to a custom message part
        // or handled differently based on the specific use case.
        console.warn(
          `Data part type ${type} is not yet supported in conversion`,
        );
        return null;
      }

      // For unsupported types, we'll skip them instead of throwing
      console.warn(`Unsupported message part type: ${type}`);
      return null;
    })
    .filter(Boolean) as any[];
};

export const AISDKMessageConverter = unstable_createMessageConverter(
  (message: UIMessage) => {
    // UIMessage doesn't have createdAt, so we'll use current date or undefined
    const createdAt = new Date();
    switch (message.role) {
      case "user":
        return {
          role: "user",
          id: message.id,
          createdAt,
          content: convertParts(message),
          attachments: message.parts
            ?.filter((p) => p.type === "file")
            .map((part, idx) => {
              return {
                id: idx.toString(),
                type: part.mediaType.startsWith("image/") ? "image" : "file",
                name: part.filename ?? "file",
                content: [
                  part.mediaType.startsWith("image/")
                    ? {
                        type: "image",
                        image: part.url,
                        filename: part.filename!,
                      }
                    : {
                        type: "file",
                        filename: part.filename!,
                        data: part.url,
                        mimeType: part.mediaType,
                      },
                ],
                contentType: part.mediaType ?? "unknown/unknown",
                status: { type: "complete" as const },
              };
            }),
        };

      case "system":
        return {
          role: "system",
          id: message.id,
          createdAt,
          content: convertParts(message),
        };

      case "assistant":
        return {
          role: "assistant",
          id: message.id,
          createdAt,
          content: convertParts(message),
          metadata: {
            unstable_annotations: (message as any).annotations,
            unstable_data: Array.isArray((message as any).data)
              ? (message as any).data
              : (message as any).data
                ? [(message as any).data]
                : undefined,
            custom: {},
          },
        };

      default:
        console.warn(`Unsupported message role: ${message.role}`);
        return [];
    }
  },
);
