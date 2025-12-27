import type { SpeechSynthesisAdapter } from "../adapters/SpeechAdapterTypes";

/**
 * Capabilities that a thread runtime supports.
 * Used to enable/disable UI features based on runtime capabilities.
 */
export type RuntimeCapabilities = {
  readonly switchToBranch: boolean;
  readonly switchBranchDuringRun: boolean;
  readonly edit: boolean;
  readonly reload: boolean;
  readonly cancel: boolean;
  readonly unstable_copy: boolean;
  readonly speech: boolean;
  readonly attachments: boolean;
  readonly feedback: boolean;
};

/**
 * Status of a thread list item in the thread list.
 */
export type ThreadListItemStatus = "archived" | "regular" | "new" | "deleted";

/**
 * State of a thread list item.
 */
export type ThreadListItemState = {
  id: string;
  title: string;
  createdAt: Date;
  lastMessageAt: Date;
  status: "idle" | "active" | "archived";
};

/**
 * State of speech synthesis for a message.
 */
export type SpeechState = {
  readonly messageId: string;
  readonly status: SpeechSynthesisAdapter.Status;
};

/**
 * Feedback that has been submitted for a message.
 */
export type SubmittedFeedback = {
  readonly type: "negative" | "positive";
};
