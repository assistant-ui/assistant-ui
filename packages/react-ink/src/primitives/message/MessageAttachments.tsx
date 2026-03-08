import {
  MessagePrimitiveAttachments,
  MessagePrimitiveAttachmentByIndex,
} from "@assistant-ui/core/react";
import type { AttachmentComponents } from "../composer/ComposerAttachments";

export type MessageAttachmentsProps = {
  components: AttachmentComponents | undefined;
};

export type MessageAttachmentByIndexProps = {
  index: number;
  components?: AttachmentComponents | undefined;
};

export const MessageAttachmentByIndex = MessagePrimitiveAttachmentByIndex;

export const MessageAttachments = MessagePrimitiveAttachments;
