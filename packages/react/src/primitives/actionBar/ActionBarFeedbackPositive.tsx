"use client";

import { forwardRef } from "react";
import { useActionBarFeedbackPositive } from "../../primitive-hooks/actionBar/useActionBarFeedbackPositive";
import { ActionButtonProps } from "../../utils/createActionButton";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useMessageUtils } from "../../context";
import { Primitive } from "@radix-ui/react-primitive";

export type ActionBarPrimitiveFeedbackPositiveProps = ActionButtonProps<
  typeof useActionBarFeedbackPositive
>;

export const ActionBarPrimitiveFeedbackPositive = forwardRef<
  HTMLButtonElement,
  Partial<ActionBarPrimitiveFeedbackPositiveProps>
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
