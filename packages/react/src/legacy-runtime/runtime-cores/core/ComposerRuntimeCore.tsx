import type {
  Attachment,
  PendingAttachment,
  Unsubscribe,
} from "../../../types";
import type { MessageRole, RunConfig } from "../../../types/AssistantTypes";
import type { SpeechRecognitionAdapter } from "../adapters/speech/SpeechAdapterTypes";

export type ComposerRuntimeEventType = "send" | "attachment-add";

/**
 * State representing an active speech recognition (dictation) session.
 */
export type ListeningState = {
  readonly status: SpeechRecognitionAdapter.Status;
};

export type ComposerRuntimeCore = Readonly<{
  isEditing: boolean;

  canCancel: boolean;
  isEmpty: boolean;

  attachments: readonly Attachment[];
  attachmentAccept: string;

  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;

  text: string;
  setText: (value: string) => void;

  role: MessageRole;
  setRole: (role: MessageRole) => void;

  runConfig: RunConfig;
  setRunConfig: (runConfig: RunConfig) => void;

  reset: () => Promise<void>;
  clearAttachments: () => Promise<void>;

  send: () => void;
  cancel: () => void;

  /**
   * The current state of speech recognition (dictation).
   * Undefined when not listening.
   */
  listening: ListeningState | undefined;

  /**
   * Start speech recognition to convert voice to text input.
   * Requires a SpeechRecognitionAdapter to be configured.
   */
  startListening: () => void;

  /**
   * Stop the current speech recognition session.
   */
  stopListening: () => void;

  subscribe: (callback: () => void) => Unsubscribe;

  unstable_on: (
    event: ComposerRuntimeEventType,
    callback: () => void,
  ) => Unsubscribe;
}>;

export type ThreadComposerRuntimeCore = ComposerRuntimeCore &
  Readonly<{
    attachments: readonly PendingAttachment[];
  }>;
