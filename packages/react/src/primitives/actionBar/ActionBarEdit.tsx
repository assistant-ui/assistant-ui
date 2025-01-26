"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useEditComposer, useMessageRuntime } from "../../context";

const useActionBarEdit = () => {
  const messageRuntime = useMessageRuntime();
  const disabled = useEditComposer((c) => c.isEditing);

  const callback = useCallback(() => {
    messageRuntime.composer.beginEdit();
  }, [messageRuntime]);

  if (disabled) return null;
  return callback;
};

export namespace ActionBarPrimitiveEdit {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarEdit>;
}

export const ActionBarPrimitiveEdit = createActionButton(
  "ActionBarPrimitive.Edit",
  useActionBarEdit,
);
