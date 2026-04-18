import {
  resource,
  tapState,
  tapMemo,
  tapEffect,
  tapEffectEvent,
} from "@assistant-ui/tap";
import {
  type ClientElement,
  type ClientOutput,
  tapClientLookup,
  attachTransformScopes,
  tapClientResource,
  Derived,
} from "@assistant-ui/store";
import { withKey } from "@assistant-ui/tap";
import type {
  AppendMessage,
  Attachment,
  CreateAttachment,
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  ThreadMessage,
} from "@assistant-ui/core";
import type { QueueItemState } from "@assistant-ui/core/store";
import type { ComposerSendOptions } from "@assistant-ui/core/store";
import { ModelContext, Suggestions } from "@assistant-ui/core/store";
import { Tools, DataRenderers } from "@assistant-ui/core/react";
import { SingleThreadList } from "./SingleThreadList";

const EMPTY_QUEUE_ITEMS: readonly QueueItemState[] = [];

export type ExternalThreadMessage = ThreadMessage & {
  id: string;
};

export type ExternalThreadQueueAdapter = {
  /** The current queue items. */
  items: readonly QueueItemState[];
  /** Called when a message is submitted via the composer. Receives the steer preference. */
  enqueue: (message: AppendMessage, opts: { steer: boolean }) => void;
  /** Called to promote an existing queue item (cancel current run, run this immediately). */
  steer: (queueItemId: string) => void;
  /** Called to remove an item from the queue. */
  remove: (queueItemId: string) => void;
  /** Called to clear all pending queue items, with the reason for clearing. */
  clear: (reason: "edit" | "reload" | "cancel-run") => void;
};

export type ExternalThreadProps = {
  messages: readonly ExternalThreadMessage[];
  isRunning?: boolean;
  /**
   * Callback for new messages (non-queue runtimes).
   * @note Unused when `queue` is provided — new messages are routed through `queue.enqueue` instead.
   */
  onNew?: (message: AppendMessage) => void;
  onEdit?: (message: AppendMessage) => void;
  onReload?: (parentId: string | null) => void;
  onStartRun?: () => void;
  onCancel?: () => void;
  /** Queue adapter for runtimes that support message queuing and steering. */
  queue?: ExternalThreadQueueAdapter;
};

type MessageClientProps = {
  message: ExternalThreadMessage;
  index: number;
  onEdit?: (message: AppendMessage) => void;
  onReload?: () => void;
  queue?: ExternalThreadQueueAdapter | undefined;
};

// Message Client - minimal implementation
const MessageClient = resource(
  ({
    message,
    index,
    onEdit,
    onReload,
    queue,
  }: MessageClientProps): ClientOutput<"message"> => {
    const [isCopied, setIsCopied] = tapState(false);
    const [isHovering, setIsHovering] = tapState(false);
    const [isEditing, setIsEditing] = tapState(false);

    const partClients = tapClientLookup(
      () =>
        message.content.map((part, idx) =>
          withKey(idx, PartResource({ part })),
        ),
      [message.content],
    );

    const attachmentClients = tapClientLookup(
      () =>
        (message.attachments ?? []).map((attachment) =>
          withKey(
            attachment.id,
            AttachmentResource({
              attachment,
              onRemove: () => {},
            }),
          ),
        ),
      [message.attachments],
    );

    const handleBeginEdit = () => {
      setIsEditing(true);
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
    };

    const handleSendEdit = (msg: AppendMessage) => {
      queue?.clear("edit");
      onEdit?.({
        ...msg,
        parentId: message.id,
        sourceId: message.id,
      });
      setIsEditing(false);
    };

    const composerClient = tapClientResource(
      ComposerClientResource({
        type: "edit",
        isEditing,
        canCancel: true,
        onCancel: handleCancelEdit,
        onBeginEdit: handleBeginEdit,
        onSend: handleSendEdit,
        message,
        queue,
      }),
    );

    const state = tapMemo(() => {
      return {
        ...message,
        attachments: message.attachments ?? [],
        parentId: null,
        isLast: false, // Will be set by thread
        branchNumber: 1,
        branchCount: 1,
        speech: undefined,
        submittedFeedback: undefined,
        parts: partClients.state,
        isCopied,
        isHovering,
        index,
        composer: composerClient.state,
      };
    }, [
      message,
      isCopied,
      isHovering,
      index,
      composerClient.state,
      partClients.state,
    ]);

    return {
      getState: () => state,
      composer: () => composerClient.methods,
      reload: () => {
        onReload?.();
      },
      speak: () => {},
      stopSpeaking: () => {},
      submitFeedback: () => {},
      switchToBranch: () => {},
      getCopyText: () =>
        message.content.map((c) => ("text" in c ? c.text : "")).join(""),
      part: (selector) => {
        if ("index" in selector) {
          return partClients.get(selector);
        }
        const partIndex = state.parts.findIndex(
          (p) => p.type === "tool-call" && p.toolCallId === selector.toolCallId,
        );
        return partClients.get({ index: partIndex });
      },
      attachment: (selector) => {
        if ("id" in selector) {
          return attachmentClients.get({ key: selector.id });
        }
        return attachmentClients.get(selector);
      },
      setIsCopied,
      setIsHovering,
    };
  },
);

type PartResourceProps = {
  part: ThreadAssistantMessagePart | ThreadUserMessagePart;
};

// Part Client - minimal implementation
const PartResource = resource(
  ({ part }: PartResourceProps): ClientOutput<"part"> => {
    const state = tapMemo(
      () => ({
        ...part,
        status: { type: "complete" as const },
      }),
      [part],
    );

    return {
      getState: () => state,
      addToolResult: () => {},
      resumeToolCall: () => {},
    };
  },
);

type AttachmentResourceProps = {
  attachment: Attachment;
  onRemove?: () => void;
};

// Attachment Client - minimal implementation
const AttachmentResource = resource(
  ({
    attachment,
    onRemove,
  }: AttachmentResourceProps): ClientOutput<"attachment"> => {
    return {
      getState: () => attachment,
      remove: async () => {
        onRemove?.();
      },
    };
  },
);

type ComposerClientResourceProps = {
  type: "thread" | "edit";
  isEditing: boolean;
  canCancel: boolean;
  onCancel: () => void;
  onBeginEdit?: () => void;
  onSend?: (message: AppendMessage) => void;
  message?: ExternalThreadMessage;
  queue?: ExternalThreadQueueAdapter | undefined;
};

const QueueItemClient = resource(
  ({
    item,
    onSteer,
    onRemove,
  }: {
    item: QueueItemState;
    onSteer: () => void;
    onRemove: () => void;
  }): ClientOutput<"queueItem"> => {
    return {
      getState: () => item,
      steer: onSteer,
      remove: onRemove,
    };
  },
);

// Composer Client - minimal implementation
const ComposerClientResource = resource(
  ({
    type,
    isEditing,
    canCancel,
    onCancel,
    onBeginEdit,
    onSend,
    message,
    queue,
  }: ComposerClientResourceProps): ClientOutput<"composer"> => {
    const [text, setText] = tapState("");
    const [role, setRole] = tapState<"user" | "assistant" | "system">("user");
    const [runConfig, setRunConfig] = tapState<Record<string, unknown>>({});
    const [attachments, setAttachments] = tapState<readonly Attachment[]>([]);
    const [quote, setQuote] = tapState<
      { readonly text: string; readonly messageId: string } | undefined
    >(undefined);

    // Update composer values when editing begins
    const updateFromMessage = tapEffectEvent(() => {
      if (message) {
        // Extract text from message content (text parts only)
        const textParts = message.content.filter(
          (part) => part.type === "text",
        );
        const messageText = textParts
          .map((part) => ("text" in part ? part.text : ""))
          .join("\n\n");

        setText(messageText);
        setRole(message.role);
        setAttachments(message.attachments ?? []);
      }
    });

    tapEffect(() => {
      if (isEditing) {
        updateFromMessage();
      }
    }, [isEditing]);

    const attachmentClients = tapClientLookup(
      () =>
        attachments.map((attachment, idx) =>
          withKey(
            attachment.id,
            AttachmentResource({
              attachment,
              onRemove: () => {
                setAttachments(attachments.filter((_, i) => i !== idx));
              },
            }),
          ),
        ),
      [attachments],
    );

    const queueItems = queue?.items ?? EMPTY_QUEUE_ITEMS;
    const queueItemClients = tapClientLookup(
      () =>
        queueItems.map((item) =>
          withKey(
            item.id,
            QueueItemClient({
              item,
              onSteer: () => queue?.steer(item.id),
              onRemove: () => queue?.remove(item.id),
            }),
          ),
        ),
      [queueItems],
    );

    const state = tapMemo(
      () => ({
        text,
        role,
        attachments: attachmentClients.state,
        runConfig,
        isEditing,
        canCancel,
        attachmentAccept: "*",
        isEmpty: !text.trim() && !attachments.length,
        type,
        dictation: undefined,
        quote,
        queue: queueItems,
      }),
      [
        text,
        role,
        attachmentClients.state,
        runConfig,
        isEditing,
        canCancel,
        type,
        attachments.length,
        quote,
        queueItems,
      ],
    );

    return {
      getState: () => state,
      setText,
      setRole,
      setRunConfig,
      addAttachment: async (fileOrAttachment: File | CreateAttachment) => {
        if (fileOrAttachment instanceof File) {
          const newAttachment: Attachment = {
            id: Math.random().toString(36).substring(7),
            type: "file",
            name: fileOrAttachment.name,
            contentType: fileOrAttachment.type,
            file: fileOrAttachment,
            status: { type: "complete" },
            content: [],
          };
          setAttachments([...attachments, newAttachment]);
        } else {
          const newAttachment: Attachment = {
            id: fileOrAttachment.id ?? Math.random().toString(36).substring(7),
            type: fileOrAttachment.type ?? "document",
            name: fileOrAttachment.name,
            contentType: fileOrAttachment.contentType,
            content: fileOrAttachment.content,
            status: { type: "complete" },
          };
          setAttachments([...attachments, newAttachment]);
        }
      },
      clearAttachments: async () => {
        setAttachments([]);
      },
      attachment: (selector) => {
        if ("id" in selector) {
          return attachmentClients.get({ key: selector.id });
        }
        return attachmentClients.get(selector);
      },
      reset: async () => {
        setText("");
        setRole("user");
        setRunConfig({});
        setAttachments([]);
        setQuote(undefined);
      },
      send: (opts?: ComposerSendOptions) => {
        const currentQuote = quote;
        const composedMessage: AppendMessage = {
          role,
          content: text ? [{ type: "text" as const, text }] : [],
          attachments: attachments as any,
          createdAt: new Date(),
          parentId: null,
          sourceId: null,
          runConfig,
          startRun: opts?.startRun,
          metadata: {
            custom: { ...(currentQuote ? { quote: currentQuote } : {}) },
          },
        };
        if (queue) {
          queue.enqueue(composedMessage, { steer: opts?.steer ?? false });
        } else {
          onSend?.(composedMessage);
        }
        setText("");
        setAttachments([]);
        setQuote(undefined);
      },
      cancel: onCancel,
      beginEdit: () => {
        onBeginEdit?.();
      },
      startDictation: () => {},
      stopDictation: () => {},
      setQuote,
      queueItem: (selector: { index: number }) => {
        return queueItemClients.get(selector);
      },
    };
  },
);

// External Thread Client
export const ExternalThread = resource(
  ({
    messages,
    isRunning = false,
    onNew,
    onEdit,
    onReload,
    onStartRun,
    onCancel,
    queue,
  }: ExternalThreadProps): ClientOutput<"thread"> => {
    const handleReload = (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const parentId = messageIndex > 0 ? messages[messageIndex - 1]!.id : null;
      queue?.clear("reload");
      onReload?.(parentId);
    };

    const messageClients = tapClientLookup(
      () =>
        messages.map((msg, index) => {
          const props: MessageClientProps = {
            message: msg,
            index,
            onReload: () => handleReload(msg.id),
            queue,
          };
          if (onEdit) props.onEdit = onEdit;
          return withKey(msg.id, MessageClient(props));
        }),
      [messages, onEdit, queue],
    );

    const handleCancelRun = () => {
      queue?.clear("cancel-run");
      onCancel?.();
    };

    const handleSendNew = (message: AppendMessage) => {
      onNew?.(message);
    };

    const composerClient = tapClientResource(
      ComposerClientResource({
        type: "thread",
        isEditing: true,
        canCancel: isRunning,
        onCancel: handleCancelRun,
        onSend: handleSendNew,
        queue,
      }),
    );

    const hasQueue = !!queue;
    const state = tapMemo(() => {
      const messageStates = messageClients.state.map((s, idx, arr) => ({
        ...s,
        isLast: idx === arr.length - 1,
      }));

      return {
        isEmpty: messages.length === 0,
        isDisabled: false,
        isLoading: false,
        isRunning,
        capabilities: {
          edit: false,
          reload: false,
          cancel: isRunning,
          speech: false,
          attachments: false,
          feedback: false,
          voice: false,
          switchToBranch: false,
          switchBranchDuringRun: false,
          unstable_copy: false,
          dictation: false,
          queue: hasQueue,
        },
        messages: messageStates,
        state: {},
        suggestions: [],
        extras: undefined,
        speech: undefined,
        voice: undefined,
        composer: composerClient.state,
      };
    }, [
      messages,
      isRunning,
      hasQueue,
      messageClients.state,
      composerClient.state,
    ]);

    return {
      getState: () => state,
      composer: () => composerClient.methods,
      append: (message) => {
        const appendMessage: AppendMessage =
          typeof message === "string"
            ? {
                createdAt: new Date(),
                parentId: messages.at(-1)?.id ?? null,
                sourceId: null,
                runConfig: {},
                role: "user",
                content: [{ type: "text", text: message }],
                attachments: [],
                metadata: { custom: {} },
              }
            : {
                createdAt: message.createdAt ?? new Date(),
                parentId: message.parentId ?? messages.at(-1)?.id ?? null,
                sourceId: message.sourceId ?? null,
                role: message.role ?? "user",
                content: message.content,
                attachments: message.attachments ?? [],
                metadata: message.metadata ?? { custom: {} },
                runConfig: message.runConfig ?? {},
                startRun: message.startRun,
              };
        if (queue) {
          queue.enqueue(appendMessage, { steer: false });
        } else {
          onNew?.(appendMessage);
        }
      },
      startRun: () => {
        onStartRun?.();
      },
      resumeRun: () => {},
      unstable_resumeRun: () => {},
      cancelRun: handleCancelRun,
      getModelContext: () => ({ tools: {}, config: {} }),
      export: () => ({ messages: [] }),
      import: () => {},
      reset: () => {},
      message: (selector) => {
        if ("id" in selector) {
          return messageClients.get({ key: selector.id });
        }
        return messageClients.get(selector);
      },
      stopSpeaking: () => {},
      connectVoice: () => {},
      disconnectVoice: () => {},
      getVoiceVolume: () => 0,
      subscribeVoiceVolume: () => () => {},
      muteVoice: () => {},
      unmuteVoice: () => {},
    };
  },
);

attachTransformScopes(ExternalThread, (scopes, parent) => {
  if (!scopes.threads && parent.threads.source === null) {
    const threadElement = scopes.thread as ClientElement<"thread">;
    scopes.threads = SingleThreadList({ thread: threadElement });
    scopes.thread = Derived({
      source: "threads",
      query: { type: "main" },
      get: (aui) => aui.threads().thread("main"),
    });
  }

  if (!scopes.threadListItem && parent.threadListItem.source === null) {
    scopes.threadListItem = Derived({
      source: "threads",
      query: { type: "main" },
      get: (aui) => aui.threads().item("main"),
    });
  }

  scopes.composer ??= Derived({
    source: "thread",
    query: {},
    get: (aui) => aui.thread().composer(),
  });

  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
  if (!scopes.tools && parent.tools.source === null) {
    scopes.tools = Tools({});
  }
  if (!scopes.dataRenderers && parent.dataRenderers.source === null) {
    scopes.dataRenderers = DataRenderers();
  }
  if (!scopes.suggestions && parent.suggestions.source === null) {
    scopes.suggestions = Suggestions();
  }
});
