import { UIMessage } from "ai";
import {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageStorageEntry,
} from "@assistant-ui/react";
import {
  filterMessageParts,
  groupReasoningParts,
  mergeReasoningGroupText,
  sanitizeProviderMetadata,
} from "../utils/providerMetadata";
import { getItemId } from "../utils/providerMetadata";

// Storage format for AI SDK messages - just the UIMessage
export type AISDKStorageFormat = Omit<UIMessage, "id">;

export const aiSDKV5FormatAdapter: MessageFormatAdapter<
  UIMessage,
  AISDKStorageFormat
> = {
  format: "ai-sdk/v5",

  encode({
    message: { id, parts, ...message },
  }: MessageFormatItem<UIMessage>): AISDKStorageFormat {
    // Filter out streaming-only parts (step-start, file)
    const filteredParts = filterMessageParts(parts);

    // Merge reasoning chunks with same itemId (OpenAI sends multi-paragraph thoughts)
    const reasoningGroups = groupReasoningParts(filteredParts, getItemId);
    const mergedParts = filteredParts.map((part, index) => {
      if (part.type !== "reasoning") {
        return part;
      }

      const itemId = getItemId(part);
      if (!itemId) {
        return part;
      }

      const group = reasoningGroups.get(itemId);
      if (!group || group.firstIndex !== index) {
        return null;
      }

      return {
        ...group.parts[0],
        text: mergeReasoningGroupText(group),
      };
    });

    // Strip encrypted/sensitive metadata to prevent 500 errors on cloud storage
    const sanitizedParts = mergedParts
      .filter((part): part is Exclude<typeof part, null> => part !== null)
      .map((part) => {
        if (!part.providerMetadata) return part;

        const sanitized = sanitizeProviderMetadata(part.providerMetadata);
        if (!sanitized) {
          const { providerMetadata: _removed, ...rest } = part;
          return rest;
        }

        return {
          ...part,
          providerMetadata: sanitized,
        };
      });

    return {
      ...message,
      parts: sanitizedParts,
    };
  },

  decode(
    stored: MessageStorageEntry<AISDKStorageFormat>,
  ): MessageFormatItem<UIMessage> {
    return {
      parentId: stored.parent_id,
      message: {
        id: stored.id,
        ...stored.content,
      },
    };
  },

  getId(message: UIMessage): string {
    return message.id;
  },
};
