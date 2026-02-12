import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import type { ChatInit } from "ai";
import type { AssistantCloud } from "assistant-cloud";

export type ThreadStatus = "regular" | "archived";

export type CloudThread = {
  id: string;
  title: string;
  status: ThreadStatus;
  externalId: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type UseThreadsOptions = {
  cloud: AssistantCloud;
  includeArchived?: boolean;
  // Set false when useCloudChat owns thread loading.
  enabled?: boolean;
};

export type UseThreadsResult = {
  cloud: AssistantCloud;
  threads: CloudThread[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<boolean>;
  get: (id: string) => Promise<CloudThread | null>;
  create: (options?: { externalId?: string }) => Promise<CloudThread | null>;
  delete: (id: string) => Promise<boolean>;
  rename: (id: string, title: string) => Promise<boolean>;
  archive: (id: string) => Promise<boolean>;
  unarchive: (id: string) => Promise<boolean>;
  threadId: string | null;
  selectThread: (id: string | null) => void;
  generateTitle: (threadId: string) => Promise<string | null>;
};

export type UseCloudChatOptions = ChatInit<UIMessage> & {
  // Provide this to share thread state across UI surfaces.
  threads?: UseThreadsResult;
  // Ignored when `threads` is provided.
  cloud?: AssistantCloud;
  onSyncError?: (error: Error) => void;
  // transport is inherited from ChatInit but handled separately by useCloudChat
};

export type UseCloudChatResult = UseChatHelpers<UIMessage> & {
  threadStore: UseThreadsResult;
};

export type ChatMeta = {
  threadId: string | null;
  creatingThread: Promise<string> | null;
  loading: Promise<void> | null;
  loaded: boolean;
};
