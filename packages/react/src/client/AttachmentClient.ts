import { Attachment } from "../types";

export type AttachmentClientState = Attachment;

export type AttachmentClientActions = {
  readonly remove: () => Promise<void>;
};
