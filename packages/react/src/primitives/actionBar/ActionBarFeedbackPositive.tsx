"use client";

import { forwardRef } from "react";
import { useActionBarFeedbackPositive } from "../../primitive-hooks/actionBar/useActionBarFeedbackPositive";
import { ActionButtonProps } from "../../utils/createActionButton";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useMessageUtils } from "../../context";
import { Primitive } from "@radix-ui/react-primitive";

/**
 * @deprecated Use `ActionBarPrimitive.FeedbackPositive.Props` instead. This will be removed in 0.6.
 */
export type ActionBarPrimitiveFeedbackPositiveProps =
  ActionBarPrimitiveFeedbackPositive.Props;

export namespace ActionBarPrimitiveFeedbackPositive {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarFeedbackPositive>;
}

export const ActionBarPrimitiveFeedbackPositive = forwardRef<
  ActionBarPrimitiveFeedbackPositive.Element,
  ActionBarPrimitiveFeedbackPositive.Props
>(({ onClick, disabled, ...props }, forwardedRef) => {
  const isSubmitted = useMessageUtils(
    (u) => u.submittedFeedback === "positive",
  );
  const callback = useActionBarFeedbackPositive();
  return (
    <Primitive.button
      type="button"
      {...(isSubmitted ? { "data-submitted": "true" } : {})}
      {...props}
      ref={forwardedRef}
      disabled={disabled || !callback}
      onClick={composeEventHandlers(onClick, () => {
        callback?.();
      })}
    />
  );
});

ActionBarPrimitiveFeedbackPositive.displayName =
  "ActionBarPrimitive.FeedbackPositive";
