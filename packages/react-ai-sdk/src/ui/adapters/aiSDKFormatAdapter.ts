import { UIMessage } from "ai";
import {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageStorageEntry,
} from "@assistant-ui/react";
import { getItemId } from "../utils/providerMetadata";

// Storage format for AI SDK messages - just the UIMessage
export type AISDKStorageFormat = Omit<UIMessage, "id">;

/**
 * Sanitizes providerMetadata to only keep fields safe for backend storage.
 * Strips potentially problematic fields like reasoningEncryptedContent.
 */
const sanitizeProviderMetadata = (metadata: any): any => {
  if (!metadata || typeof metadata !== "object") return metadata;

  const sanitized: any = {};

  for (const [provider, data] of Object.entries(metadata)) {
    if (!data || typeof data !== "object") {
      sanitized[provider] = data;
      continue;
    }

    // For each provider, strip encrypted/sensitive fields
    const providerData = data as Record<string, any>;
    const cleanData: Record<string, any> = {};

    for (const [key, value] of Object.entries(providerData)) {
      // Skip encrypted content and other potentially large/problematic fields
      if (key === "reasoningEncryptedContent" || key === "encryptedContent") {
        continue;
      }
      cleanData[key] = value;
    }

    sanitized[provider] = cleanData;
  }

  return sanitized;
};

/**
 * Merges reasoning parts that share the same itemId (OpenAI sends reasoning as multiple paragraphs).
 * This prevents sending duplicate parts with same itemId to backend.
 */
const mergeReasoningParts = (parts: any[]): any[] => {
  const reasoningByItemId = new Map<
    string,
    { parts: any[]; indices: Set<number> }
  >();
  const result: any[] = [];

  // First pass: group reasoning parts by itemId
  parts.forEach((part, index) => {
    if (part.type === "reasoning") {
      const itemId = getItemId(part);
      if (itemId) {
        if (!reasoningByItemId.has(itemId)) {
          reasoningByItemId.set(itemId, { parts: [], indices: new Set() });
        }
        reasoningByItemId.get(itemId)!.parts.push(part);
        reasoningByItemId.get(itemId)!.indices.add(index);
      }
    }
  });

  // Second pass: merge reasoning parts or keep as-is
  parts.forEach((part, index) => {
    if (part.type === "reasoning") {
      const itemId = getItemId(part);

      if (itemId && reasoningByItemId.has(itemId)) {
        const group = reasoningByItemId.get(itemId)!;

        // Only output merged part for the first occurrence
        const firstIndex = Math.min(...group.indices);
        if (index !== firstIndex) {
          return; // Skip duplicate reasoning parts
        }

        // Merge all texts from parts with same itemId
        const mergedText = group.parts.map((p) => p.text).join("\n\n");

        // Use metadata from first part (includes duration)
        result.push({
          ...group.parts[0],
          text: mergedText,
        });
      } else {
        // No itemId - keep as standalone reasoning part
        result.push(part);
      }
    } else {
      // Non-reasoning parts pass through unchanged
      result.push(part);
    }
  });

  return result;
};

export const aiSDKV5FormatAdapter: MessageFormatAdapter<
  UIMessage,
  AISDKStorageFormat
> = {
  format: "ai-sdk/v5",

  encode({
    message: { id, parts, ...message },
  }: MessageFormatItem<UIMessage>): AISDKStorageFormat {
    // 1. Filter out FileContentParts and step-start parts (streaming metadata only)
    const filteredParts = parts.filter(
      (part) => part.type !== "file" && part.type !== "step-start",
    );

    // 2. Merge reasoning parts with same itemId (OpenAI sends multiple paragraphs)
    const mergedParts = mergeReasoningParts(filteredParts);

    // 3. Sanitize providerMetadata on each part (remove encrypted content)
    const sanitizedParts = mergedParts.map((part) => {
      if (!part.providerMetadata) return part;

      return {
        ...part,
        providerMetadata: sanitizeProviderMetadata(part.providerMetadata),
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
