import type { Attachment } from "../AttachmentTypes";
import type { AttachmentRuntime } from "../../legacy-runtime/runtime";

export type AttachmentState = Attachment;

export type AttachmentMethods = {
  getState(): AttachmentState;
  remove(): Promise<void>;
  /** @internal */
  __internal_getRuntime?(): AttachmentRuntime;
};

export type AttachmentMeta = {
  source: "message" | "composer";
  query: { type: "index"; index: number } | { type: "id"; id: string };
};

export type AttachmentClientSchema = {
  methods: AttachmentMethods;
  meta: AttachmentMeta;
};
