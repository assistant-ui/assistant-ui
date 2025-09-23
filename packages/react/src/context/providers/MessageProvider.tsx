"use client";

import { useMemo, type FC, type PropsWithChildren } from "react";
import {
  AssistantProvider,
  AssistantApi,
  createAssistantApiField,
} from "../react/AssistantApiContext";
import {
  MessageClientApi,
  MessageClientState,
} from "../../client/types/Message";
import {
  resource,
  tapInlineResource,
  tapMemo,
  tapState,
} from "@assistant-ui/tap";
import { useResource } from "@assistant-ui/tap/react";
import { asStore, tapApi } from "../../utils/tap-store";
import {
  ThreadAssistantMessagePart,
  ThreadMessage,
  ThreadUserMessagePart,
} from "../../types/AssistantTypes";
import {
  ComposerClientApi,
  ComposerClientState,
} from "../../client/types/Composer";
import {
  MessagePartClientApi,
  MessagePartClientState,
} from "../../client/types/Part";
import { tapLookupResources } from "../../client/util-hooks/tapLookupResources";
import { Attachment } from "../../types";
import { AttachmentClientApi } from "../../client/types/Attachment";

const NoOpComposerClient = resource(({ type }: { type: "edit" | "thread" }) => {
  const state = tapMemo<ComposerClientState>(() => {
    return {
      isEditing: false,
      isEmpty: true,
      text: "",
      attachmentAccept: "*",
      attachments: [],
      role: "user",
      runConfig: {},
      canCancel: false,
      type: type,
    };
  }, [type]);

  return tapApi<ComposerClientApi>({
    getState: () => state,
    setText: () => {
      throw new Error("Not supported");
    },
    setRole: () => {
      throw new Error("Not supported");
    },
    setRunConfig: () => {
      throw new Error("Not supported");
    },
    addAttachment: () => {
      throw new Error("Not supported");
    },
    clearAttachments: () => {
      throw new Error("Not supported");
    },
    attachment: () => {
      throw new Error("Not supported");
    },
    reset: () => {
      throw new Error("Not supported");
    },
    send: () => {
      throw new Error("Not supported");
    },
    cancel: () => {
      throw new Error("Not supported");
    },
    beginEdit: () => {
      throw new Error("Not supported");
    },
    __internal_getRuntime: () => null,
  });
});

const ThreadMessagePartClient = resource(
  ({ part }: { part: ThreadAssistantMessagePart | ThreadUserMessagePart }) => {
    const state = tapMemo<MessagePartClientState>(() => {
      return {
        ...part,
        status: { type: "complete" },
      };
    }, [part]);

    return tapApi<MessagePartClientApi>(
      {
        getState: () => state,
        addToolResult: () => {
          throw new Error("Not supported");
        },
        __internal_getRuntime: () => null,
      },
      {
        key:
          state.type === "tool-call"
            ? "toolCallId-" + state.toolCallId
            : undefined,
      },
    );
  },
);

const ThreadMessageAttachmentClient = resource(
  ({ attachment }: { attachment: Attachment }) => {
    return tapApi<AttachmentClientApi>(
      {
        getState: () => attachment,
        remove: () => {
          throw new Error("Not supported");
        },
        __internal_getRuntime: () => null,
      },
      {
        key: attachment.id,
      },
    );
  },
);

type ThreadMessageClientProps = {
  message: ThreadMessage;
  isLast?: boolean;
  branchNumber?: number;
  branchCount?: number;
};

const ThreadMessageClient = resource(
  ({
    message,
    isLast = true,
    branchNumber = 1,
    branchCount = 1,
  }: ThreadMessageClientProps) => {
    const [isCopiedState, setIsCopied] = tapState(false);
    const [isHoveringState, setIsHovering] = tapState(false);

    const parts = tapLookupResources(
      message.content.map((_, idx) =>
        ThreadMessagePartClient({ part: message.content[idx]! }, { key: idx }),
      ),
    );

    const attachments = tapLookupResources(
      message.attachments?.map((_, idx) =>
        ThreadMessageAttachmentClient(
          { attachment: message.attachments![idx]! },
          { key: idx },
        ),
      ) ?? [],
    );

    const composerState = tapInlineResource(
      NoOpComposerClient({ type: "edit" }),
    );

    const state = tapMemo<MessageClientState>(() => {
      return {
        ...message,
        parts: parts.state,
        composer: composerState.state,
        parentId: null,
        isLast,
        branchNumber,
        branchCount,
        speech: undefined,
        submittedFeedback: undefined,
        isCopied: isCopiedState,
        isHovering: isHoveringState,
      };
    }, [message, isCopiedState, isHoveringState, isLast]);

    return tapApi<MessageClientApi>({
      getState: () => state,
      composer: composerState.api,
      part: (selector) => {
        if ("index" in selector) {
          return parts.api({ index: selector.index });
        } else {
          return parts.api({ key: "toolCallId-" + selector.toolCallId });
        }
      },
      attachment: (selector) => {
        if ("id" in selector) {
          return attachments.api({ key: selector.id });
        } else {
          return attachments.api(selector);
        }
      },
      reload: () => {
        throw new Error("Not supported in ThreadMessageProvider");
      },
      speak: () => {
        throw new Error("Not supported in ThreadMessageProvider");
      },
      stopSpeaking: () => {
        throw new Error("Not supported in ThreadMessageProvider");
      },
      submitFeedback: () => {
        throw new Error("Not supported in ThreadMessageProvider");
      },
      switchToBranch: () => {
        throw new Error("Not supported in ThreadMessageProvider");
      },
      getCopyText: () => {
        return message.content
          .map((part) => {
            if ("text" in part && typeof part.text === "string") {
              return part.text;
            }
            return "";
          })
          .join("\n");
      },
      setIsCopied,
      setIsHovering,
      __internal_getRuntime: () => null,
    });
  },
);

export const MessageProvider: FC<
  PropsWithChildren<ThreadMessageClientProps>
> = ({ children, ...props }) => {
  const store = useResource(asStore(ThreadMessageClient(props)));
  const api = useMemo(() => {
    return {
      message: createAssistantApiField({
        source: "root",
        query: {},
        get: () => store.getState().api,
      }),
      subscribe: store.subscribe,
      flushSync: store.flushSync,
    } satisfies Partial<AssistantApi>;
  }, [store]);

  return <AssistantProvider api={api}>{children}</AssistantProvider>;
};
