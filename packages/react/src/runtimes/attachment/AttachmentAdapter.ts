import {
  Attachment,
  PendingAttachment,
  CompleteAttachment,
  PendingAttachmentStatus,
  CompleteAttachmentStatus,
} from "../../types/AttachmentTypes";

export type AttachmentAdapter = {
  accept: string;

  add(state: {
    file: File;
  }): Promise<
    Omit<PendingAttachment, "status"> & { status?: PendingAttachmentStatus }
  >;
  remove(attachment: Attachment): Promise<void>;
  send(
    attachment: PendingAttachment,
  ): Promise<
    Omit<CompleteAttachment, "status"> & { status?: CompleteAttachmentStatus }
  >;
};
