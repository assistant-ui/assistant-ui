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
} from "../../index";
import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../../internal";
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

const isMessageStatus = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (value.type === "running") return true;
  if (value.type === "requires-action") {
    return value.reason === "tool-calls" || value.reason === "interrupt";
  }
  if (value.type === "complete") {
    return value.reason === "stop" || value.reason === "unknown";
  }
  return (
    value.type === "incomplete" &&
    (value.reason === "cancelled" ||
      value.reason === "tool-calls" ||
      value.reason === "length" ||
      value.reason === "content-filter" ||
      value.reason === "other" ||
      value.reason === "error") &&
    (value.error === undefined || isJSONValue(value.error))
  );
};

const isMessagePartStatus = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (value.type === "running" || value.type === "complete") return true;
  return (
    value.type === "incomplete" &&
    (value.reason === "cancelled" ||
      value.reason === "length" ||
      value.reason === "content-filter" ||
      value.reason === "other" ||
      value.reason === "error")
  );
};

const isProviderMetadata = (value: unknown): boolean =>
  isRecord(value) && Object.values(value).every(isRecord);

const hasValidPartMetadata = (value: Record<string, unknown>): boolean =>
  (value.status === undefined || isMessagePartStatus(value.status)) &&
  (value.providerMetadata === undefined ||
    isProviderMetadata(value.providerMetadata)) &&
  (value.parentId === undefined || typeof value.parentId === "string");

const isGenerativeUINode = (value: unknown, depth = 0): boolean => {
  if (depth > 100) return false;
  if (typeof value === "string") return true;
  if (!isRecord(value) || typeof value.component !== "string") return false;
  if (value.props !== undefined && !isRecord(value.props)) return false;
  if (value.key !== undefined && typeof value.key !== "string") return false;
  return (
    value.children === undefined ||
    (Array.isArray(value.children) &&
      value.children.every((child) => isGenerativeUINode(child, depth + 1)))
  );
};

const isGenerativeUISpec = (value: unknown): boolean =>
  isRecord(value) &&
  (Array.isArray(value.root)
    ? value.root.every((node) => isGenerativeUINode(node))
    : isGenerativeUINode(value.root));

const isToolCallTiming = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.startedAt === "number" &&
  (value.completedAt === undefined || typeof value.completedAt === "number");

const isToolModelContent = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.every(
    (part) =>
      isRecord(part) &&
      ((part.type === "text" && typeof part.text === "string") ||
        (part.type === "file" &&
          typeof part.data === "string" &&
          typeof part.mediaType === "string" &&
          (part.filename === undefined || typeof part.filename === "string"))),
  );

const isToolApprovalOption = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.kind === "string" &&
  (value.label === undefined || typeof value.label === "string") &&
  (value.description === undefined || typeof value.description === "string") &&
  (value.grants === undefined ||
    (Array.isArray(value.grants) &&
      value.grants.every((grant) => typeof grant === "string"))) &&
  (value.confirm === undefined ||
    typeof value.confirm === "boolean" ||
    (isRecord(value.confirm) &&
      (value.confirm.title === undefined ||
        typeof value.confirm.title === "string") &&
      (value.confirm.description === undefined ||
        typeof value.confirm.description === "string")));

const isToolApproval = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  (value.prompt === undefined || typeof value.prompt === "string") &&
  (value.display === undefined ||
    value.display === "decision" ||
    value.display === "select" ||
    value.display === "text") &&
  (value.allowFreeform === undefined ||
    typeof value.allowFreeform === "boolean") &&
  (value.approved === undefined || typeof value.approved === "boolean") &&
  (value.reason === undefined || typeof value.reason === "string") &&
  (value.isAutomatic === undefined || typeof value.isAutomatic === "boolean") &&
  (value.options === undefined ||
    (Array.isArray(value.options) &&
      value.options.every(isToolApprovalOption))) &&
  (value.optionId === undefined || typeof value.optionId === "string") &&
  (value.text === undefined || typeof value.text === "string") &&
  (value.resolution === undefined ||
    value.resolution === "cancelled" ||
    value.resolution === "expired");

const isMcpAppMetadata = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.resourceUri === "string" &&
  (value.mimeType === undefined || typeof value.mimeType === "string") &&
  (value.visibility === undefined ||
    (Array.isArray(value.visibility) &&
      value.visibility.every(
        (visibility) => visibility === "model" || visibility === "app",
      ))) &&
  (value.serverId === undefined || typeof value.serverId === "string");

const isToolCallMcpMetadata = (value: unknown): boolean =>
  isRecord(value) && (value.app === undefined || isMcpAppMetadata(value.app));

const hasValidToolCallMetadata = (value: Record<string, unknown>): boolean =>
  hasValidPartMetadata(value) &&
  (value.isError === undefined || typeof value.isError === "boolean") &&
  (value.timing === undefined || isToolCallTiming(value.timing)) &&
  (value.modelContent === undefined ||
    isToolModelContent(value.modelContent)) &&
  (value.interrupt === undefined ||
    (isRecord(value.interrupt) && value.interrupt.type === "human")) &&
  (value.approval === undefined || isToolApproval(value.approval)) &&
  (value.mcp === undefined || isToolCallMcpMetadata(value.mcp));

const isStoredMessagePart = (
  value: unknown,
  role: ThreadMessage["role"],
): value is StoredMessagePart => {
  if (!isRecord(value)) return false;

  switch (value.type) {
    case "text":
      return typeof value.text === "string" && hasValidPartMetadata(value);
    case "image":
      return (
        role !== "system" &&
        typeof value.image === "string" &&
        (value.filename === undefined || typeof value.filename === "string") &&
        (value.providerMetadata === undefined ||
          isProviderMetadata(value.providerMetadata))
      );
    case "file":
      return (
        role !== "system" &&
        typeof value.data === "string" &&
        typeof value.mimeType === "string" &&
        (value.filename === undefined || typeof value.filename === "string") &&
        (value.sourceType === undefined ||
          value.sourceType === "url" ||
          value.sourceType === "id") &&
        hasValidPartMetadata(value)
      );
    case "data":
      return role !== "system" && typeof value.name === "string";
    case "audio":
      return (
        role === "user" &&
        isRecord(value.audio) &&
        typeof value.audio.data === "string" &&
        (value.audio.format === "mp3" || value.audio.format === "wav")
      );
    case "reasoning":
      return (
        role === "assistant" &&
        typeof value.text === "string" &&
        (value.unstable_summary === undefined ||
          typeof value.unstable_summary === "string") &&
        hasValidPartMetadata(value)
      );
    case "source":
      return (
        role === "assistant" &&
        typeof value.id === "string" &&
        hasValidPartMetadata(value) &&
        ((value.sourceType === "url" &&
          typeof value.url === "string" &&
          (value.title === undefined || typeof value.title === "string")) ||
          (value.sourceType === "document" &&
            typeof value.title === "string" &&
            typeof value.mediaType === "string" &&
            (value.filename === undefined ||
              typeof value.filename === "string")))
      );
    case "generative-ui":
      return (
        role === "assistant" &&
        isGenerativeUISpec(value.spec) &&
        (value.id === undefined || typeof value.id === "string") &&
        (value.parentId === undefined || typeof value.parentId === "string")
      );
    case "tool-call":
      return (
        role === "assistant" &&
        typeof value.toolCallId === "string" &&
        typeof value.toolName === "string" &&
        isRecord(value.args) &&
        typeof value.argsText === "string" &&
        hasValidToolCallMetadata(value) &&
        (value.messages === undefined || Array.isArray(value.messages))
      );
    default:
      return false;
  }
};

const isStoredAttachment = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.type === "string" &&
  typeof value.name === "string" &&
  (value.contentType === undefined || typeof value.contentType === "string") &&
  isRecord(value.status) &&
  value.status.type === "complete" &&
  Array.isArray(value.content) &&
  value.content.every((part) => isStoredMessagePart(part, "user"));

const isThreadStep = (value: unknown): boolean =>
  isRecord(value) &&
  (value.messageId === undefined || typeof value.messageId === "string") &&
  (value.usage === undefined ||
    (isRecord(value.usage) &&
      typeof value.usage.inputTokens === "number" &&
      typeof value.usage.outputTokens === "number"));

const isMessageTiming = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.streamStartTime === "number" &&
  typeof value.totalChunks === "number" &&
  typeof value.toolCallCount === "number" &&
  (value.firstTokenTime === undefined ||
    typeof value.firstTokenTime === "number") &&
  (value.totalStreamTime === undefined ||
    typeof value.totalStreamTime === "number") &&
  (value.tokenCount === undefined || typeof value.tokenCount === "number") &&
  (value.tokensPerSecond === undefined ||
    typeof value.tokensPerSecond === "number");

type StoredMessagePart =
  | StoredSystemMessage["content"][number]
  | StoredUserMessage["content"][number]
  | StoredAssistantMessage["content"][number];

const parseStoredMessagePart = (
  value: unknown,
  role: ThreadMessage["role"],
  depth: number,
): StoredMessagePart | null => {
  if (!isStoredMessagePart(value, role)) return null;
  if (value.type !== "tool-call" || !Array.isArray(value.messages)) {
    return value as StoredMessagePart;
  }

  const messages = value.messages.map((message) =>
    parseStoredThreadMessage(message, depth + 1),
  );
  if (messages.some((message) => message === null)) return null;

  return { ...value, messages: messages as ThreadMessage[] };
};

function parseStoredThreadMessage(
  value: unknown,
  depth = 0,
): ThreadMessage | null {
  if (depth > 100 || !isRecord(value) || typeof value.id !== "string") {
    return null;
  }
  if (!isMessageRole(value.role)) return null;
  if (!Array.isArray(value.content)) return null;

  const createdAt = parseDate(value.createdAt);
  if (!createdAt) return null;

  const metadata = value.metadata;
  if (!isRecord(metadata) || !isRecord(metadata.custom)) return null;

  if (value.role === "assistant") {
    const content = value.content.map((part) =>
      parseStoredMessagePart(part, "assistant", depth),
    );
    if (content.some((part) => part === null)) return null;
    if (!isMessageStatus(value.status)) return null;
    if (
      metadata.unstable_state !== undefined &&
      !isJSONValue(metadata.unstable_state)
    ) {
      return null;
    }
    if (
      metadata.unstable_annotations !== undefined &&
      (!Array.isArray(metadata.unstable_annotations) ||
        !metadata.unstable_annotations.every((item) => isJSONValue(item)))
    ) {
      return null;
    }
    if (
      metadata.unstable_data !== undefined &&
      (!Array.isArray(metadata.unstable_data) ||
        !metadata.unstable_data.every((item) => isJSONValue(item)))
    ) {
      return null;
    }
    if (
      metadata.steps !== undefined &&
      (!Array.isArray(metadata.steps) || !metadata.steps.every(isThreadStep))
    ) {
      return null;
    }
    if (metadata.timing !== undefined && !isMessageTiming(metadata.timing)) {
      return null;
    }
    if (
      metadata.isOptimistic !== undefined &&
      typeof metadata.isOptimistic !== "boolean"
    ) {
      return null;
    }
    if (
      metadata.submittedFeedback !== undefined &&
      (!isRecord(metadata.submittedFeedback) ||
        (metadata.submittedFeedback.type !== "positive" &&
          metadata.submittedFeedback.type !== "negative"))
    ) {
      return null;
    }
    const submittedFeedback = metadata.submittedFeedback;
    const submittedFeedbackType = submittedFeedback?.type;

    return {
      id: value.id,
      role: "assistant",
      content: content as StoredAssistantMessage["content"],
      status: value.status as StoredAssistantMessage["status"],
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
        steps: (metadata.steps ??
          []) as StoredAssistantMessage["metadata"]["steps"],
        ...(submittedFeedbackType === "positive" ||
        submittedFeedbackType === "negative"
          ? {
              submittedFeedback: {
                type: submittedFeedbackType,
              },
            }
          : undefined),
        ...(isMessageTiming(metadata.timing)
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
    const content = value.content.map((part) =>
      parseStoredMessagePart(part, "user", depth),
    );
    if (content.some((part) => part === null)) return null;
    if (
      value.attachments !== undefined &&
      (!Array.isArray(value.attachments) ||
        !value.attachments.every(isStoredAttachment))
    ) {
      return null;
    }
    if (
      metadata.isOptimistic !== undefined &&
      typeof metadata.isOptimistic !== "boolean"
    ) {
      return null;
    }
    return {
      id: value.id,
      role: "user",
      content: content as StoredUserMessage["content"],
      attachments: (value.attachments ??
        []) as StoredUserMessage["attachments"],
      createdAt,
      metadata: {
        ...(metadata.isOptimistic !== undefined
          ? { isOptimistic: metadata.isOptimistic }
          : undefined),
        custom: metadata.custom,
      },
    };
  }

  if (value.content.length !== 1) return null;
  const content = parseStoredMessagePart(value.content[0], "system", depth);
  if (!content) return null;

  return {
    id: value.id,
    role: "system",
    content: [content as StoredSystemMessage["content"][0]],
    createdAt,
    metadata: {
      custom: metadata.custom,
    },
  };
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
