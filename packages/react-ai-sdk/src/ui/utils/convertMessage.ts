import { isToolUIPart, UIMessage } from "ai";
import {
  unstable_createMessageConverter,
  type ReasoningMessagePart,
  type ToolCallMessagePart,
  type TextMessagePart,
  type SourceMessagePart,
  type useExternalMessageConverter,
} from "@assistant-ui/react";
import {
  filterMessageParts,
  groupReasoningParts,
  mergeReasoningGroupText,
  getItemId,
  createReasoningOrdinalContext,
  resolveReasoningDuration,
} from "./reasoning";

/**
 * Strips AI SDK's fix-json closing delimiters during streaming.
 * Example: {"query":"sea"} → {"query":"sea
 */
function stripClosingDelimiters(json: string) {
  return json.replace(/[}\]"]+$/, "");
}

type ConvertedParts = {
  parts: any[];
  storedReasoningDurations: Record<string, number>;
};

const convertParts = (
  message: UIMessage,
  metadata: useExternalMessageConverter.Metadata,
): ConvertedParts => {
  if (!message.parts || message.parts.length === 0) {
    return { parts: [], storedReasoningDurations: {} };
  }

  const filteredParts = filterMessageParts(message.parts);
  const reasoningGroups = groupReasoningParts(filteredParts, getItemId);
  const messageId = message.id ?? "unknown";

  const runtimeDurations: Record<string, number> =
    metadata && typeof metadata === "object" && "reasoningDurations" in metadata
      ? (((metadata as any).reasoningDurations as Record<string, number>) ?? {})
      : {};

  const metadataDurations: Record<string, number> | undefined = (message as any)
    .metadata?.reasoningDurations;

  const storedReasoningDurations: Record<string, number> = {};
  // Keeps ordinal mapping consistent with the runtime so stored durations line up.
  const ordinalContext = createReasoningOrdinalContext();

  const converted = filteredParts
    .map((part, partIndex) => {
      const type = part.type;

      if (type === "text") {
        return {
          type: "text",
          text: part.text,
        } satisfies TextMessagePart;
      }

      if (type === "reasoning") {
        const { ordinal, itemId } = ordinalContext.getOrdinal(part, partIndex);

        if (itemId) {
          const group = reasoningGroups.get(itemId!);
          if (!group) {
            return null;
          }

          if (group.firstIndex !== partIndex) {
            return null;
          }

          const { duration, storedKey } = resolveReasoningDuration(
            runtimeDurations,
            metadataDurations,
            messageId,
            ordinal,
          );

          if (duration !== undefined) {
            storedReasoningDurations[storedKey] = duration;
          }

          return {
            type: "reasoning",
            text: mergeReasoningGroupText(group),
            ...(duration !== undefined && {
              duration,
            }),
          } satisfies ReasoningMessagePart;
        }

        // Resolve duration using runtime metadata first, then persisted `rN` keys.
        const { duration, storedKey } = resolveReasoningDuration(
          runtimeDurations,
          metadataDurations,
          messageId,
          ordinal,
        );

        if (duration !== undefined) {
          storedReasoningDurations[storedKey] = duration;
        }

        return {
          type: "reasoning",
          text: part.text,
          ...(duration !== undefined && { duration }),
        } satisfies ReasoningMessagePart;
      }

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

  return { parts: converted, storedReasoningDurations };
};

export const AISDKMessageConverter = unstable_createMessageConverter(
  (message: UIMessage, metadata: useExternalMessageConverter.Metadata) => {
    // UIMessage doesn't have createdAt, so we'll use current date or undefined
    const createdAt = new Date();
    switch (message.role) {
      case "user":
        const userParts = convertParts(message, metadata);
        return {
          role: "user",
          id: message.id,
          createdAt,
          content: userParts.parts,
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
        const systemParts = convertParts(message, metadata);
        return {
          role: "system",
          id: message.id,
          createdAt,
          content: systemParts.parts,
        };

      case "assistant":
        const assistantParts = convertParts(message, metadata);
        const existingCustom =
          ((message as any).metadata?.["custom"] as Record<string, unknown>) ??
          {};
        const customMetadata: Record<string, unknown> = { ...existingCustom };

        if (Object.keys(assistantParts.storedReasoningDurations).length > 0) {
          customMetadata["reasoningDurations"] =
            assistantParts.storedReasoningDurations;
        } else {
          delete customMetadata["reasoningDurations"];
        }

        return {
          role: "assistant",
          id: message.id,
          createdAt,
          content: assistantParts.parts,
          metadata: {
            unstable_annotations: (message as any).annotations,
            unstable_data: Array.isArray((message as any).data)
              ? (message as any).data
              : (message as any).data
                ? [(message as any).data]
                : undefined,
            custom:
              Object.keys(customMetadata).length > 0
                ? customMetadata
                : undefined,
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
};
