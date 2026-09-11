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
  MessagePartStreamStatus,
  MessageStatus,
  MessageTiming,
  ThreadAssistantMessagePart,
  ThreadStep,
  ThreadUserMessagePart,
} from "../../index";
import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "../../internal";
import { isJSONObject, isJSONValue, isRecord } from "../../utils/json/is-json";
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

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const hasOptionalString = (
  value: Record<string, unknown>,
  key: string,
): boolean => value[key] === undefined || typeof value[key] === "string";

const hasOptionalBoolean = (
  value: Record<string, unknown>,
  key: string,
): boolean => value[key] === undefined || typeof value[key] === "boolean";

const isPartProviderMetadata = (value: unknown): boolean =>
  value === undefined ||
  (isRecord(value) && Object.values(value).every(isJSONObject));

const hasCommonPartFields = (value: Record<string, unknown>): boolean =>
  hasOptionalString(value, "parentId") &&
  isPartProviderMetadata(value.providerMetadata);

const isMessagePartStreamStatus = (
  value: unknown,
): value is MessagePartStreamStatus => {
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

const hasOptionalPartStatus = (value: Record<string, unknown>): boolean =>
  value.status === undefined || isMessagePartStreamStatus(value.status);

const isTextMessagePart = (
  value: unknown,
): value is Extract<ThreadUserMessagePart, { type: "text" }> =>
  isRecord(value) &&
  value.type === "text" &&
  typeof value.text === "string" &&
  hasOptionalPartStatus(value) &&
  hasCommonPartFields(value);

const isImageMessagePart = (
  value: unknown,
): value is Extract<ThreadUserMessagePart, { type: "image" }> =>
  isRecord(value) &&
  value.type === "image" &&
  typeof value.image === "string" &&
  hasOptionalString(value, "filename") &&
  isPartProviderMetadata(value.providerMetadata);

const isFileMessagePart = (
  value: unknown,
): value is Extract<ThreadUserMessagePart, { type: "file" }> =>
  isRecord(value) &&
  value.type === "file" &&
  typeof value.data === "string" &&
  typeof value.mimeType === "string" &&
  hasOptionalString(value, "filename") &&
  (value.sourceType === undefined ||
    value.sourceType === "url" ||
    value.sourceType === "id") &&
  hasCommonPartFields(value);

const isDataMessagePart = (
  value: unknown,
): value is Extract<ThreadUserMessagePart, { type: "data" }> =>
  isRecord(value) &&
  value.type === "data" &&
  typeof value.name === "string" &&
  "data" in value;

const isAudioMessagePart = (
  value: unknown,
): value is Extract<ThreadUserMessagePart, { type: "audio" }> =>
  isRecord(value) &&
  value.type === "audio" &&
  isRecord(value.audio) &&
  typeof value.audio.data === "string" &&
  (value.audio.format === "mp3" || value.audio.format === "wav");

const isSourceMessagePart = (
  value: unknown,
): value is Extract<ThreadAssistantMessagePart, { type: "source" }> => {
  if (
    !isRecord(value) ||
    value.type !== "source" ||
    typeof value.id !== "string" ||
    !hasCommonPartFields(value)
  ) {
    return false;
  }
  if (value.sourceType === "url") {
    return typeof value.url === "string" && hasOptionalString(value, "title");
  }
  return (
    value.sourceType === "document" &&
    typeof value.title === "string" &&
    typeof value.mediaType === "string" &&
    hasOptionalString(value, "filename")
  );
};

const isGenerativeUINode = (value: unknown, depth = 0): boolean => {
  if (depth > 100) return false;
  if (typeof value === "string") return true;
  if (!isRecord(value) || typeof value.component !== "string") return false;
  if (value.props !== undefined && !isRecord(value.props)) return false;
  if (!hasOptionalString(value, "key")) return false;
  return (
    value.children === undefined ||
    (Array.isArray(value.children) &&
      value.children.every((child) => isGenerativeUINode(child, depth + 1)))
  );
};

const isGenerativeUIMessagePart = (
  value: unknown,
): value is Extract<ThreadAssistantMessagePart, { type: "generative-ui" }> => {
  if (
    !isRecord(value) ||
    value.type !== "generative-ui" ||
    !isRecord(value.spec) ||
    !hasOptionalString(value, "id") ||
    !hasOptionalString(value, "parentId")
  ) {
    return false;
  }
  const root = value.spec.root;
  return Array.isArray(root)
    ? root.every((node) => isGenerativeUINode(node))
    : isGenerativeUINode(root);
};

const isToolCallTiming = (value: unknown): boolean =>
  isRecord(value) &&
  isFiniteNumber(value.startedAt) &&
  (value.completedAt === undefined || isFiniteNumber(value.completedAt));

const isApprovalOption = (value: unknown): boolean => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.kind !== "string" ||
    !hasOptionalString(value, "label") ||
    !hasOptionalString(value, "description")
  ) {
    return false;
  }
  if (value.confirm !== undefined && typeof value.confirm !== "boolean") {
    if (!isRecord(value.confirm)) return false;
    if (
      !hasOptionalString(value.confirm, "title") ||
      !hasOptionalString(value.confirm, "description")
    ) {
      return false;
    }
  }
  return (
    value.grants === undefined ||
    (Array.isArray(value.grants) &&
      value.grants.every((grant) => typeof grant === "string"))
  );
};

const isToolApproval = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "string" &&
  hasOptionalString(value, "prompt") &&
  (value.display === undefined ||
    value.display === "decision" ||
    value.display === "select" ||
    value.display === "text") &&
  hasOptionalBoolean(value, "allowFreeform") &&
  hasOptionalBoolean(value, "approved") &&
  hasOptionalString(value, "reason") &&
  hasOptionalBoolean(value, "isAutomatic") &&
  hasOptionalString(value, "optionId") &&
  hasOptionalString(value, "text") &&
  (value.resolution === undefined ||
    value.resolution === "cancelled" ||
    value.resolution === "expired") &&
  (value.options === undefined ||
    (Array.isArray(value.options) && value.options.every(isApprovalOption)));

const isMcpMetadata = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (value.app === undefined) return true;
  return (
    isRecord(value.app) &&
    typeof value.app.resourceUri === "string" &&
    hasOptionalString(value.app, "mimeType") &&
    hasOptionalString(value.app, "serverId") &&
    (value.app.visibility === undefined ||
      (Array.isArray(value.app.visibility) &&
        value.app.visibility.every(
          (entry) => entry === "model" || entry === "app",
        )))
  );
};

const isToolCallMessagePart = (
  value: unknown,
  depth: number,
): value is Extract<ThreadAssistantMessagePart, { type: "tool-call" }> =>
  isRecord(value) &&
  value.type === "tool-call" &&
  typeof value.toolCallId === "string" &&
  typeof value.toolName === "string" &&
  isJSONObject(value.args) &&
  typeof value.argsText === "string" &&
  hasOptionalBoolean(value, "isError") &&
  (value.timing === undefined || isToolCallTiming(value.timing)) &&
  (value.modelContent === undefined || Array.isArray(value.modelContent)) &&
  (value.interrupt === undefined ||
    (isRecord(value.interrupt) && value.interrupt.type === "human")) &&
  (value.approval === undefined || isToolApproval(value.approval)) &&
  (value.mcp === undefined || isMcpMetadata(value.mcp)) &&
  hasCommonPartFields(value) &&
  (value.messages === undefined ||
    (depth < 100 &&
      Array.isArray(value.messages) &&
      value.messages.every((message) =>
        isStoredThreadMessageShape(message, depth + 1),
      )));

const isUserMessagePart = (value: unknown): value is ThreadUserMessagePart =>
  isTextMessagePart(value) ||
  isImageMessagePart(value) ||
  isFileMessagePart(value) ||
  isDataMessagePart(value) ||
  isAudioMessagePart(value);

const isAssistantMessagePart = (
  value: unknown,
  depth = 0,
): value is ThreadAssistantMessagePart => {
  if (
    isTextMessagePart(value) ||
    isImageMessagePart(value) ||
    isFileMessagePart(value) ||
    isDataMessagePart(value)
  ) {
    return true;
  }
  if (!isRecord(value)) return false;
  if (value.type === "reasoning") {
    return (
      typeof value.text === "string" &&
      hasOptionalString(value, "unstable_summary") &&
      hasOptionalPartStatus(value) &&
      hasCommonPartFields(value)
    );
  }
  return (
    isSourceMessagePart(value) ||
    isGenerativeUIMessagePart(value) ||
    isToolCallMessagePart(value, depth)
  );
};

const isMessageStatus = (value: unknown): value is MessageStatus => {
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

const isThreadStep = (value: unknown): value is ThreadStep =>
  isRecord(value) &&
  hasOptionalString(value, "messageId") &&
  (value.usage === undefined ||
    (isRecord(value.usage) &&
      isFiniteNumber(value.usage.inputTokens) &&
      isFiniteNumber(value.usage.outputTokens)));

const isMessageTiming = (value: unknown): value is MessageTiming =>
  isRecord(value) &&
  isFiniteNumber(value.streamStartTime) &&
  (value.firstTokenTime === undefined ||
    isFiniteNumber(value.firstTokenTime)) &&
  (value.totalStreamTime === undefined ||
    isFiniteNumber(value.totalStreamTime)) &&
  (value.tokenCount === undefined || isFiniteNumber(value.tokenCount)) &&
  (value.tokensPerSecond === undefined ||
    isFiniteNumber(value.tokensPerSecond)) &&
  isFiniteNumber(value.totalChunks) &&
  isFiniteNumber(value.toolCallCount);

const isAssistantMetadata = (value: Record<string, unknown>): boolean =>
  (value.unstable_state === undefined || isJSONValue(value.unstable_state)) &&
  (value.unstable_annotations === undefined ||
    (Array.isArray(value.unstable_annotations) &&
      value.unstable_annotations.every(isJSONValue))) &&
  (value.unstable_data === undefined ||
    (Array.isArray(value.unstable_data) &&
      value.unstable_data.every(isJSONValue))) &&
  (value.steps === undefined ||
    (Array.isArray(value.steps) && value.steps.every(isThreadStep))) &&
  (value.submittedFeedback === undefined ||
    (isRecord(value.submittedFeedback) &&
      (value.submittedFeedback.type === "positive" ||
        value.submittedFeedback.type === "negative"))) &&
  (value.timing === undefined || isMessageTiming(value.timing)) &&
  hasOptionalBoolean(value, "isOptimistic");

const isCompleteAttachment = (value: unknown): value is CompleteAttachment =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.type === "string" &&
  typeof value.name === "string" &&
  hasOptionalString(value, "contentType") &&
  isRecord(value.status) &&
  value.status.type === "complete" &&
  Array.isArray(value.content) &&
  value.content.every(isUserMessagePart);

function isStoredThreadMessageShape(value: unknown, depth = 0): boolean {
  if (
    depth > 100 ||
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isMessageRole(value.role) ||
    parseDate(value.createdAt) === null ||
    !isRecord(value.metadata) ||
    !isRecord(value.metadata.custom) ||
    !Array.isArray(value.content)
  ) {
    return false;
  }
  if (value.role === "assistant") {
    return (
      value.content.every((part) => isAssistantMessagePart(part, depth)) &&
      isMessageStatus(value.status) &&
      isAssistantMetadata(value.metadata)
    );
  }
  if (value.role === "user") {
    return (
      value.content.every(isUserMessagePart) &&
      (value.attachments === undefined ||
        (Array.isArray(value.attachments) &&
          value.attachments.every(isCompleteAttachment)))
    );
  }
  return value.content.length === 1 && isTextMessagePart(value.content[0]);
}

const parseStoredThreadMessage = (value: unknown): ThreadMessage | null => {
  if (!isStoredThreadMessageShape(value) || !isRecord(value)) return null;

  const createdAt = parseDate(value.createdAt);
  if (!createdAt) return null;

  const metadata = value.metadata;
  if (!isRecord(metadata) || !isRecord(metadata.custom)) return null;

  if (value.role === "assistant") {
    const status = value.status;
    if (!isMessageStatus(status)) return null;

    const submittedFeedback = isRecord(metadata.submittedFeedback)
      ? metadata.submittedFeedback
      : undefined;
    const submittedFeedbackType = submittedFeedback?.type;

    return {
      id: value.id,
      role: "assistant",
      content: value.content as StoredAssistantMessage["content"],
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
    const attachments = value.attachments ?? [];
    if (
      !Array.isArray(attachments) ||
      !attachments.every(isCompleteAttachment)
    ) {
      return null;
    }
    return {
      id: value.id,
      role: "user",
      content: value.content as StoredUserMessage["content"],
      attachments,
      createdAt,
      metadata: {
        custom: metadata.custom,
      },
    };
  }

  if (value.content.length !== 1) return null;

  return {
    id: value.id,
    role: "system",
    content: [value.content[0] as StoredSystemMessage["content"][0]],
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
