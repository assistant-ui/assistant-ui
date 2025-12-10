import type { Attachment } from "../AttachmentTypes";
import type { MessageRole, RunConfig } from "../AssistantTypes";
import type { ComposerRuntime } from "../../legacy-runtime/runtime";
import type { AttachmentMethods } from "./attachment";

export type ComposerState = {
  readonly text: string;
  readonly role: MessageRole;
  readonly attachments: readonly Attachment[];
  readonly runConfig: RunConfig;
  readonly isEditing: boolean;
  readonly canCancel: boolean;
  readonly attachmentAccept: string;
  readonly isEmpty: boolean;
  readonly type: "thread" | "edit";
};

export type ComposerMethods = {
  getState(): ComposerState;
  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  addAttachment(file: File): Promise<void>;
  clearAttachments(): Promise<void>;
  attachment(selector: { index: number } | { id: string }): AttachmentMethods;
  reset(): Promise<void>;
  send(): void;
  cancel(): void;
  beginEdit(): void;
  /** @internal */
  __internal_getRuntime?(): ComposerRuntime;
};

export type ComposerMeta = {
  source: "thread" | "message";
  query: Record<string, never>;
};

export type ComposerEvents = {
  "composer.send": { threadId: string; messageId?: string };
  "composer.attachment-add": { threadId: string; messageId?: string };
};

export type ComposerClientSchema = {
  state: ComposerState;
  methods: ComposerMethods;
  meta: ComposerMeta;
  events: ComposerEvents;
};
