import type { ThreadMessage } from "../../types";
import type { SubscribableWithState } from "../../subscribable/subscribable";
import type {
  ComposerRuntimeCore,
  ThreadComposerRuntimeCore,
} from "../core/composer-runtime-core";
import type {
  SpeechState,
  SubmittedFeedback,
} from "../core/thread-runtime-core";
import type { ComposerRuntimePath, MessageRuntimePath } from "./paths";

export type ComposerRuntimeCoreBinding = SubscribableWithState<
  ComposerRuntimeCore | undefined,
  ComposerRuntimePath
>;

export type ThreadComposerRuntimeCoreBinding = SubscribableWithState<
  ThreadComposerRuntimeCore | undefined,
  ComposerRuntimePath & { composerSource: "thread" }
>;

export type EditComposerRuntimeCoreBinding = SubscribableWithState<
  ComposerRuntimeCore | undefined,
  ComposerRuntimePath & { composerSource: "edit" }
>;

export type MessageStateBinding = SubscribableWithState<
  ThreadMessage & {
    readonly parentId: string | null;
    readonly index: number;
    readonly isLast: boolean;
    readonly branchNumber: number;
    readonly branchCount: number;
    readonly speech: SpeechState | undefined;
    /** @deprecated Use `message.metadata.submittedFeedback` instead. This will be removed in 0.12.0. */
    readonly submittedFeedback: SubmittedFeedback | undefined;
  },
  MessageRuntimePath
>;

export type ThreadListItemState = {
  readonly isMain: boolean;
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly status: import("../core/thread-list-runtime-core").ThreadListItemStatus;
  readonly title?: string | undefined;
};
