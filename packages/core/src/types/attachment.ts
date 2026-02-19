import type { ThreadUserMessagePart } from "./message";

export type PendingAttachmentStatus =
  | {
      type: "running";
      reason: "uploading";
      progress: number;
    }
  | {
      type: "requires-action";
      reason: "composer-send";
    }
  | {
      type: "incomplete";
      reason: "error" | "upload-paused";
    };

export type CompleteAttachmentStatus = {
  type: "complete";
};

export type AttachmentStatus =
  | PendingAttachmentStatus
  | CompleteAttachmentStatus;

type BaseAttachment = {
  id: string;
  name: string;
  file?: File;
  content?: ThreadUserMessagePart[];
} & (
  | { type: "image" | "document" | "file"; contentType: string }
  | { type: `data-${string}`; contentType?: never }
);

export type PendingAttachment = BaseAttachment & {
  status: PendingAttachmentStatus;
  file: File;
};

export type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

export type Attachment = PendingAttachment | CompleteAttachment;
