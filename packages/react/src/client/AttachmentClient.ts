import { AttachmentRuntime } from "../api";
import { Attachment } from "../types";

export type AttachmentClientState = Attachment;

export type AttachmentClientActions = {
  readonly remove: () => Promise<void>;

  /** @internal */
  __internal_getRuntime(): AttachmentRuntime;
};
