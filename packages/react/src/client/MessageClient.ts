import {
  resource,
  tapInlineResource,
  tapMemo,
  tapResource,
  tapState,
} from "@assistant-ui/tap";
import { tapActions } from "../utils/tap-store";
import { MessageRuntime } from "../api/MessageRuntime";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
import { tapRefValue } from "./util-hooks/tapRefValue";
import {
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
import { tapLookupResources } from "./util-hooks/tapLookupResources";
import { AttachmentClientActions } from "./AttachmentClient";

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

  reload(config?: { runConfig?: RunConfig }): void;
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  speak(): void;
  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  stopSpeaking(): void;
  submitFeedback(feedback: { type: "positive" | "negative" }): void;
  switchToBranch(options: {
    position?: "previous" | "next";
    branchId?: string;
  }): void;
  getCopyText(): string;

  part: (
    selector: { index: number } | { toolCallId: string },
  ) => MessagePartClientActions;
  attachment(selector: { index: number }): AttachmentClientActions;

  setIsCopied(value: boolean): void;
  setIsHovering(value: boolean): void;

  __internal_getRuntime(): MessageRuntime;
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

    const parts = tapLookupResources(
      runtimeState.content.map((_, idx) =>
        MessagePartByIndex({ runtime, index: idx }, { key: idx }),
      ),
    );

    const state = tapMemo<MessageClientState>(() => {
      return {
        ...(runtimeState as MessageClientState),

        parts: parts.state,
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

      part: (selector) => {
        if ("index" in selector) {
          return parts.actions({ index: selector.index });
        } else {
          return parts.actions({ key: "toolCallId-" + selector.toolCallId });
        }
      },

      attachment: ({ index }) => {
        const attachmentRuntime =
          runtimeRef.current.getAttachmentByIndex(index);
        return {
          remove: attachmentRuntime.remove,

          __internal_getRuntime: () => attachmentRuntime,
        };
      },

      setIsCopied,
      setIsHovering,

      __internal_getRuntime: () => runtime,
    });

    return {
      key: runtimeState.id,
      state,
      actions,
    };
  },
);
