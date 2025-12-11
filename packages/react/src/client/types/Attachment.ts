import type { Attachment } from "@assistant-ui/core";
import { AttachmentRuntime } from "../../legacy-runtime/runtime";

export type AttachmentClientState = Attachment;

export type AttachmentClientApi = {
  getState(): AttachmentClientState;

  remove(): Promise<void>;

  /** @internal */
  __internal_getRuntime?(): AttachmentRuntime;
};
