import type { Attachment } from "../AttachmentTypes";

export type AttachmentState = Attachment;

export type AttachmentMethods = {
  remove(): Promise<void>;
};

export type AttachmentMeta = {
  source: "message" | "composer";
  query: { index: number } | { id: string };
};

export type AttachmentClientSchema = {
  state: AttachmentState;
  methods: AttachmentMethods;
  meta: AttachmentMeta;
};
