import {
  ThreadComposerAttachment,
  MessageAttachment,
} from "../../context/stores/Attachment";

export type AttachmentAdapter = {
  accept: string;
  add(state: { file: File }): Promise<ThreadComposerAttachment>;
  remove(attachment: ThreadComposerAttachment): Promise<void>;
  send(attachment: ThreadComposerAttachment): Promise<MessageAttachment>;
};
