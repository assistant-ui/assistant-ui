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
    // 1. Filter out FileContentParts and step-start parts (streaming metadata only)
    const filteredParts = filterMessageParts(parts);

    // 2. Merge reasoning parts with same itemId (OpenAI sends multiple paragraphs)
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

    // 3. Sanitize providerMetadata on each part (remove encrypted content)
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
