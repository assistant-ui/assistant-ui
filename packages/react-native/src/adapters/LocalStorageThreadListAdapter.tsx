import { type AssistantStream, createAssistantStream } from "assistant-stream";
import { FC, PropsWithChildren, useMemo } from "react";
import { useAui } from "@assistant-ui/store";
import type {
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "@assistant-ui/core/internal";
import { RuntimeAdapterProvider } from "../context/providers/RuntimeAdapterProvider";
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

class AsyncStorageHistoryAdapter implements ThreadHistoryAdapter {
  constructor(
    private storage: AsyncStorageLike,
    private aui: ReturnType<typeof useAui>,
    private prefix: string,
  ) {}

  private _messagesKey(remoteId: string) {
    return `${this.prefix}messages:${remoteId}`;
  }

  async load(): Promise<ExportedMessageRepository> {
    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };

    const raw = await this.storage.getItem(this._messagesKey(remoteId));
    if (!raw) return { messages: [] };
    return JSON.parse(raw) as ExportedMessageRepository;
  }

  async append(item: ExportedMessageRepositoryItem): Promise<void> {
    const { remoteId } = await this.aui.threadListItem().initialize();

    const key = this._messagesKey(remoteId);
    const raw = await this.storage.getItem(key);
    const repo: ExportedMessageRepository = raw
      ? (JSON.parse(raw) as ExportedMessageRepository)
      : { messages: [] };

    const idx = repo.messages.findIndex(
      (m) => m.message.id === item.message.id,
    );
    if (idx >= 0) {
      repo.messages[idx] = item;
    } else {
      repo.messages.push(item);
    }
    repo.headId = item.message.id;

    await this.storage.setItem(key, JSON.stringify(repo));
  }
}

const createHistoryProvider = (
  storage: AsyncStorageLike,
  prefix: string,
): FC<PropsWithChildren> => {
  const Provider: FC<PropsWithChildren> = ({ children }) => {
    const aui = useAui();
    const history = useMemo(
      () => new AsyncStorageHistoryAdapter(storage, aui, prefix),
      [aui],
    );
    const adapters = useMemo(() => ({ history }), [history]);

    return (
      <RuntimeAdapterProvider adapters={adapters}>
        {children}
      </RuntimeAdapterProvider>
    );
  };
  return Provider;
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
    unstable_Provider: createHistoryProvider(storage, prefix),

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
