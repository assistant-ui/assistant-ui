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
 * stopped before it wrote anything (its tab closed or lost its connection).
 * It deletes the empty reply and its stored row, then runs again from the
 * reply's parent, so no branch is left beside it; a runtime that cannot
 * delete messages starts a new branch instead. It renders disabled unless the
 * message is the last one on its branch and its run went `staleAfter`
 * without a heartbeat. A reply that wrote content before its run stopped is a
 * regular error, answered again with Regenerate.
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
