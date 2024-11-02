import type { Attachment, PendingAttachment, Unsubscribe } from "../../types";
import { MessageRole } from "../../types/AssistantTypes";

export type ComposerRuntimeCore = Readonly<{
  attachments: readonly Attachment[];

  getAttachmentAccept(): string;
  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;

  isEditing: boolean;

  canCancel: boolean;
  isEmpty: boolean;

  text: string;
  setText: (value: string) => void;

  role: MessageRole;
  setRole: (role: MessageRole) => void;

  reset: () => void;

  send: () => void;
  cancel: () => void;

  subscribe: (callback: () => void) => Unsubscribe;
}>;

export type ThreadComposerRuntimeCore = ComposerRuntimeCore &
  Readonly<{
    attachments: readonly PendingAttachment[];
  }>;
