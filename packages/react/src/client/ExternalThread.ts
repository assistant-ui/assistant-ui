import {
  resource,
  tapState,
  tapMemo,
  tapEffect,
  tapEffectEvent,
} from "@assistant-ui/tap";
import {
  type ClientOutput,
  tapClientLookup,
  attachDefaultPeers,
  tapClientResource,
  Derived,
} from "@assistant-ui/store";
import { withKey } from "@assistant-ui/tap";
import type { Attachment } from "../types/AttachmentTypes";
import { ModelContext } from "./ModelContextClient";
import { Tools } from "./Tools";
import { Suggestions } from "./Suggestions";
import {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
} from "../types/MessagePartTypes";
import type { ThreadMessage } from "../types";

export type ExternalThreadMessage = ThreadMessage & {
  id: string;
};

export type ExternalThreadProps = {
  messages: readonly ExternalThreadMessage[];
  isRunning?: boolean;
  onNew?: (message: any) => void;
  onEdit?: (message: any) => void;
  onReload?: (parentId: string | null) => void;
  onStartRun?: () => void;
  onCancel?: () => void;
};

type MessageClientProps = {
  message: ExternalThreadMessage;
  index: number;
  onEdit?: (message: any) => void;
  onReload?: () => void;
};

// Message Client - minimal implementation
const MessageClient = resource(
  ({
    message,
    index,
    onEdit,
    onReload,
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

    const handleSendEdit = (msg: any) => {
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
      state,
      methods: {
        getState: () => state,
        composer: composerClient.methods,
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
            (p) =>
              p.type === "tool-call" && p.toolCallId === selector.toolCallId,
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
      },
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
      state,
      methods: {
        getState: () => state,
        addToolResult: () => {},
        resumeToolCall: () => {},
      },
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
      state: attachment,
      methods: {
        getState: () => attachment,
        remove: async () => {
          onRemove?.();
        },
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
  onSend?: (message: any) => void;
  message?: ExternalThreadMessage;
};

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
  }: ComposerClientResourceProps): ClientOutput<"composer"> => {
    const [text, setText] = tapState("");
    const [role, setRole] = tapState<"user" | "assistant" | "system">("user");
    const [runConfig, setRunConfig] = tapState<Record<string, unknown>>({});
    const [attachments, setAttachments] = tapState<readonly Attachment[]>([]);

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
      ],
    );

    return {
      state,
      methods: {
        getState: () => state,
        setText,
        setRole,
        setRunConfig,
        addAttachment: async (file: File) => {
          const newAttachment: Attachment = {
            id: Math.random().toString(36).substring(7),
            type: "file",
            name: file.name,
            contentType: file.type,
            file,
            status: { type: "complete" },
            content: [],
          };
          setAttachments([...attachments, newAttachment]);
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
        },
        send: () => {
          const message = {
            role,
            content: text ? [{ type: "text" as const, text }] : [],
            attachments: attachments as any,
            createdAt: new Date(),
            runConfig,
          };
          onSend?.(message);
          setText("");
          setAttachments([]);
        },
        cancel: onCancel,
        beginEdit: () => {
          onBeginEdit?.();
        },
        startDictation: () => {},
        stopDictation: () => {},
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
  }: ExternalThreadProps): ClientOutput<"thread"> => {
    const handleReload = (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const parentId = messageIndex > 0 ? messages[messageIndex - 1]!.id : null;
      onReload?.(parentId);
    };

    const messageClients = tapClientLookup(
      () =>
        messages.map((msg, index) => {
          const props: MessageClientProps = {
            message: msg,
            index,
            onReload: () => handleReload(msg.id),
          };
          if (onEdit) props.onEdit = onEdit;
          return withKey(msg.id, MessageClient(props));
        }),
      [messages, onEdit],
    );

    const handleCancelRun = () => {
      onCancel?.();
    };

    const handleSendNew = (message: any) => {
      onNew?.(message);
    };

    const composerClient = tapClientResource(
      ComposerClientResource({
        type: "thread",
        isEditing: true,
        canCancel: isRunning,
        onCancel: handleCancelRun,
        onSend: handleSendNew,
      }),
    );

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
          switchToBranch: false,
          switchBranchDuringRun: false,
          unstable_copy: false,
          dictation: false,
        },
        messages: messageStates,
        state: {},
        suggestions: [],
        extras: undefined,
        speech: undefined,
        composer: composerClient.state,
      };
    }, [messages, isRunning, messageClients.state, composerClient.state]);

    return {
      state,
      methods: {
        getState: () => state,
        composer: composerClient.methods,
        append: (message) => {
          onNew?.(message);
        },
        startRun: () => {
          onStartRun?.();
        },
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
        startVoice: async () => {},
        stopVoice: async () => {},
      },
    };
  },
);

attachDefaultPeers(ExternalThread, {
  modelContext: ModelContext(),
  tools: Tools({}),
  suggestions: Suggestions(),
  composer: Derived({
    source: "thread",
    query: {},
    get: (aui) => aui.thread().composer,
  }),
});
