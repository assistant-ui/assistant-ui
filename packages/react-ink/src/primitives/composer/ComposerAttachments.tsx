import type { ComponentType } from "react";
import {
  ComposerPrimitiveAttachments,
  ComposerPrimitiveAttachmentByIndex,
} from "@assistant-ui/core/react";

export type AttachmentComponents = {
  Image?: ComponentType | undefined;
  Document?: ComponentType | undefined;
  File?: ComponentType | undefined;
  Attachment?: ComponentType | undefined;
};

export type ComposerAttachmentsProps = {
  components: AttachmentComponents | undefined;
};

export type ComposerAttachmentByIndexProps = {
  index: number;
  components?: AttachmentComponents | undefined;
};

export const ComposerAttachmentByIndex = ComposerPrimitiveAttachmentByIndex;

export const ComposerAttachments = ComposerPrimitiveAttachments;
