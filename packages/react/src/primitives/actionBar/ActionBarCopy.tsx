"use client";

import { forwardRef } from "react";
import { ActionButtonProps } from "../../utils/createActionButton";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { useCallback } from "react";
import { useAssistantState, useAssistantApi } from "../../context";

/**
 * Hook that provides copy functionality for action bar buttons.
 *
 * This hook returns a callback function that copies message content to the clipboard,
 * or null if copying is not available. It handles both regular message content and
 * composer text when in editing mode.
 *
 * @param options Configuration options
 * @param options.copiedDuration Duration in milliseconds to show the copied state
 * @returns A copy callback function, or null if copying is disabled
 *
 * @example
 * ```tsx
 * function CustomCopyButton() {
 *   const copy = useActionBarPrimitiveCopy({ copiedDuration: 2000 });
 *
 *   return (
 *     <button onClick={copy} disabled={!copy}>
 *       {copy ? "Copy" : "Cannot Copy"}
 *     </button>
 *   );
 * }
 * ```
 */
const useActionBarPrimitiveCopy = ({
  copiedDuration = 3000,
}: { copiedDuration?: number | undefined } = {}) => {
  const api = useAssistantApi();
  const hasCopyableContent = useAssistantState(({ message }) => {
    return (
      (message.role !== "assistant" || message.status?.type !== "running") &&
      message.parts.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  const isEditing = useAssistantState(({ composer }) => composer.isEditing);
  const composerValue = useAssistantState(({ composer }) => composer.text);

  const callback = useCallback(() => {
    const valueToCopy = isEditing ? composerValue : api.message().getCopyText();

    if (!valueToCopy) return;

    navigator.clipboard.writeText(valueToCopy).then(() => {
      api.message().setIsCopied(true);
      setTimeout(() => api.message().setIsCopied(false), copiedDuration);
    });
  }, [api, isEditing, composerValue, copiedDuration]);

  if (!hasCopyableContent) return null;
  return callback;
};

export namespace ActionBarPrimitiveCopy {
  export type Element = HTMLButtonElement;
  /**
   * Props for the ActionBarPrimitive.Copy component.
   * Inherits all button element props and action button functionality.
   */
  export type Props = ActionButtonProps<typeof useActionBarPrimitiveCopy>;
}

/**
 * A button component that copies message content to the clipboard.
 *
 * This component automatically handles copying message text to the clipboard
 * and provides visual feedback through the data-copied attribute. It's disabled
 * when there's no copyable content available.
 *
 * @example
 * ```tsx
 * <ActionBarPrimitive.Copy copiedDuration={2000}>
 *   Copy Message
 * </ActionBarPrimitive.Copy>
 * ```
 */
export const ActionBarPrimitiveCopy = forwardRef<
  ActionBarPrimitiveCopy.Element,
  ActionBarPrimitiveCopy.Props
>(({ copiedDuration, onClick, disabled, ...props }, forwardedRef) => {
  const isCopied = useAssistantState(({ message }) => message.isCopied);
  const callback = useActionBarPrimitiveCopy({ copiedDuration });
  return (
    <Primitive.button
      type="button"
      {...(isCopied ? { "data-copied": "true" } : {})}
      {...props}
      ref={forwardedRef}
      disabled={disabled || !callback}
      onClick={composeEventHandlers(onClick, () => {
        callback?.();
      })}
    />
  );
});

ActionBarPrimitiveCopy.displayName = "ActionBarPrimitive.Copy";
