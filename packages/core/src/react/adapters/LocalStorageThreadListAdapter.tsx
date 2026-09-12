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
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
  ThreadHistoryAdapter,
  ThreadMessage,
  RunConfig,
  CompleteAttachment,
  MessageStatus,
  ToolModelContentPart,
} from "../../index";
import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../../internal";
import {
  fromThreadMessageLike,
  type ThreadMessageLike,
} from "../../runtime/utils/thread-message-like";
import { isJSONValue, isRecord } from "../../utils/json/is-json";
import {
  RuntimeAdapterProvider,
  type RuntimeAdapters,
} from "../runtimes/RuntimeAdapterProvider";
import type { TitleGenerationAdapter } from "./TitleGenerationAdapter";

export type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

class KeyedMutationQueue {
  private readonly tails = new Map<string, Promise<void>>();

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
};

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
  };
};

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isMessageRole = (value: unknown): value is ThreadMessage["role"] =>
  value === "system" || value === "user" || value === "assistant";

const DEFAULT_STORED_MESSAGE_STATUS = {
  type: "complete",
  reason: "unknown",
} as const satisfies MessageStatus;
const MAX_STORED_MESSAGE_DEPTH = 100;
const KNOWN_ASSISTANT_PART_TYPES = new Set([
  "text",
  "reasoning",
  "tool-call",
  "source",
  "file",
  "image",
  "data",
  "generative-ui",
]);

const parseStoredMessageStatus = (value: unknown): MessageStatus => {
  if (!isRecord(value)) return DEFAULT_STORED_MESSAGE_STATUS;

  if (value.type === "running") return { type: "running" };
  if (
    value.type === "requires-action" &&
    (value.reason === "tool-calls" || value.reason === "interrupt")
  ) {
    return { type: "requires-action", reason: value.reason };
  }
  if (
    value.type === "complete" &&
    (value.reason === "stop" || value.reason === "unknown")
  ) {
    return { type: "complete", reason: value.reason };
  }
  if (
    value.type === "incomplete" &&
    (value.reason === "cancelled" ||
      value.reason === "tool-calls" ||
      value.reason === "length" ||
      value.reason === "content-filter" ||
      value.reason === "other" ||
      value.reason === "error")
  ) {
    return {
      type: "incomplete",
      reason: value.reason,
      ...(isJSONValue(value.error) ? { error: value.error } : undefined),
    };
  }

  if (
    typeof value.type === "string" &&
    value.type !== "running" &&
    value.type !== "requires-action" &&
    value.type !== "complete" &&
    value.type !== "incomplete"
  ) {
    return value as unknown as MessageStatus;
  }

  return DEFAULT_STORED_MESSAGE_STATUS;
};

const parseStoredToolModelContent = (
  value: unknown,
): ToolModelContentPart[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  return value.flatMap((entry): ToolModelContentPart[] => {
    if (!isRecord(entry)) return [];
    if (entry.type === "text" && typeof entry.text === "string") {
      return [{ type: "text", text: entry.text }];
    }
    if (
      entry.type === "file" &&
      typeof entry.data === "string" &&
      typeof entry.mediaType === "string" &&
      (entry.filename === undefined || typeof entry.filename === "string")
    ) {
      return [
        {
          type: "file",
          data: entry.data,
          mediaType: entry.mediaType,
          ...(typeof entry.filename === "string"
            ? { filename: entry.filename }
            : undefined),
        },
      ];
    }
    return [];
  });
};

const parseStoredAssistantContent = (
  content: unknown[],
  depth: number,
): StoredAssistantMessage["content"] =>
  content.flatMap((rawPart) => {
    try {
      let part = rawPart;
      if (!isRecord(part) || typeof part.type !== "string") return [];
      // Persistence must not inherit the normalizer's display-only filters.
      if (part.type === "text" || part.type === "reasoning") {
        if (typeof part.text !== "string") return [];
        if (
          part.type === "reasoning" &&
          part.unstable_summary !== undefined &&
          typeof part.unstable_summary !== "string"
        )
          return [];
        return [part as unknown as StoredAssistantMessage["content"][number]];
      }
      if (isRecord(part) && part.type === "tool-call") {
        const { modelContent, messages, ...rest } = part;
        const parsedModelContent = parseStoredToolModelContent(modelContent);
        part = {
          ...rest,
          ...(parsedModelContent !== undefined
            ? { modelContent: parsedModelContent }
            : undefined),
          ...(Array.isArray(messages)
            ? {
                messages: messages.flatMap((message) => {
                  const parsed = parseStoredNestedThreadMessage(
                    message,
                    depth + 1,
                  );
                  return parsed ? [parsed] : [];
                }),
              }
            : undefined),
        };
      }
      const message = fromThreadMessageLike(
        { role: "assistant", content: [part] } as unknown as ThreadMessageLike,
        "stored-part",
        DEFAULT_STORED_MESSAGE_STATUS,
      );
      return message.role === "assistant" ? message.content : [];
    } catch {
      if (
        isRecord(rawPart) &&
        typeof rawPart.type === "string" &&
        !rawPart.type.startsWith("data-") &&
        !KNOWN_ASSISTANT_PART_TYPES.has(rawPart.type)
      ) {
        return [
          rawPart as unknown as StoredAssistantMessage["content"][number],
        ];
      }
      return [];
    }
  });

const isStoredUserContentPart = (value: unknown): boolean => {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "text":
      return typeof value.text === "string";
    case "image":
      return typeof value.image === "string";
    case "file":
      return (
        typeof value.data === "string" && typeof value.mimeType === "string"
      );
    case "audio":
      return (
        isRecord(value.audio) &&
        typeof value.audio.data === "string" &&
        (value.audio.format === "mp3" || value.audio.format === "wav")
      );
    case "data":
      return typeof value.name === "string" && "data" in value;
    default:
      return !value.type.startsWith("data-") || "data" in value;
  }
};

const parseStoredUserContent = (
  content: unknown[],
): StoredUserMessage["content"] =>
  content.flatMap((part) => {
    if (!isStoredUserContentPart(part)) return [];
    try {
      const message = fromThreadMessageLike(
        { role: "user", content: [part] } as unknown as ThreadMessageLike,
        "stored-part",
        DEFAULT_STORED_MESSAGE_STATUS,
      );
      return message.role === "user" ? message.content : [];
    } catch {
      return [part as unknown as StoredUserMessage["content"][number]];
    }
  });

const parseStoredAttachment = (value: unknown): CompleteAttachment | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.type !== "string" ||
    typeof value.name !== "string" ||
    !isRecord(value.status) ||
    value.status.type !== "complete" ||
    !Array.isArray(value.content)
  ) {
    return null;
  }

  return {
    id: value.id,
    type: value.type,
    name: value.name,
    status: { type: "complete" },
    content: [...parseStoredUserContent(value.content)],
    ...(typeof value.contentType === "string"
      ? { contentType: value.contentType }
      : undefined),
  };
};

function parseStoredThreadMessage(
  value: unknown,
  depth = 0,
): ThreadMessage | null {
  if (depth > MAX_STORED_MESSAGE_DEPTH) return null;
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (!isMessageRole(value.role)) return null;
  if (!Array.isArray(value.content)) return null;

  const createdAt = parseDate(value.createdAt);
  if (!createdAt) return null;

  const metadata = value.metadata;
  if (!isRecord(metadata) || !isRecord(metadata.custom)) return null;

  if (value.role === "assistant") {
    const submittedFeedback = isRecord(metadata.submittedFeedback)
      ? metadata.submittedFeedback
      : undefined;
    const submittedFeedbackType = submittedFeedback?.type;

    return {
      id: value.id,
      role: "assistant",
      content: parseStoredAssistantContent(value.content, depth),
      status: parseStoredMessageStatus(value.status),
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
        steps: Array.isArray(metadata.steps)
          ? (metadata.steps as StoredAssistantMessage["metadata"]["steps"])
          : [],
        ...(submittedFeedbackType === "positive" ||
        submittedFeedbackType === "negative"
          ? {
              submittedFeedback: {
                type: submittedFeedbackType,
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
        custom: metadata.custom,
      },
    };
  }

  if (value.role === "user") {
    return {
      id: value.id,
      role: "user",
      content: parseStoredUserContent(value.content),
      attachments: Array.isArray(value.attachments)
        ? value.attachments.flatMap((attachment) => {
            const parsed = parseStoredAttachment(attachment);
            return parsed ? [parsed] : [];
          })
        : [],
      createdAt,
      metadata: {
        custom: metadata.custom,
      },
    };
  }

  const textParts = parseStoredUserContent(value.content).filter(
    (part) => part.type === "text",
  );

  try {
    return fromThreadMessageLike(
      {
        id: value.id,
        role: "system",
        content:
          textParts.length === 1
            ? textParts
            : [
                {
                  type: "text",
                  text: textParts.map((part) => part.text).join("\n"),
                },
              ],
        createdAt,
        metadata: { custom: metadata.custom },
      },
      value.id,
      DEFAULT_STORED_MESSAGE_STATUS,
    );
  } catch {
    return null;
  }
}

function parseStoredNestedThreadMessage(
  value: unknown,
  depth: number,
): ThreadMessage | null {
  const parsed = parseStoredThreadMessage(value, depth);
  if (parsed || depth > MAX_STORED_MESSAGE_DEPTH || !isRecord(value)) {
    return parsed;
  }
  if (!isMessageRole(value.role) || !Array.isArray(value.content)) return null;

  if (value.role === "assistant") {
    return {
      ...value,
      content: parseStoredAssistantContent(value.content, depth),
    } as unknown as ThreadMessage;
  }
  if (value.role === "user") {
    const { attachments, ...message } = value;
    return {
      ...message,
      content: parseStoredUserContent(value.content),
      ...(Array.isArray(attachments)
        ? {
            attachments: attachments.flatMap((attachment) => {
              const parsedAttachment = parseStoredAttachment(attachment);
              return parsedAttachment ? [parsedAttachment] : [];
            }),
          }
        : undefined),
    } as unknown as ThreadMessage;
  }

  const textParts = parseStoredUserContent(value.content).filter(
    (part) => part.type === "text",
  );
  return {
    ...value,
    content:
      textParts.length === 1
        ? textParts
        : [
            {
              type: "text",
              text: textParts.map((part) => part.text).join("\n"),
            },
          ],
  } as unknown as ThreadMessage;
}

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

  const message = parseStoredThreadMessage(value.message);
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

  async load(): Promise<ExportedMessageRepository> {
    const remoteId = this.aui.threadListItem.getState().remoteId;
    if (!remoteId) return { messages: [] };

    const raw = await this.storage.getItem(this._messagesKey(remoteId));
    return parseStoredMessageRepository(raw);
  }

  async append(item: ExportedMessageRepositoryItem): Promise<void> {
    const { remoteId } = await this.aui.threadListItem.initialize();

    const key = this._messagesKey(remoteId);
    await this.mutationQueue.run(key, async () => {
      const raw = await this.storage.getItem(key);
      const repo = parseStoredMessageRepository(raw);

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
    });
  }
}

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
  const [history] = useState(
    () =>
      new AsyncStorageHistoryAdapter(
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
      await mutationQueue.run(threadsKey, async () => {
        const threads = await loadThreadMetadata();
        const filtered = threads.filter((t) => t.remoteId !== remoteId);
        await saveThreadMetadata(filtered);
      });
      const key = messagesKey(remoteId);
      await mutationQueue.run(key, () => storage.removeItem(key));
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
