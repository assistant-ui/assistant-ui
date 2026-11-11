"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadResume as useThreadResumeBehavior } from "@assistant-ui/core/internal";

const useThreadResume = () => {
  const { disabled, resume } = useThreadResumeBehavior();
  if (disabled) return null;
  return resume;
};

export namespace ThreadPrimitiveResume {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadResume>;
}

/**
 * A button that answers the thread's last message, the user's, when its run
 * stopped before it stored a reply (the tab that ran it closed or lost its
 * connection). It runs from that message, so the answer is its first reply
 * and no branch is left beside it. It renders disabled unless
 * `useThreadReplyState()` reads `interrupted`.
 *
 * @example
 * ```tsx
 * const InterruptedBar = () =>
 *   useThreadReplyState() === "interrupted" ? (
 *     <div>
 *       This response was interrupted.
 *       <ThreadPrimitive.Resume>Resume</ThreadPrimitive.Resume>
 *     </div>
 *   ) : null;
 * ```
 */
export const ThreadPrimitiveResume = createActionButton(
  "ThreadPrimitive.Resume",
  useThreadResume,
);
