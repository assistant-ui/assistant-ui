import { CoreUserContentPart } from "../../types";

export type BaseAttachment = {
  id: string;
  type: "image" | "document" | "file";
  name: string;
};

export type ComposerAttachment = BaseAttachment & {
  file: File;
};

export type MessageAttachment = BaseAttachment & {
  file?: File;
  content: CoreUserContentPart[];
};

export type ComposerAttachmentState = Readonly<{
  attachment: ComposerAttachment;
}>;

export type MessageAttachmentState = Readonly<{
  attachment: MessageAttachment;
}>;
