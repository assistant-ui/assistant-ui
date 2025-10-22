"use client";
import {
  resource,
  tapMemo,
  tapState,
  tapInlineResource,
} from "@assistant-ui/tap";
import { AttachmentClientApi } from "./types/Attachment";
import { MessageClientState, MessageClientApi } from "./types/Message";
import { MessagePartClientState, MessagePartClientApi } from "./types/Part";
import { tapLookupResources } from "./util-hooks/tapLookupResources";
import { tapApi } from "../utils/tap-store";
import {
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
  Attachment,
  ThreadMessage,
} from "../types";
import { NoOpComposerClient } from "./NoOpComposerClient";

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
        resumeToolCall: () => {
          throw new Error("Not supported");
        },
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
      },
      {
        key: attachment.id,
      },
    );
  },
);
export type ThreadMessageClientProps = {
  message: ThreadMessage;
  isLast?: boolean;
  branchNumber?: number;
  branchCount?: number;
};
export const ThreadMessageClient = resource(
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
        submittedFeedback: message.metadata.submittedFeedback,
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
    });
  },
);
