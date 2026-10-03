"use client";

import { useCallback } from "react";
import { useComposerResume as useComposerResumeBehavior } from "@assistant-ui/core/react";
import {
  createActionButton,
  type ActionButtonElement,
  type ActionButtonProps,
} from "../../utils/createActionButton";

const useComposerResume = () => {
  const { disabled, resume } = useComposerResumeBehavior();
  const callback = useCallback(() => {
    void resume().catch((error: unknown) => {
      console.error("[assistant-ui] Failed to resume the run:", error);
    });
  }, [resume]);
  return disabled ? null : callback;
};

export namespace ComposerPrimitiveResume {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerResume>;
}

/**
 * Resumes an interrupted run when its adapter explicitly reports a checkpoint.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Resume>
 *   Resume
 * </ComposerPrimitive.Resume>
 * ```
 */
export const ComposerPrimitiveResume = createActionButton(
  "ComposerPrimitive.Resume",
  useComposerResume,
);
