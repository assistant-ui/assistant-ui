import { UIMessage } from "ai";
import {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageStorageEntry,
} from "@assistant-ui/react";

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
    // Filter out FileContentParts until they are supported
    return {
      ...message,
      parts: parts.filter((part) => part.type !== "file"),
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
