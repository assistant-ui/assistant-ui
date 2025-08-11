import {
  resource,
  tapInlineResource,
  tapMemo,
  tapResource,
  tapResources,
  tapState,
} from "@assistant-ui/tap";
import { tapActions } from "../utils/tap-store";
import { MessageRuntime } from "../api/MessageRuntime";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import { tapRefValue } from "./util-hooks/tapRefValue";
import {
  AttachmentClientActions,
  ComposerClient,
  ComposerClientActions,
  ComposerClientState,
} from "./ComposerClient";
import {
  MessagePartClient,
  MessagePartClientActions,
  MessagePartClientState,
} from "./MessagePartClient";
import { ThreadMessage } from "../types";
import {
  SpeechState,
  SubmittedFeedback,
} from "../runtimes/core/ThreadRuntimeCore";
import { RunConfig } from "../types/AssistantTypes";

export type MessageClientState = ThreadMessage & {
  readonly parentId: string | null;
  readonly isLast: boolean;

  readonly branchNumber: number;
  readonly branchCount: number;

  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  readonly speech: SpeechState | undefined;
  readonly submittedFeedback: SubmittedFeedback | undefined;

  readonly composer: ComposerClientState;
  readonly parts: readonly MessagePartClientState[];

  readonly isCopied: boolean;
  readonly isHovering: boolean;
};

export type MessageClientActions = {
  readonly composer: ComposerClientActions;

  readonly reload: (config?: { runConfig?: RunConfig }) => void;
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  readonly speak: () => void;
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  readonly stopSpeaking: () => void;
  readonly submitFeedback: (feedback: {
    type: "positive" | "negative";
  }) => void;
  readonly switchToBranch: (options: {
    position?: "previous" | "next";
    branchId?: string;
  }) => void;
  readonly getCopyText: () => string;

  readonly part: (idx: number) => MessagePartClientActions;
  readonly toolCall: (toolCallId: string) => MessagePartClientActions;
  readonly attachment: (idx: number) => AttachmentClientActions;

  readonly setIsCopied: (value: boolean) => void;
  readonly setIsHovering: (value: boolean) => void;
};

const MessagePartByIndex = resource(
  ({ runtime, index }: { runtime: MessageRuntime; index: number }) => {
    const partRuntime = tapMemo(
      () => runtime.getMessagePartByIndex(index),
      [runtime, index],
    );
    return tapInlineResource(MessagePartClient({ runtime: partRuntime }));
  },
);

export const MessageClient = resource(
  ({ runtime }: { runtime: MessageRuntime }) => {
    const runtimeState = tapSubscribable(runtime);
    const runtimeRef = tapRefValue(runtime);

    const [isCopiedState, setIsCopied] = tapState(false);
    const [isHoveringState, setIsHovering] = tapState(false);

    const composer = tapResource(
      ComposerClient({
        runtime: runtime.composer,
      }),
    );

    const parts = tapResources(
      runtimeState.content.map((_, idx) =>
        MessagePartByIndex({ runtime, index: idx }, { key: idx }),
      ),
    );

    const state = tapMemo<MessageClientState>(() => {
      return {
        ...(runtimeState as MessageClientState),

        parts: parts.map((p) => p.state),
        composer: composer.state,

        isCopied: isCopiedState,
        isHovering: isHoveringState,
      };
    }, [runtimeState, composer.state, isCopiedState, isHoveringState]);

    const actions = tapActions<MessageClientActions>({
      composer: composer.actions,

      reload: (config) => runtimeRef.current.reload(config),
      speak: () => runtimeRef.current.speak(),
      stopSpeaking: () => runtimeRef.current.stopSpeaking(),
      submitFeedback: (feedback) => runtimeRef.current.submitFeedback(feedback),
      switchToBranch: (options) => runtimeRef.current.switchToBranch(options),
      getCopyText: () => runtimeRef.current.unstable_getCopyText(),

      part: (idx: number) => {
        const partRuntime = runtimeRef.current.getMessagePartByIndex(idx);
        return {
          addToolResult: partRuntime.addToolResult,
        };
      },

      toolCall: (toolCallId: string) => {
        const partRuntime =
          runtimeRef.current.getMessagePartByToolCallId(toolCallId);
        return {
          addToolResult: partRuntime.addToolResult,
        };
      },

      attachment: (idx: number) => {
        const attachmentRuntime = runtimeRef.current.getAttachmentByIndex(idx);
        return {
          remove: attachmentRuntime.remove,
        };
      },

      setIsCopied,
      setIsHovering,
    });

    return {
      state,
      actions,
    };
  },
);
