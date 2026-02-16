import type { ThreadMessage } from "@assistant-ui/core";
import type {
  ComposerRuntimeCore,
  ThreadComposerRuntimeCore,
} from "../runtime-cores/core/ComposerRuntimeCore";
import type { ThreadRuntimeCore } from "../runtime-cores/core/ThreadRuntimeCore";
import type { ThreadListRuntimeCore } from "../runtime-cores/core/ThreadListRuntimeCore";
import type { SubscribableWithState } from "./subscribable/Subscribable";
import type {
  SpeechState,
  SubmittedFeedback,
} from "../runtime-cores/core/ThreadRuntimeCore";
import type {
  ComposerRuntimePath,
  ThreadRuntimePath,
  ThreadListItemRuntimePath,
  MessageRuntimePath,
} from "./RuntimePathTypes";

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

export type ThreadRuntimeCoreBinding = SubscribableWithState<
  ThreadRuntimeCore,
  ThreadRuntimePath
>;

export type ThreadListRuntimeCoreBinding = SubscribableWithState<
  ThreadListRuntimeCore,
  ThreadListItemRuntimePath
>;

export type MessageStateBinding = SubscribableWithState<
  ThreadMessage & {
    readonly parentId: string | null;
    /** The position of this message in the thread (0 for first message) */
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

export type ThreadListItemStatus = "archived" | "regular" | "new" | "deleted";

export type ThreadListItemState = {
  readonly isMain: boolean;
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly status: ThreadListItemStatus;
  readonly title?: string | undefined;
};
