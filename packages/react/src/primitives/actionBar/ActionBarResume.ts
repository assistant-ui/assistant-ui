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
 * A button that continues an assistant message whose run stopped before it
 * finished (its tab closed or lost its connection). The continuation is a new
 * assistant message after the interrupted one, so the work already done stays
 * in the thread. It renders disabled unless the message is the last one on
 * its branch and the cloud reported its run stale.
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
