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
  type: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string | undefined;
  file?: File;
  content?: ThreadUserMessagePart[];
};

export type PendingAttachment = BaseAttachment & {
  status: PendingAttachmentStatus;
  file: File;
};

export type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

export type Attachment = PendingAttachment | CompleteAttachment;

export type CreateAttachment = {
  id?: string;
  type?: "image" | "document" | "file" | (string & {});
  name: string;
  contentType?: string;
  content: ThreadUserMessagePart[];
};
