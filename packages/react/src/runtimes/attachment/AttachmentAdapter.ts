import {
  ComposerAttachment,
  MessageAttachment,
} from "../../context/stores/Attachment";

export type AttachmentAdapter = {
  accept: string;
  add(state: { file: File }): Promise<ComposerAttachment>;
  remove(attachment: ComposerAttachment): Promise<void>;
  send(attachment: ComposerAttachment): Promise<MessageAttachment>;
};
