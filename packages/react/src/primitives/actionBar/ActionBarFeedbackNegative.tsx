"use client";

import { forwardRef } from "react";
import { useActionBarFeedbackNegative } from "../../primitive-hooks/actionBar/useActionBarFeedbackNegative";
import { ActionButtonProps } from "../../utils/createActionButton";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useMessageUtils } from "../../context";
import { Primitive } from "@radix-ui/react-primitive";

export type ActionBarPrimitiveFeedbackNegativeProps = ActionButtonProps<
  typeof useActionBarFeedbackNegative
>;

export const ActionBarPrimitiveFeedbackNegative = forwardRef<
  HTMLButtonElement,
  Partial<ActionBarPrimitiveFeedbackNegativeProps>
>(({ onClick, disabled, ...props }, forwardedRef) => {
  const isSubmitted = useMessageUtils(
    (u) => u.submittedFeedback === "negative",
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
