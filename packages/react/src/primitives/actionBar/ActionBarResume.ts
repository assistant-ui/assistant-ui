"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useActionBarResume as useActionBarResumeBehavior } from "@assistant-ui/core/react";

const useActionBarResume = () => {
  const { disabled, resume } = useActionBarResumeBehavior();
  if (disabled) return null;
  return resume;
};

export namespace ActionBarPrimitiveResume {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarResume>;
}

/**
 * A button that answers again in place of an assistant message whose run
 * stopped before it finished (its tab closed or lost its connection). Like
 * Regenerate, it starts a new branch beside the interrupted reply, which
 * stays as it is. It renders disabled unless the message is the last one on
 * its branch and its run went `staleAfter` without a heartbeat.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Error>
 *   <ErrorPrimitive.Root>
 *     <ErrorPrimitive.Message />
 *     <ActionBarPrimitive.Resume>Resume</ActionBarPrimitive.Resume>
 *   </ErrorPrimitive.Root>
 * </MessagePrimitive.Error>
 * ```
 */
export const ActionBarPrimitiveResume = createActionButton(
  "ActionBarPrimitive.Resume",
  useActionBarResume,
);
