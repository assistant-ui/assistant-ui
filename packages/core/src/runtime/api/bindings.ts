import type { ThreadMessage } from "../../types/message";
import type { SubscribableWithState } from "../../subscribable/subscribable";
import type {
  ComposerRuntimeCore,
  EditComposerRuntimeCore,
  ThreadComposerRuntimeCore,
} from "../interfaces/composer-runtime-core";
import type { SpeechState } from "../interfaces/thread-runtime-core";
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
  EditComposerRuntimeCore | undefined,
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
  },
  MessageRuntimePath
>;

export type ThreadListItemState = {
  readonly isMain: boolean;
  readonly id: string;
  readonly remoteId: string | undefined;
  readonly externalId: string | undefined;
  readonly status: import("../interfaces/thread-list-runtime-core").ThreadListItemStatus;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;
};
