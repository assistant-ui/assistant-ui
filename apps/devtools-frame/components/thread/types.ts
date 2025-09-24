export interface ThreadListItemPreview {
  id: string;
  title?: string;
  status?: string;
  externalId?: string;
  remoteId?: string;
}

export interface MessagePreview {
  id: string;
  role: string;
  createdAt?: string;
  summary: string;
  status?: string;
  attachments: string[];
}

export interface SuggestionPreview {
  prompt?: string;
}

export interface ComposerPreview {
  textLength: number;
  role?: string;
  attachments: number;
  isEditing?: boolean;
  canCancel?: boolean;
  isEmpty?: boolean;
  type?: string;
}

export interface ThreadPreview {
  isDisabled?: boolean;
  isLoading?: boolean;
  isRunning?: boolean;
  messageCount: number;
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
