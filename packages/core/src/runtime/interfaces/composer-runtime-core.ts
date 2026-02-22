import type {
  MessageRole,
  RunConfig,
  QuoteInfo,
  Attachment,
  CreateAttachment,
  Unsubscribe,
} from "../../types";
import type { DictationAdapter } from "../../adapters/speech";

export type ComposerRuntimeEventType = "send" | "attachmentAdd";

export type DictationState = {
  readonly status: DictationAdapter.Status;
  readonly transcript?: string;
  readonly inputDisabled?: boolean;
};

export type ComposerRuntimeCore = Readonly<{
  isEditing: boolean;

  canCancel: boolean;
  isEmpty: boolean;

  attachments: readonly Attachment[];
  attachmentAccept: string;

  addAttachment: (fileOrAttachment: File | CreateAttachment) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;

  text: string;
  setText: (value: string) => void;

  role: MessageRole;
  setRole: (role: MessageRole) => void;

  runConfig: RunConfig;
  setRunConfig: (runConfig: RunConfig) => void;

  quote: QuoteInfo | undefined;
  setQuote: (quote: QuoteInfo | undefined) => void;

  reset: () => Promise<void>;
  clearAttachments: () => Promise<void>;

  send: () => void;
  cancel: () => void;

  dictation: DictationState | undefined;
  startDictation: () => void;
  stopDictation: () => void;

  subscribe: (callback: () => void) => Unsubscribe;

  unstable_on: (
    event: ComposerRuntimeEventType,
    callback: () => void,
  ) => Unsubscribe;
}>;

export type ThreadComposerRuntimeCore = ComposerRuntimeCore;
