import { type AssistantStream, createAssistantStream } from "assistant-stream";
import {
  type FC,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAui } from "@assistant-ui/store";
import type {
  MessageModality,
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
  ThreadHistoryAdapter,
  ThreadMessage,
  RunConfig,
} from "../../index";
import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../../internal";
import type {
  GenericThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  MessageStorageEntry,
} from "../../adapters/thread-history";
import { isRecord } from "../../utils/json/is-json";
import {
  MAX_STORED_MESSAGE_DEPTH,
  isStoredMessageStatus,
  isStoredMessagePart,
  isStoredMessageRole,
  parseStoredAttachment,
  parseStoredDate,
  parseStoredThreadSteps,
} from "../../runtime/utils/stored-message-parts";
import {
  RuntimeAdapterProvider,
  type RuntimeAdapters,
} from "../runtimes/RuntimeAdapterProvider";
import {
  type KeyedThreadListItem,
  tryGetKeyedThreadListItem,
} from "../runtimes/keyedThreadListItem";
import type { TitleGenerationAdapter } from "./TitleGenerationAdapter";

export type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

class KeyedMutationQueue {
  private readonly tails = new Map<string, Promise<void>>();
  private readonly staleKeys = new Set<string>();

  markStale(key: string) {
    this.staleKeys.add(key);
  }

  async removeStale(key: string, storage: AsyncStorageLike) {
    if (!this.staleKeys.has(key)) return;
    await storage.removeItem(key);
    this.staleKeys.delete(key);
  }

  // Mutations may acquire another key but must never re-enter the key they
  // already hold. Thread lifecycle mutations acquire messages before metadata.
  run<T>(key: string, mutation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key);
    const result = previous ? previous.then(mutation) : mutation();
    const tail = result.then(
      () => undefined,
      () => undefined,
    );

    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });

    return result;
  }
}

const mutationQueues = new WeakMap<AsyncStorageLike, KeyedMutationQueue>();

const getMutationQueue = (storage: AsyncStorageLike): KeyedMutationQueue => {
  let queue = mutationQueues.get(storage);
  if (!queue) {
    queue = new KeyedMutationQueue();
    mutationQueues.set(storage, queue);
  }
  return queue;
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
  formats?: string[];
};

type PendingThreadDeletion = {
  remoteId: string;
  keys: string[];
};

type StoredSystemMessage = Extract<ThreadMessage, { role: "system" }>;
type StoredUserMessage = Extract<ThreadMessage, { role: "user" }>;
type StoredAssistantMessage = Extract<ThreadMessage, { role: "assistant" }>;

const parseJSON = (raw: string | null): unknown => {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
};

const parseStoredThread = (value: unknown): StoredThreadMetadata | null => {
  if (!isRecord(value) || typeof value.remoteId !== "string") return null;

  const status = value.status ?? "regular";
  if (status !== "regular" && status !== "archived") return null;

  return {
    remoteId: value.remoteId,
    status,
    ...(typeof value.externalId === "string"
      ? { externalId: value.externalId }
      : undefined),
    ...(typeof value.title === "string" ? { title: value.title } : undefined),
    ...(isRecord(value.custom) ? { custom: value.custom } : undefined),
    ...(Array.isArray(value.formats) &&
    value.formats.every((format) => typeof format === "string")
      ? { formats: value.formats }
      : undefined),
  };
};

const parsePendingThreadDeletions = (
  raw: string | null,
): PendingThreadDeletion[] => {
  const parsed = parseJSON(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.remoteId !== "string" ||
      !Array.isArray(item.keys) ||
      item.keys.length === 0 ||
      !item.keys.every((key) => typeof key === "string")
    ) {
      return [];
    }

    return [{ remoteId: item.remoteId, keys: item.keys }];
  });
};

const formattedMessagesKey = (
  prefix: string,
  remoteId: string,
  format: string,
) => `${prefix}formatted-messages:${JSON.stringify([remoteId, format])}`;

const messageModalities = {
  voice: true,
} satisfies Record<MessageModality, true>;

const isMessageModality = (value: unknown): value is MessageModality =>
  typeof value === "string" && Object.hasOwn(messageModalities, value);

const parseStoredMessageParts = (
  content: unknown[],
  depth: number,
): unknown[] =>
  content.flatMap((part) => {
    if (!isStoredMessagePart(part)) return [];
    if (part.type !== "tool-call" || part.messages === undefined) return [part];

    const { messages, ...toolCall } = part;
    if (!Array.isArray(messages)) return [toolCall];
    return [
      {
        ...toolCall,
        messages: messages.flatMap((item) => {
          const message = parseStoredThreadMessage(item, depth + 1);
          return message ? [message] : [];
        }),
      },
    ];
  });

const parseStoredThreadMessage = (
  value: unknown,
  depth: number,
): ThreadMessage | null => {
  if (depth > MAX_STORED_MESSAGE_DEPTH) return null;
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (!isStoredMessageRole(value.role)) return null;
  if (!Array.isArray(value.content)) return null;

  const createdAt = parseStoredDate(value.createdAt);
  if (!createdAt) return null;

  const metadata = value.metadata;
  if (!isRecord(metadata) || !isRecord(metadata.custom)) return null;

  const modality = isMessageModality(metadata.modality)
    ? metadata.modality
    : undefined;

  if (value.role === "assistant") {
    const status = isStoredMessageStatus(value.status)
      ? value.status
      : { type: "complete", reason: "unknown" as const };

    const submittedFeedback = isRecord(metadata.submittedFeedback)
      ? metadata.submittedFeedback
      : undefined;
    const submittedFeedbackType = submittedFeedback?.type;
    const submittedFeedbackComment = submittedFeedback?.comment;

    return {
      id: value.id,
      role: "assistant",
      content: parseStoredMessageParts(
        value.content,
        depth,
      ) as StoredAssistantMessage["content"],
      status: status as StoredAssistantMessage["status"],
      createdAt,
      metadata: {
        unstable_state: (metadata.unstable_state ??
          null) as StoredAssistantMessage["metadata"]["unstable_state"],
        unstable_annotations: Array.isArray(metadata.unstable_annotations)
          ? (metadata.unstable_annotations as StoredAssistantMessage["metadata"]["unstable_annotations"])
          : [],
        unstable_data: Array.isArray(metadata.unstable_data)
          ? (metadata.unstable_data as StoredAssistantMessage["metadata"]["unstable_data"])
          : [],
        steps: parseStoredThreadSteps(metadata.steps),
        ...(submittedFeedbackType === "positive" ||
        submittedFeedbackType === "negative"
          ? {
              submittedFeedback: {
                type: submittedFeedbackType,
                ...(typeof submittedFeedbackComment === "string" &&
                submittedFeedbackComment !== ""
                  ? { comment: submittedFeedbackComment }
                  : undefined),
              },
            }
          : undefined),
        ...(metadata.timing !== undefined
          ? {
              timing: metadata.timing as NonNullable<
                StoredAssistantMessage["metadata"]["timing"]
              >,
            }
          : undefined),
        ...(metadata.isOptimistic === true
          ? { isOptimistic: true }
          : undefined),
        ...(modality !== undefined ? { modality } : undefined),
        custom: metadata.custom,
      },
    };
  }

  if (value.role === "user") {
    return {
      id: value.id,
      role: "user",
      content: parseStoredMessageParts(
        value.content,
        depth,
      ) as StoredUserMessage["content"],
      attachments: Array.isArray(value.attachments)
        ? value.attachments.flatMap((item) => {
            const attachment = parseStoredAttachment(item, isStoredMessagePart);
            return attachment ? [attachment] : [];
          })
        : [],
      createdAt,
      metadata: {
        ...(modality !== undefined ? { modality } : undefined),
        custom: metadata.custom,
      },
    };
  }

  const content = parseStoredMessageParts(value.content, depth);
  if (content.length !== 1) return null;

  return {
    id: value.id,
    role: "system",
    content: [content[0] as StoredSystemMessage["content"][0]],
    createdAt,
    metadata: {
      custom: metadata.custom,
    },
  };
};

export const parseStoredThreadMetadata = (
  raw: string | null,
): StoredThreadMetadata[] => {
  const parsed = parseJSON(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item) => {
    const thread = parseStoredThread(item);
    return thread ? [thread] : [];
  });
};

const parseStoredMessageRepositoryItem = (
  value: unknown,
): ExportedMessageRepositoryItem | null => {
  if (!isRecord(value)) return null;

  const message = parseStoredThreadMessage(value.message, 0);
  if (!message) return null;

  const parentId = value.parentId;
  if (
    parentId !== undefined &&
    parentId !== null &&
    typeof parentId !== "string"
  ) {
    return null;
  }

  return {
    message,
    parentId: parentId ?? null,
    ...(isRecord(value.runConfig)
      ? { runConfig: value.runConfig as RunConfig }
      : undefined),
  };
};

export const parseStoredMessageRepository = (
  raw: string | null,
): ExportedMessageRepository => {
  const parsed = parseJSON(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.messages)) {
    return { messages: [] };
  }

  const candidateMessages = parsed.messages.flatMap((item) => {
    const parsedItem = parseStoredMessageRepositoryItem(item);
    return parsedItem ? [parsedItem] : [];
  });

  const acceptedIds = new Set<string>();
  const messages = candidateMessages.flatMap((item) => {
    if (acceptedIds.has(item.message.id)) return [];
    if (item.parentId !== null && !acceptedIds.has(item.parentId)) return [];

    acceptedIds.add(item.message.id);
    return [item];
  });

  const headId =
    parsed.headId === null ||
    (typeof parsed.headId === "string" &&
      messages.some((item) => item.message.id === parsed.headId))
      ? parsed.headId
      : undefined;

  return {
    ...(headId !== undefined ? { headId } : undefined),
    messages,
  };
};

type StoredFormatEntry = MessageStorageEntry<Record<string, unknown>>;

const parseStoredFormatEntries = (
  raw: string | null,
  format: string,
): StoredFormatEntry[] => {
  const parsed = parseJSON(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.messages)) return [];

  return parsed.messages.flatMap((entry) =>
    isRecord(entry) &&
    typeof entry.id === "string" &&
    (entry.parent_id === null || typeof entry.parent_id === "string") &&
    entry.format === format &&
    isRecord(entry.content)
      ? [
          {
            id: entry.id,
            parent_id: entry.parent_id,
            format,
            content: entry.content,
          },
        ]
      : [],
  );
};

class AsyncStorageHistoryAdapter implements ThreadHistoryAdapter {
  private storage: AsyncStorageLike;
  private getAui: () => ReturnType<typeof useAui>;
  private prefix: string;
  private mutationQueue: KeyedMutationQueue;

  constructor(
    storage: AsyncStorageLike,
    getAui: () => ReturnType<typeof useAui>,
    prefix: string,
    mutationQueue: KeyedMutationQueue,
  ) {
    this.storage = storage;
    this.getAui = getAui;
    this.prefix = prefix;
    this.mutationQueue = mutationQueue;
  }

  private get aui(): ReturnType<typeof useAui> {
    return this.getAui();
  }

  private _messagesKey(remoteId: string) {
    return `${this.prefix}messages:${remoteId}`;
  }

  private _threadsKey() {
    return `${this.prefix}threads`;
  }

  async load(): Promise<ExportedMessageRepository> {
    const remoteId = this.aui.threadListItem.getState().remoteId;
    if (!remoteId) return { messages: [] };

    const raw = await this.storage.getItem(this._messagesKey(remoteId));
    return parseStoredMessageRepository(raw);
  }

  private async _write(
    remoteId: string,
    key: string,
    format: string | undefined,
    write: (raw: string | null) => string,
  ): Promise<void> {
    await this.mutationQueue.run(this._messagesKey(remoteId), async () => {
      // A missing or unreadable metadata blob is not evidence of deletion, so
      // only a readable list that omits the thread skips the write.
      const deleted = await this.mutationQueue.run(
        this._threadsKey(),
        async () => {
          const raw = await this.storage.getItem(this._threadsKey());
          const parsed = parseJSON(raw);
          if (!Array.isArray(parsed)) return false;

          const threads = parseStoredThreadMetadata(raw);
          const thread = threads.find((item) => item.remoteId === remoteId);
          if (!thread) return true;

          // Thread deletion removes the formatted keys recorded here.
          if (format !== undefined && !thread.formats?.includes(format)) {
            thread.formats = [...(thread.formats ?? []), format];
            await this.storage.setItem(
              this._threadsKey(),
              JSON.stringify(threads),
            );
          }
          return false;
        },
      );
      if (deleted) return;

      await this.mutationQueue.removeStale(key, this.storage);
      const raw = await this.storage.getItem(key);
      await this.storage.setItem(key, write(raw));
    });
  }

  private async _upsert(
    item: ExportedMessageRepositoryItem,
    moveHead: boolean,
  ): Promise<void> {
    // Initialization acquires the same message key, so it must settle before
    // the upsert takes that lock.
    const { remoteId } = await this.aui.threadListItem.initialize();

    await this._write(
      remoteId,
      this._messagesKey(remoteId),
      undefined,
      (raw) => {
        const repo = parseStoredMessageRepository(raw);

        const idx = repo.messages.findIndex(
          (m) => m.message.id === item.message.id,
        );
        if (idx >= 0) {
          repo.messages[idx] = item;
        } else {
          repo.messages.push(item);
        }
        if (moveHead) repo.headId = item.message.id;

        return JSON.stringify(repo);
      },
    );
  }

  async append(item: ExportedMessageRepositoryItem): Promise<void> {
    await this._upsert(item, true);
  }

  async update(item: ExportedMessageRepositoryItem): Promise<void> {
    await this._upsert(item, false);
  }

  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage> {
    const { format } = formatAdapter;
    let pinned: KeyedThreadListItem | undefined;
    const pinCurrent = () => {
      pinned = tryGetKeyedThreadListItem(this.aui) ?? pinned;
      return pinned ?? this.aui.threadListItem;
    };
    const writeEntries = async (
      update: (entries: StoredFormatEntry[]) => StoredFormatEntry[],
    ) => {
      // Initialization acquires the same message key, so it must settle
      // before the write takes that lock.
      const { remoteId } = await (pinned ?? pinCurrent()).initialize();
      await this._write(
        remoteId,
        formattedMessagesKey(this.prefix, remoteId, format),
        format,
        (raw) =>
          JSON.stringify({
            messages: update(parseStoredFormatEntries(raw, format)),
          }),
      );
    };
    const upsert = async (item: MessageFormatItem<TMessage>) => {
      const entry: StoredFormatEntry = {
        id: formatAdapter.getId(item.message),
        parent_id: item.parentId,
        format,
        content: formatAdapter.encode(item),
      };
      await writeEntries((entries) => {
        const idx = entries.findIndex((e) => e.id === entry.id);
        if (idx >= 0) {
          entries[idx] = entry;
        } else {
          entries.push(entry);
        }
        return entries;
      });
    };

    return {
      pin() {
        pinCurrent();
      },
      load: async (): Promise<MessageFormatRepository<TMessage>> => {
        const remoteId = pinCurrent().getState().remoteId;
        if (!remoteId) return { messages: [] };

        const key = formattedMessagesKey(this.prefix, remoteId, format);
        const raw = await this.mutationQueue.run(
          this._messagesKey(remoteId),
          async () => {
            await this.mutationQueue.removeStale(key, this.storage);
            return this.storage.getItem(key);
          },
        );
        return {
          messages: parseStoredFormatEntries(raw, format).map((entry) =>
            formatAdapter.decode(entry as MessageStorageEntry<TStorageFormat>),
          ),
        };
      },
      append: upsert,
      update: upsert,
      delete: async (items) => {
        if (!(pinned ?? pinCurrent()).getState().remoteId) return;
        const ids = new Set(
          items.map((item) => formatAdapter.getId(item.message)),
        );
        await writeEntries((entries) => {
          const parents = new Map(
            entries.map((entry) => [entry.id, entry.parent_id]),
          );
          return entries.flatMap((entry) => {
            if (ids.has(entry.id)) return [];
            let parentId = entry.parent_id;
            const visited = new Set<string>();
            while (parentId !== null && ids.has(parentId)) {
              if (visited.has(parentId)) {
                parentId = null;
                break;
              }
              visited.add(parentId);
              parentId = parents.get(parentId) ?? null;
            }
            return [{ ...entry, parent_id: parentId }];
          });
        });
      },
    };
  }
}

export const createLocalStorageHistoryAdapter = (
  storage: AsyncStorageLike,
  getAui: () => ReturnType<typeof useAui>,
  prefix: string,
  mutationQueue = getMutationQueue(storage),
): ThreadHistoryAdapter =>
  new AsyncStorageHistoryAdapter(storage, getAui, prefix, mutationQueue);

const useLocalStorageThreadAdapters = (
  storage: AsyncStorageLike,
  prefix: string,
  mutationQueue: KeyedMutationQueue,
): RuntimeAdapters => {
  const aui = useAui();
  // Not useEffectEvent: history adapter methods run during render (SSR load).
  const auiRef = useRef(aui);
  useEffect(() => {
    auiRef.current = aui;
  });
  const [history] = useState(() =>
    createLocalStorageHistoryAdapter(
      storage,
      () => auiRef.current,
      prefix,
      mutationQueue,
    ),
  );
  return useMemo(() => ({ history }), [history]);
};

const createHistoryProvider = (
  storage: AsyncStorageLike,
  prefix: string,
  mutationQueue: KeyedMutationQueue,
): FC<PropsWithChildren> => {
  const Provider: FC<PropsWithChildren> = ({ children }) => {
    const adapters = useLocalStorageThreadAdapters(
      storage,
      prefix,
      mutationQueue,
    );
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
  const pendingDeletionsKey = `${prefix}pending-thread-deletions`;
  const mutationQueue = getMutationQueue(storage);

  const loadThreadMetadata = async (): Promise<StoredThreadMetadata[]> => {
    const raw = await storage.getItem(threadsKey);
    return parseStoredThreadMetadata(raw);
  };

  const saveThreadMetadata = async (
    threads: StoredThreadMetadata[],
  ): Promise<void> => {
    await storage.setItem(threadsKey, JSON.stringify(threads));
  };

  const loadPendingDeletions = async (): Promise<PendingThreadDeletion[]> =>
    parsePendingThreadDeletions(await storage.getItem(pendingDeletionsKey));

  const savePendingDeletions = async (
    deletions: PendingThreadDeletion[],
  ): Promise<void> => {
    if (deletions.length === 0) {
      await storage.removeItem(pendingDeletionsKey);
    } else {
      await storage.setItem(pendingDeletionsKey, JSON.stringify(deletions));
    }
  };

  const addPendingDeletion = async (
    remoteId: string,
    keys: string[],
  ): Promise<PendingThreadDeletion> =>
    mutationQueue.run(pendingDeletionsKey, async () => {
      const deletions = await loadPendingDeletions();
      const existing = deletions.find(
        (deletion) => deletion.remoteId === remoteId,
      );
      const deletion = {
        remoteId,
        keys: [...new Set([...(existing?.keys ?? []), ...keys])],
      };
      const next = existing
        ? deletions.map((item) => (item === existing ? deletion : item))
        : [...deletions, deletion];
      await savePendingDeletions(next);
      return deletion;
    });

  const removePendingDeletionKey = async (
    remoteId: string,
    key: string,
  ): Promise<void> =>
    mutationQueue.run(pendingDeletionsKey, async () => {
      const deletions = await loadPendingDeletions();
      const existing = deletions.find(
        (deletion) => deletion.remoteId === remoteId,
      );
      if (!existing) return;

      const keys = existing.keys.filter((item) => item !== key);
      const next =
        keys.length === 0
          ? deletions.filter((item) => item !== existing)
          : deletions.map((item) =>
              item === existing ? { remoteId, keys } : item,
            );
      await savePendingDeletions(next);
    });

  const removeThreadMetadata = async (remoteId: string): Promise<void> => {
    await mutationQueue.run(threadsKey, async () => {
      const threads = await loadThreadMetadata();
      const filtered = threads.filter((thread) => thread.remoteId !== remoteId);
      if (filtered.length !== threads.length) {
        await saveThreadMetadata(filtered);
      }
    });
  };

  const removePendingKeys = async (
    deletion: PendingThreadDeletion,
  ): Promise<void> => {
    const results = await Promise.allSettled(
      deletion.keys.map(async (key) => {
        mutationQueue.markStale(key);
        await mutationQueue.removeStale(key, storage);
        await removePendingDeletionKey(deletion.remoteId, key);
      }),
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
  };

  const drainPendingDeletion = async (
    deletion: PendingThreadDeletion,
  ): Promise<void> => {
    const threadExists = await mutationQueue.run(threadsKey, async () =>
      (await loadThreadMetadata()).some(
        (thread) => thread.remoteId === deletion.remoteId,
      ),
    );
    if (threadExists) {
      await mutationQueue.run(pendingDeletionsKey, async () => {
        const deletions = await loadPendingDeletions();
        await savePendingDeletions(
          deletions.filter((item) => item.remoteId !== deletion.remoteId),
        );
      });
      return;
    }
    await removePendingKeys(deletion);
  };

  const drainPendingDeletions = async (
    remoteId?: string,
    messageLockHeldFor?: string,
  ): Promise<void> => {
    const deletions = await mutationQueue.run(
      pendingDeletionsKey,
      loadPendingDeletions,
    );
    let failure: unknown;
    for (const deletion of deletions) {
      if (remoteId !== undefined && deletion.remoteId !== remoteId) continue;
      try {
        if (deletion.remoteId === messageLockHeldFor) {
          await drainPendingDeletion(deletion);
        } else {
          await mutationQueue.run(messagesKey(deletion.remoteId), () =>
            drainPendingDeletion(deletion),
          );
        }
      } catch (error) {
        if (failure === undefined) failure = error;
      }
    }
    if (failure !== undefined) throw failure;
  };

  const updateThreadMetadata = async (
    remoteId: string,
    update: (thread: StoredThreadMetadata) => void,
  ): Promise<void> => {
    await mutationQueue.run(threadsKey, async () => {
      const threads = await loadThreadMetadata();
      const thread = threads.find((item) => item.remoteId === remoteId);
      if (thread) {
        update(thread);
        await saveThreadMetadata(threads);
      }
    });
  };

  const adapter: RemoteThreadListAdapter = {
    unstable_Provider: createHistoryProvider(storage, prefix, mutationQueue),
    unstable_useAdapters: function useLocalStorageAdapters() {
      return useLocalStorageThreadAdapters(storage, prefix, mutationQueue);
    },

    async list(): Promise<RemoteThreadListResponse> {
      try {
        await drainPendingDeletions();
      } catch (error) {
        console.warn("[assistant-ui] Local history cleanup failed:", error);
      }
      const threads = await mutationQueue.run(threadsKey, loadThreadMetadata);

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
      const key = messagesKey(remoteId);
      return mutationQueue.run(key, async () => {
        await drainPendingDeletions(remoteId, remoteId);

        return mutationQueue.run(threadsKey, async () => {
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
        });
      });
    },

    async rename(remoteId: string, newTitle: string): Promise<void> {
      await updateThreadMetadata(remoteId, (thread) => {
        thread.title = newTitle;
      });
    },

    async updateCustom(
      remoteId: string,
      custom: Record<string, unknown> | undefined,
    ): Promise<void> {
      await updateThreadMetadata(remoteId, (thread) => {
        thread.custom = custom;
      });
    },

    async archive(remoteId: string): Promise<void> {
      await updateThreadMetadata(remoteId, (thread) => {
        thread.status = "archived";
      });
    },

    async unarchive(remoteId: string): Promise<void> {
      await updateThreadMetadata(remoteId, (thread) => {
        thread.status = "regular";
      });
    },

    async delete(remoteId: string): Promise<void> {
      const key = messagesKey(remoteId);
      await mutationQueue.run(key, async () => {
        const threads = await mutationQueue.run(threadsKey, loadThreadMetadata);
        const thread = threads.find((item) => item.remoteId === remoteId);
        const keys = [
          key,
          ...(thread?.formats ?? []).map((format) =>
            formattedMessagesKey(prefix, remoteId, format),
          ),
        ];
        const deletion = await addPendingDeletion(remoteId, keys);
        await removeThreadMetadata(remoteId);
        try {
          await removePendingKeys(deletion);
        } catch (error) {
          console.warn(
            "[assistant-ui] Thread deletion committed, but local history cleanup failed:",
            error,
          );
        }
      });
    },

    async fetch(threadId: string): Promise<RemoteThreadMetadata> {
      const threads = await loadThreadMetadata();
      const thread = threads.find((t) => t.remoteId === threadId);
      if (!thread)
        throw new Error(
          `Stored thread "${threadId}" not found while fetching thread metadata.`,
        );
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
        await updateThreadMetadata(remoteId, (thread) => {
          thread.title = title;
        });

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
