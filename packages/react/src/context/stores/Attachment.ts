import { CoreUserContentPart } from "../../types";

export type BaseAttachment = {
  id: string;
  type: "image" | "document" | "file";
  name: string;
};

export type ThreadComposerAttachment = BaseAttachment & {
  file: File;
};

export type MessageAttachment = BaseAttachment & {
  file?: File;
  content: CoreUserContentPart[];
};

export type ComposerAttachmentState = Readonly<{
  attachment: ThreadComposerAttachment;
}>;

export type MessageAttachmentState = Readonly<{
  attachment: MessageAttachment;
}>;
