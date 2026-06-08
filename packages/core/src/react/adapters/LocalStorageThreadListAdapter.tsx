import { type AssistantStream, createAssistantStream } from "assistant-stream";
import { type FC, type PropsWithChildren, useMemo } from "react";
import { useAui } from "@assistant-ui/store";
import type {
  GenericThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  MessageStorageEntry,
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "../../index";
import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../../internal";
import { RuntimeAdapterProvider } from "../runtimes/RuntimeAdapterProvider";
import type { TitleGenerationAdapter } from "./TitleGenerationAdapter";

export type AsyncStorageLike = {
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
  custom?: Record<string, unknown> | undefined;
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

  private _formatKey(remoteId: string) {
    return `${this.prefix}format:${remoteId}`;
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

  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage> {
    const storage = this.storage;
    const aui = this.aui;
    const formatKey = (remoteId: string) => `${this.prefix}format:${remoteId}`;

    return {
      load: async (): Promise<MessageFormatRepository<TMessage>> => {
        const remoteId = aui.threadListItem().getState().remoteId;
        if (!remoteId) return { messages: [] };

        const raw = await storage.getItem(formatKey(remoteId));
        if (!raw) return { messages: [] };

        const entries = JSON.parse(
          raw,
        ) as MessageStorageEntry<TStorageFormat>[];
        return {
          headId: entries.length > 0 ? entries[entries.length - 1]!.id : null,
          messages: entries.map((entry) => formatAdapter.decode(entry)),
        };
      },

      append: async (item: MessageFormatItem<TMessage>): Promise<void> => {
        const { remoteId } = await aui.threadListItem().initialize();

        const raw = await storage.getItem(formatKey(remoteId));
        const entries: MessageStorageEntry<TStorageFormat>[] = raw
          ? (JSON.parse(raw) as MessageStorageEntry<TStorageFormat>[])
          : [];

        const entry: MessageStorageEntry<TStorageFormat> = {
          id: formatAdapter.getId(item.message),
          parent_id: item.parentId,
          format: formatAdapter.format,
          content: formatAdapter.encode(item),
        };

        const idx = entries.findIndex((e) => e.id === entry.id);
        if (idx >= 0) {
          entries[idx] = entry;
        } else {
          entries.push(entry);
        }

        await storage.setItem(formatKey(remoteId), JSON.stringify(entries));
      },

      update: async (
        item: MessageFormatItem<TMessage>,
        localMessageId: string,
      ): Promise<void> => {
        const { remoteId } = await aui.threadListItem().initialize();

        const raw = await storage.getItem(formatKey(remoteId));
        if (!raw) return;
        const entries: MessageStorageEntry<TStorageFormat>[] = JSON.parse(
          raw,
        ) as MessageStorageEntry<TStorageFormat>[];

        const idx = entries.findIndex((e) => e.id === localMessageId);
        if (idx >= 0) {
          entries[idx] = {
            id: localMessageId,
            parent_id: item.parentId,
            format: formatAdapter.format,
            content: formatAdapter.encode(item),
          };
          await storage.setItem(formatKey(remoteId), JSON.stringify(entries));
        }
      },
    };
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
          custom: t.custom,
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

    async updateCustom(
      remoteId: string,
      custom: Record<string, unknown> | undefined,
    ): Promise<void> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((t) => t.remoteId === remoteId);
      if (thread) {
        thread.custom = custom;
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
      await storage.removeItem(`${prefix}format:${remoteId}`);
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
        custom: thread.custom,
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
