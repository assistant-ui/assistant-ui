import {
  resource,
  tapInlineResource,
  tapMemo,
  tapState,
} from "@assistant-ui/tap";
import { tapApi } from "../utils/tap-store";
import { MessageRuntime } from "../api/MessageRuntime";
import { tapSubscribable } from "./util-hooks/tapSubscribable";
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
import {
  AttachmentClientActions,
  AttachmentClientState,
} from "./AttachmentClient";
import { StoreApi } from "../utils/tap-store/tap-store-api";
import { EventManagerActions } from "./EventManagerClient";
import { RefObject } from "react";

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
  readonly composer: StoreApi<ComposerClientState, ComposerClientActions>;

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
  ) => StoreApi<MessagePartClientState, MessagePartClientActions>;
  attachment(selector: {
    index: number;
  }): StoreApi<AttachmentClientState, AttachmentClientActions>;

  setIsCopied(value: boolean): void;
  setIsHovering(value: boolean): void;

  /** @internal */
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
  ({
    runtime,
    events,
    threadIdRef,
  }: {
    runtime: MessageRuntime;
    events: EventManagerActions;
    threadIdRef: RefObject<string>;
  }) => {
    const runtimeState = tapSubscribable(runtime);

    const [isCopiedState, setIsCopied] = tapState(false);
    const [isHoveringState, setIsHovering] = tapState(false);

    const messageIdRef = tapMemo(
      () => ({
        get current() {
          return runtime.getState().id;
        },
      }),
      [runtime],
    );

    const composer = tapInlineResource(
      ComposerClient({
        runtime: runtime.composer,
        events,
        threadIdRef,
        messageIdRef,
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
    }, [
      runtimeState,
      parts.state,
      composer.state,
      isCopiedState,
      isHoveringState,
    ]);

    const api = tapApi<MessageClientState, MessageClientActions>(state, {
      composer: composer.api,

      reload: (config) => runtime.reload(config),
      speak: () => runtime.speak(),
      stopSpeaking: () => runtime.stopSpeaking(),
      submitFeedback: (feedback) => runtime.submitFeedback(feedback),
      switchToBranch: (options) => runtime.switchToBranch(options),
      getCopyText: () => runtime.unstable_getCopyText(),

      part: (selector) => {
        if ("index" in selector) {
          return parts.api({ index: selector.index });
        } else {
          return parts.api({ key: "toolCallId-" + selector.toolCallId });
        }
      },

      attachment: ({ index }) => {
        const attachmentRuntime = runtime.getAttachmentByIndex(index);
        return {
          getState: attachmentRuntime.getState,

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
      api,
    };
  },
);
