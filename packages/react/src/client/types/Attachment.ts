import { AttachmentRuntime } from "../../legacy-runtime/runtime";
import { Attachment } from "../../types";

export type AttachmentClientState = Attachment;

export type AttachmentClientApi = {
  getState(): AttachmentClientState;

  remove(): Promise<void>;

  /** @internal */
  __internal_getRuntime?(): AttachmentRuntime;
};
