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
 * @deprecated Use `ThreadPrimitive.Resume`. A run that stops before it
 * stores a reply now leaves the thread ending with the user's message, which
 * the thread resumes without a branch; a reply that stored content before
 * its run stopped is an ordinary error, answered again with Regenerate. This
 * button stays enabled only for an empty stale reply a client before v0.3.35
 * stored, and answers it on a new branch as before.
 */
export const ActionBarPrimitiveResume = createActionButton(
  "ActionBarPrimitive.Resume",
  useActionBarResume,
);
