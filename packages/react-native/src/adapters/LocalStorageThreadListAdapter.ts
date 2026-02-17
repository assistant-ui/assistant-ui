import { type AssistantStream, createAssistantStream } from "assistant-stream";
import type {
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
  ThreadMessage,
} from "@assistant-ui/core";
import type { ExportedMessageRepository } from "@assistant-ui/core/internal";
import type { TitleGenerationAdapter } from "./TitleGenerationAdapter";

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type LocalStorageAdapterOptions = {
  storage: AsyncStorageLike;
  prefix?: string | undefined;
  titleGenerator?: TitleGenerationAdapter | undefined;
};

type StoredThreadMetadata = {
  remoteId: string;
  externalId?: string;
  status: "regular" | "archived";
  title?: string;
};

export const createLocalStorageAdapter = (
  options: LocalStorageAdapterOptions,
): RemoteThreadListAdapter => {
  const { storage, prefix = "@assistant-ui:", titleGenerator } = options;

  const threadsKey = `${prefix}threads`;
  const messagesKey = (threadId: string) => `${prefix}messages:${threadId}`;

  const loadThreadMetadata = async (): Promise<StoredThreadMetadata[]> => {
    const raw = await storage.getItem(threadsKey);
    return raw ? (JSON.parse(raw) as StoredThreadMetadata[]) : [];
  };

  const saveThreadMetadata = async (
    threads: StoredThreadMetadata[],
  ): Promise<void> => {
    await storage.setItem(threadsKey, JSON.stringify(threads));
  };

  const adapter: RemoteThreadListAdapter = {
    async list(): Promise<RemoteThreadListResponse> {
      const threads = await loadThreadMetadata();
      return {
        threads: threads.map((t) => ({
          remoteId: t.remoteId,
          externalId: t.externalId,
          status: t.status,
          title: t.title,
        })),
      };
    },

    async initialize(
      threadId: string,
    ): Promise<RemoteThreadInitializeResponse> {
      const remoteId = threadId;
      const threads = await loadThreadMetadata();

      // Only add if not already present
      if (!threads.some((t) => t.remoteId === remoteId)) {
        threads.unshift({
          remoteId,
          status: "regular",
        });
        await saveThreadMetadata(threads);
      }

      return { remoteId, externalId: undefined };
    },

    async rename(remoteId: string, newTitle: string): Promise<void> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((t) => t.remoteId === remoteId);
      if (thread) {
        thread.title = newTitle;
        await saveThreadMetadata(threads);
      }
    },

    async archive(remoteId: string): Promise<void> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((t) => t.remoteId === remoteId);
      if (thread) {
        thread.status = "archived";
        await saveThreadMetadata(threads);
      }
    },

    async unarchive(remoteId: string): Promise<void> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((t) => t.remoteId === remoteId);
      if (thread) {
        thread.status = "regular";
        await saveThreadMetadata(threads);
      }
    },

    async delete(remoteId: string): Promise<void> {
      const threads = await loadThreadMetadata();
      const filtered = threads.filter((t) => t.remoteId !== remoteId);
      await saveThreadMetadata(filtered);
      await storage.removeItem(messagesKey(remoteId));
    },

    async fetch(threadId: string): Promise<RemoteThreadMetadata> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((t) => t.remoteId === threadId);
      if (!thread) throw new Error("Thread not found");
      return {
        remoteId: thread.remoteId,
        externalId: thread.externalId,
        status: thread.status,
        title: thread.title,
      };
    },

    async generateTitle(
      remoteId: string,
      messages: readonly ThreadMessage[],
    ): Promise<AssistantStream> {
      if (titleGenerator) {
        const title = await titleGenerator.generateTitle(messages);

        // Update the stored title
        const threads = await loadThreadMetadata();
        const thread = threads.find((t) => t.remoteId === remoteId);
        if (thread) {
          thread.title = title;
          await saveThreadMetadata(threads);
        }

        // Return a stream with a single text part
        return createAssistantStream((controller) => {
          controller.appendText(title);
        });
      }

      // No title generator — return empty stream
      return createAssistantStream(() => {});
    },
  };

  return adapter;
};

/** Save messages for a thread to local storage */
export const saveThreadMessages = async (
  storage: AsyncStorageLike,
  remoteId: string,
  data: ExportedMessageRepository,
  prefix = "@assistant-ui:",
): Promise<void> => {
  await storage.setItem(`${prefix}messages:${remoteId}`, JSON.stringify(data));
};

/** Load messages for a thread from local storage */
export const loadThreadMessages = async (
  storage: AsyncStorageLike,
  remoteId: string,
  prefix = "@assistant-ui:",
): Promise<ExportedMessageRepository | undefined> => {
  const raw = await storage.getItem(`${prefix}messages:${remoteId}`);
  if (!raw) return undefined;
  return JSON.parse(raw) as ExportedMessageRepository;
};
