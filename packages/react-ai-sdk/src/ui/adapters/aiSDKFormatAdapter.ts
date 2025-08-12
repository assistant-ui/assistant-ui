import { UIMessage } from "ai";
import {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageStorageEntry,
} from "@assistant-ui/react";

// Storage format for AI SDK messages - just the UIMessage
export type AISDKStorageFormat = UIMessage;

export const aiSDKV5FormatAdapter: MessageFormatAdapter<
  UIMessage,
  AISDKStorageFormat
> = {
  format: "ai-sdk/v5",

  encode(item: MessageFormatItem<UIMessage>): AISDKStorageFormat {
    // Filter out FileContentParts until they are supported
    return {
      ...item.message,
      parts: item.message.parts.filter((part) => part.type !== "file"),
    };
  },

  decode(
    stored: MessageStorageEntry<AISDKStorageFormat>,
  ): MessageFormatItem<UIMessage> {
    return {
      parentId: stored.parent_id,
      message: stored.content,
    };
  },

  getId(message: UIMessage): string {
    return message.id;
  },
};
