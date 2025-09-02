"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAssistantState, useAssistantApi } from "../../context";

/**
 * Hook that provides edit functionality for action bar buttons.
 *
 * This hook returns a callback function that starts editing the current message,
 * or null if editing is not available (e.g., already in editing mode).
 *
 * @returns An edit callback function, or null if editing is disabled
 *
 * @example
 * ```tsx
 * function CustomEditButton() {
 *   const edit = useActionBarEdit();
 *
 *   return (
 *     <button onClick={edit} disabled={!edit}>
 *       {edit ? "Edit Message" : "Cannot Edit"}
 *     </button>
 *   );
 * }
 * ```
 */
const useActionBarEdit = () => {
  const api = useAssistantApi();
  const disabled = useAssistantState(({ composer }) => composer.isEditing);

  const callback = useCallback(() => {
    api.composer().beginEdit();
  }, [api]);

  if (disabled) return null;
  return callback;
};

export namespace ActionBarPrimitiveEdit {
  export type Element = ActionButtonElement;
  /**
   * Props for the ActionBarPrimitive.Edit component.
   * Inherits all button element props and action button functionality.
   */
  export type Props = ActionButtonProps<typeof useActionBarEdit>;
}

/**
 * A button component that starts editing the current message.
 *
 * This component automatically handles starting the edit mode for the current message
 * and is disabled when editing is not available (e.g., already in editing mode).
 *
 * @example
 * ```tsx
 * <ActionBarPrimitive.Edit>
 *   Edit Message
 * </ActionBarPrimitive.Edit>
 * ```
 */
export const ActionBarPrimitiveEdit = createActionButton(
  "ActionBarPrimitive.Edit",
  useActionBarEdit,
);
