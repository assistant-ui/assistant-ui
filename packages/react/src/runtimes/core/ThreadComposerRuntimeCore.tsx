import { ThreadComposerAttachment } from "../../context/stores/Attachment";
import type { Unsubscribe } from "../../types";

export type ThreadComposerRuntimeCore = Readonly<{
  attachmentAccept: string;
  attachments: ThreadComposerAttachment[];
  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;

  isEmpty: boolean;

  text: string;
  setText: (value: string) => void;

  reset: () => void;

  send: () => void;

  subscribe: (callback: () => void) => Unsubscribe;
}>;
