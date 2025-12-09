import type { Attachment } from "../AttachmentTypes";
import type { MessageRole, RunConfig } from "../AssistantTypes";

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
  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  addAttachment(file: File): Promise<void>;
  clearAttachments(): Promise<void>;
  reset(): Promise<void>;
  send(): void;
  cancel(): void;
  beginEdit(): void;
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
