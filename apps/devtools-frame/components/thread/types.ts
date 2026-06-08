import type { MessagePreview } from "../message";

export interface ThreadListItemPreview {
  id: string;
  title?: string;
  status?: string;
  externalId?: string;
  remoteId?: string;
}

export interface SuggestionPreview {
  prompt?: string;
}

export interface ComposerQueueItem {
  id?: string;
  prompt: string;
}

export interface AttachmentStatusPreview {
  type: string;
  reason?: string;
  progress?: number;
}

export interface AttachmentPreview {
  id?: string;
  name: string;
  kind?: string;
  contentType?: string;
  status?: AttachmentStatusPreview;
}

export interface ComposerPreview {
  textLength: number;
  role?: string;
  attachments: AttachmentPreview[];
  isEditing?: boolean;
  canCancel?: boolean;
  canSend?: boolean;
  isEmpty?: boolean;
  type?: string;
  queue: ComposerQueueItem[];
}

export interface ThreadPreview {
  isDisabled?: boolean;
  isLoading?: boolean;
  isRunning?: boolean;
  messages: MessagePreview[];
  suggestions: SuggestionPreview[];
  capabilities: string[];
  composer?: ComposerPreview;
}

export interface ThreadListPreview {
  mainThreadId?: string;
  newThreadId?: string | null;
  isLoading?: boolean;
  threadIds: string[];
  archivedThreadIds: string[];
  threadItems: ThreadListItemPreview[];
  main?: ThreadPreview;
}
