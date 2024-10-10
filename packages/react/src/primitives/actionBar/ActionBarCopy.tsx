"use client";

import { forwardRef } from "react";
import { useActionBarCopy } from "../../primitive-hooks/actionBar/useActionBarCopy";
import { ActionButtonProps } from "../../utils/createActionButton";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { useMessageUtils } from "../../context";

/**
 * @deprecated Use `ActionBarPrimitive.Copy.Props` instead. This will be removed in 0.6.
 */
export type ActionBarPrimitiveCopyProps = ActionBarPrimitiveCopy.Props;

export namespace ActionBarPrimitiveCopy {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarCopy>;
}

export const ActionBarPrimitiveCopy = forwardRef<
  ActionBarPrimitiveCopy.Element,
  ActionBarPrimitiveCopy.Props
>(({ copiedDuration, onClick, disabled, ...props }, forwardedRef) => {
  const isCopied = useMessageUtils((u) => u.isCopied);
  const callback = useActionBarCopy({ copiedDuration });
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
