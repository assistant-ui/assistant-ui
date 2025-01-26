"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useComposer, useComposerRuntime } from "../../context";

const useComposerCancel = () => {
  const composerRuntime = useComposerRuntime();
  const disabled = useComposer((c) => !c.canCancel);

  const callback = useCallback(() => {
    composerRuntime.cancel();
  }, [composerRuntime]);

  if (disabled) return null;
  return callback;
};

export namespace ComposerPrimitiveCancel {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerCancel>;
}

export const ComposerPrimitiveCancel = createActionButton(
  "ComposerPrimitive.Cancel",
  useComposerCancel,
);
