import { ThreadComposerAttachment } from "../../context/stores/Attachment";
import type { Unsubscribe } from "../../types";

export type ThreadComposerRuntimeCore = Readonly<{
  attachmentAccept: string;
  attachments: ThreadComposerAttachment[];
  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;

  canCancel: boolean;
  isEmpty: boolean;

  text: string;
  setText: (value: string) => void;

  reset: () => void;

  send: () => void;
  cancel: () => void;

  subscribe: (callback: () => void) => Unsubscribe;
}>;
