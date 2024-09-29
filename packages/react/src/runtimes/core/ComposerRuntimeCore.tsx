import type { Attachment, PendingAttachment, Unsubscribe } from "../../types";

export type ComposerRuntimeCore = Readonly<{
  attachmentAccept: string;
  attachments: readonly Attachment[];
  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;

  isEditing: boolean;

  canCancel: boolean;
  isEmpty: boolean;

  text: string;
  setText: (value: string) => void;

  /**
   * @deprecated This method will be removed in 0.6.0. Submit feedback if you need this functionality.
   */
  reset: () => void;

  send: () => void;
  cancel: () => void;

  subscribe: (callback: () => void) => Unsubscribe;
}>;

export type ThreadComposerRuntimeCore = ComposerRuntimeCore &
  Readonly<{
    attachments: readonly PendingAttachment[];
  }>;
