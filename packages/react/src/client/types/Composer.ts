import type { ComposerRuntime } from "../../legacy-runtime/runtime";
import type { DictationState } from "../../legacy-runtime/runtime-cores/core/ComposerRuntimeCore";
import type { Attachment } from "../../types";
import type { MessageRole, RunConfig } from "../../types/AssistantTypes";
import type { AttachmentClientApi } from "./Attachment";

export type ComposerClientState = {
  readonly text: string;
  readonly role: MessageRole;
  readonly attachments: readonly Attachment[];
  readonly runConfig: RunConfig;
  readonly isEditing: boolean;
  readonly canCancel: boolean;
  readonly attachmentAccept: string;
  readonly isEmpty: boolean;
  readonly type: "thread" | "edit";
  /**
   * The current state of dictation.
   * Undefined when dictation is not active.
   */
  readonly dictation: DictationState | undefined;
};

export type ComposerClientApi = {
  getState(): ComposerClientState;

  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  addAttachment(file: File): Promise<void>;
  clearAttachments(): Promise<void>;
  attachment(selector: { index: number } | { id: string }): AttachmentClientApi;
  reset(): Promise<void>;
  send(): void;
  cancel(): void;
  beginEdit(): void;

  /**
   * Start dictation to convert voice to text input.
   * Requires a DictationAdapter to be configured.
   */
  startDictation(): void;

  /**
   * Stop the current dictation session.
   */
  stopDictation(): void;

  /** @internal */
  __internal_getRuntime?(): ComposerRuntime;
};
