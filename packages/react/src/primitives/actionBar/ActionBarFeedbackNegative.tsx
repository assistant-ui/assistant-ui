"use client";

import { forwardRef } from "react";
import { useActionBarFeedbackNegative } from "../../primitive-hooks/actionBar/useActionBarFeedbackNegative";
import { ActionButtonProps } from "../../utils/createActionButton";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useMessage } from "../../context";
import { Primitive } from "@radix-ui/react-primitive";

/**
 * @deprecated Use `ActionBarPrimitive.FeedbackNegative.Props` instead. This will be removed in 0.6.
 */
export type ActionBarPrimitiveFeedbackNegativeProps =
  ActionBarPrimitiveFeedbackNegative.Props;

export namespace ActionBarPrimitiveFeedbackNegative {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarFeedbackNegative>;
}

export const ActionBarPrimitiveFeedbackNegative = forwardRef<
  ActionBarPrimitiveFeedbackNegative.Element,
  ActionBarPrimitiveFeedbackNegative.Props
>(({ onClick, disabled, ...props }, forwardedRef) => {
  const isSubmitted = useMessage(
    (u) => u.submittedFeedback?.type === "negative",
  );
  const callback = useActionBarFeedbackNegative();
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

ActionBarPrimitiveFeedbackNegative.displayName =
  "ActionBarPrimitive.FeedbackNegative";
