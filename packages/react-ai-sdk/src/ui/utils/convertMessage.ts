import { isToolUIPart, UIMessage } from "ai";
import {
  unstable_createMessageConverter,
  type ReasoningMessagePart,
  type ToolCallMessagePart,
  type TextMessagePart,
  type SourceMessagePart,
  type useExternalMessageConverter,
} from "@assistant-ui/react";
import { getItemId } from "./providerMetadata";

function stripClosingDelimiters(json: string) {
  return json.replace(/[}\]"]+$/, "");
}

const getReasoningDurations = (
  metadata: useExternalMessageConverter.Metadata,
): Record<string, number> | undefined => {
  return (metadata as { reasoningDurations?: Record<string, number> })
    .reasoningDurations;
};

const convertParts = (
  message: UIMessage,
  metadata: useExternalMessageConverter.Metadata,
) => {
  if (!message.parts || message.parts.length === 0) {
    return [];
  }

  // First pass: collect reasoning parts by itemId for merging
  const reasoningByItemId = new Map<
    string,
    { parts: any[]; indices: number[] }
  >();
  const processedIndices = new Set<number>();

  message.parts
    .filter((p) => p.type !== "step-start" && p.type !== "file")
    .forEach((part, partIndex) => {
      if (part.type === "reasoning") {
        const itemId = getItemId(part);
        if (itemId) {
          if (!reasoningByItemId.has(itemId)) {
            reasoningByItemId.set(itemId, { parts: [], indices: [] });
          }
          reasoningByItemId.get(itemId)!.parts.push(part);
          reasoningByItemId.get(itemId)!.indices.push(partIndex);
          processedIndices.add(partIndex);
        }
      }
    });

  return message.parts
    .filter((p) => p.type !== "step-start" && p.type !== "file")
    .map((part, partIndex) => {
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
        const itemId = getItemId(part);

        // If this part has an itemId and was already processed, skip it (will be merged)
        if (itemId && processedIndices.has(partIndex)) {
          const group = reasoningByItemId.get(itemId)!;
          const isFirstInGroup = group.indices[0] === partIndex;

          if (!isFirstInGroup) {
            // Skip non-first parts - they'll be merged into the first
            return null;
          }

          // This is the first part - merge all texts
          const mergedText = group.parts.map((p) => p.text).join("\n\n");

          const key = `${message.id}:${itemId}`;
          const finalDuration = getReasoningDurations(metadata)?.[key];

          const providerDuration = group.parts[0]?.providerMetadata?.[
            "assistant-ui"
          ]?.["duration"] as number | undefined;

          const rawDuration = finalDuration ?? providerDuration;

          // Validate duration is a valid number
          const duration =
            typeof rawDuration === "number" && rawDuration > 0
              ? rawDuration
              : undefined;

          return {
            type: "reasoning",
            text: mergedText,
            ...(duration !== undefined && { duration }),
          } satisfies ReasoningMessagePart;
        }

        // No itemId - handle as standalone reasoning part
        const key = `${message.id}:${partIndex}`;
        const finalDuration = getReasoningDurations(metadata)?.[key];

        const providerDuration = part.providerMetadata?.["assistant-ui"]?.[
          "duration"
        ] as number | undefined;

        const rawDuration = finalDuration ?? providerDuration;

        // Validate duration is a valid number
        const duration =
          typeof rawDuration === "number" && rawDuration > 0
            ? rawDuration
            : undefined;

        return {
          type: "reasoning",
          text: part.text,
          ...(duration !== undefined && { duration }),
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

        const toolStatus = metadata.toolStatuses?.[toolCallId];
        return {
          type: "tool-call",
          toolName,
          toolCallId,
          argsText: JSON.stringify(args),
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
        };

      case "system":
        return {
          role: "system",
          id: message.id,
          createdAt,
          content: convertParts(message, metadata),
        };

      case "assistant":
        return {
          role: "assistant",
          id: message.id,
          createdAt,
          content: convertParts(message, metadata),
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

// Export for testing
export const __test__ = {
  convertParts,
  getItemId,
};
