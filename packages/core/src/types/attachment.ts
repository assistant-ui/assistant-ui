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

type FileAttachmentType = "image" | "document" | "file";
type DataAttachmentType = `data-${string}`;

type BaseFileAttachment = {
  id: string;
  type: FileAttachmentType;
  name: string;
  contentType: string;
  file?: File;
  content?: ThreadUserMessagePart[];
};

type BaseDataAttachment = {
  id: string;
  type: DataAttachmentType;
  name: string;
  contentType?: string;
  file?: File;
  content?: ThreadUserMessagePart[];
};

type BaseAttachment = BaseFileAttachment | BaseDataAttachment;

export type PendingAttachment = BaseAttachment & {
  status: PendingAttachmentStatus;
  file: File;
};

export type CompleteAttachment = BaseAttachment & {
  status: CompleteAttachmentStatus;
  content: ThreadUserMessagePart[];
};

export type Attachment = PendingAttachment | CompleteAttachment;
