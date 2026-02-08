import { isToolUIPart, getToolName, type UIMessage } from "ai";
import {
  unstable_createMessageConverter,
  type ReasoningMessagePart,
  type ToolCallMessagePart,
  type TextMessagePart,
  type DataMessagePart,
  type SourceMessagePart,
  type useExternalMessageConverter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";

type MessageMetadata = ThreadMessageLike["metadata"];

function stripClosingDelimiters(json: string) {
  return json.replace(/[}\]"]+$/, "");
}

const convertParts = (
  message: UIMessage,
  metadata: useExternalMessageConverter.Metadata,
) => {
  if (!message.parts || message.parts.length === 0) {
    return [];
  }

  const converted = message.parts
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

      // Handle tool parts (both static tool-* and dynamic-tool)
      // In AI SDK v6, isToolUIPart returns true for both static and dynamic tools
      if (isToolUIPart(part)) {
        // Use getToolName which works for both static and dynamic tools
        const toolName = getToolName(part);
        const toolCallId = part.toolCallId;

        // Extract args and result based on state
        let args: ReadonlyJSONObject = {};
        let result: unknown;
        let isError = false;

        if (
          part.state === "input-streaming" ||
          part.state === "input-available"
        ) {
          args = (part.input as ReadonlyJSONObject) || {};
        } else if (part.state === "output-available") {
          args = (part.input as ReadonlyJSONObject) || {};
          result = part.output;
        } else if (part.state === "output-error") {
          args = (part.input as ReadonlyJSONObject) || {};
          isError = true;
          result = { error: part.errorText };
        }

        let argsText = JSON.stringify(args);
        if (part.state === "input-streaming") {
          // the argsText is not complete, so we need to strip the closing delimiters
          // these are added by the AI SDK in fix-json
          argsText = stripClosingDelimiters(argsText);
        }

        const toolStatus = metadata.toolStatuses?.[toolCallId];
        return {
          type: "tool-call",
          toolName,
          toolCallId,
          argsText,
          args,
          result,
          isError,
          ...(toolStatus?.type === "interrupt" && {
            interrupt: toolStatus.payload,
            status: {
              type: "requires-action" as const,
              reason: "interrupt",
            },
          }),
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
        const name = type.substring(5);
        return {
          type: "data",
          name,
          data: (part as any).data,
        } satisfies DataMessagePart;
      }

      // For unsupported types, we'll skip them instead of throwing
      console.warn(`Unsupported message part type: ${type}`);
      return null;
    })
    .filter(Boolean) as any[];

  const seenToolCallIds = new Set<string>();
  return converted.filter((part: any) => {
    if (part.type === "tool-call" && part.toolCallId != null) {
      if (seenToolCallIds.has(part.toolCallId)) return false;
      seenToolCallIds.add(part.toolCallId);
    }
    return true;
  });
};

export const AISDKMessageConverter = unstable_createMessageConverter(
  (message: UIMessage, metadata: useExternalMessageConverter.Metadata) => {
    // UIMessage doesn't have createdAt, so we'll use current date or undefined
    const createdAt = new Date();
    switch (message.role) {
      case "user":
        return {
          role: "user",
          id: message.id,
          createdAt,
          content: convertParts(message, metadata),
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
          metadata: message.metadata as MessageMetadata,
        };

      case "system":
        return {
          role: "system",
          id: message.id,
          createdAt,
          content: convertParts(message, metadata),
          metadata: message.metadata as MessageMetadata,
        };

      case "assistant":
        return {
          role: "assistant",
          id: message.id,
          createdAt,
          content: convertParts(message, metadata),
          metadata: message.metadata as MessageMetadata,
        };

      default:
        console.warn(`Unsupported message role: ${message.role}`);
        return [];
    }
  },
);
