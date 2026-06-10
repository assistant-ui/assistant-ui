import { useState, useMemo, useEffect, useEffectEvent } from "react";
import { resource, withKey } from "@assistant-ui/tap";
import {
  type ClientElement,
  type ClientOutput,
  useClientLookup,
  attachTransformScopes,
  useClientResource,
  Derived,
} from "@assistant-ui/store";

import type {
  AppendMessage,
  Attachment,
  CreateAttachment,
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  ThreadMessage,
  ExternalThreadQueueAdapter,
} from "@assistant-ui/core";
import type { QueueItemState } from "@assistant-ui/core/store";
import type { ComposerSendOptions } from "@assistant-ui/core/store";
import { getThreadMessageText } from "@assistant-ui/core/internal";
import { ModelContext, Suggestions } from "@assistant-ui/core/store";
import { Tools, DataRenderers } from "@assistant-ui/core/react";
import { SingleThreadList } from "./SingleThreadList";

const EMPTY_QUEUE_ITEMS: readonly QueueItemState[] = [];

export type ExternalThreadMessage = ThreadMessage & {
  id: string;
};

export type ExternalThreadProps = {
  messages: readonly ExternalThreadMessage[];
  isRunning?: boolean;
  /**
   * Whether sending new messages is currently disabled. When `true`, the
   * thread composer's input remains usable but `send()` is a no-op and
   * `composer.canSend` is `false`. Edit composers (saving message edits)
   * intentionally ignore this flag.
   */
  isSendDisabled?: boolean;
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
const useMessageClient = ({
  message,
  index,
  onEdit,
  onReload,
  queue,
}: MessageClientProps): ClientOutput<"message"> => {
  const [isCopied, setIsCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const partClients = useClientLookup(
    () =>
      message.content.map((part, idx) => withKey(idx, PartResource({ part }))),
    [message.content],
  );

  const attachmentClients = useClientLookup(
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

  const composerClient = useClientResource(
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

  const state = useMemo(() => {
    return {
      ...message,
      attachments: message.attachments ?? [],
      parentId: null,
      isLast: false, // Will be set by thread
      branchNumber: 1,
      branchCount: 1,
      speech: undefined,
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
    delete: () => {},
    reload: () => {
      onReload?.();
    },
    speak: () => {},
    stopSpeaking: () => {},
    submitFeedback: () => {},
    switchToBranch: () => {},
    getCopyText: () => getThreadMessageText(message),
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
};

const MessageClient = resource(useMessageClient);

type PartResourceProps = {
  part: ThreadAssistantMessagePart | ThreadUserMessagePart;
};

// Part Client - minimal implementation
const usePartResource = ({ part }: PartResourceProps): ClientOutput<"part"> => {
  const state = useMemo(
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
    respondToToolApproval: () => {},
  };
};

const PartResource = resource(usePartResource);

type AttachmentResourceProps = {
  attachment: Attachment;
  onRemove?: () => void;
};

// Attachment Client - minimal implementation
const useAttachmentResource = ({
  attachment,
  onRemove,
}: AttachmentResourceProps): ClientOutput<"attachment"> => {
  return {
    getState: () => attachment,
    remove: async () => {
      onRemove?.();
    },
  };
};

const AttachmentResource = resource(useAttachmentResource);

type ComposerClientResourceProps = {
  type: "thread" | "edit";
  isEditing: boolean;
  canCancel: boolean;
  isSendDisabled?: boolean;
  onCancel: () => void;
  onBeginEdit?: () => void;
  onSend?: (message: AppendMessage) => void;
  message?: ExternalThreadMessage;
  queue?: ExternalThreadQueueAdapter | undefined;
};

const useQueueItemClient = ({
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
};

const QueueItemClient = resource(useQueueItemClient);

// Composer Client - minimal implementation
const useComposerClientResource = ({
  type,
  isEditing,
  canCancel,
  isSendDisabled = false,
  onCancel,
  onBeginEdit,
  onSend,
  message,
  queue,
}: ComposerClientResourceProps): ClientOutput<"composer"> => {
  const [text, setText] = useState("");
  const [role, setRole] = useState<"user" | "assistant" | "system">("user");
  const [runConfig, setRunConfig] = useState<Record<string, unknown>>({});
  const [attachments, setAttachments] = useState<readonly Attachment[]>([]);
  const [quote, setQuote] = useState<
    { readonly text: string; readonly messageId: string } | undefined
  >(undefined);

  // Update composer values when editing begins
  const updateFromMessage = useEffectEvent(() => {
    if (message) {
      // Extract text from message content (text parts only)
      const textParts = message.content.filter((part) => part.type === "text");
      const messageText = textParts
        .map((part) => ("text" in part ? part.text : ""))
        .join("\n\n");

      setText(messageText);
      setRole(message.role);
      setAttachments(message.attachments ?? []);
    }
  });

  useEffect(() => {
    if (isEditing) {
      updateFromMessage();
    }
  }, [isEditing]);

  const attachmentClients = useClientLookup(
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
  const queueItemClients = useClientLookup(
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

  const state = useMemo(() => {
    const isEmpty = !text.trim() && !attachments.length;
    return {
      text,
      role,
      attachments: attachmentClients.state,
      runConfig,
      isEditing,
      canCancel,
      canSend: isEditing && !isEmpty && !isSendDisabled,
      attachmentAccept: "*",
      isEmpty,
      type,
      dictation: undefined,
      quote,
      queue: queueItems,
    };
  }, [
    text,
    role,
    attachmentClients.state,
    runConfig,
    isEditing,
    canCancel,
    isSendDisabled,
    type,
    attachments.length,
    quote,
    queueItems,
  ]);

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
      if (!state.canSend) return;

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
};

const ComposerClientResource = resource(useComposerClientResource);

// External Thread Client
const useExternalThread = ({
  messages,
  isRunning = false,
  isSendDisabled = false,
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

  const messageClients = useClientLookup(
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

  const composerClient = useClientResource(
    ComposerClientResource({
      type: "thread",
      isEditing: true,
      canCancel: isRunning,
      isSendDisabled,
      onCancel: handleCancelRun,
      onSend: handleSendNew,
      queue,
    }),
  );

  const hasQueue = !!queue;
  const state = useMemo(() => {
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
        delete: false,
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
    deleteMessage: () => {},
    startRun: () => {
      onStartRun?.();
    },
    resumeRun: () => {},
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
};

export const ExternalThread = resource(useExternalThread);

attachTransformScopes(useExternalThread, (scopes, parent) => {
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
