"use client";

import { forwardRef, useCallback } from "react";
import { ActionButtonProps } from "../../utils/createActionButton";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useAuiState, useAui } from "@assistant-ui/store";
import { Primitive } from "@radix-ui/react-primitive";

const useActionBarFeedbackPositive = () => {
  const aui = useAui();

  const callback = useCallback(() => {
    aui.message().submitFeedback({ type: "positive" });
  }, [aui]);

  return callback;
};

export namespace ActionBarPrimitiveFeedbackPositive {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarFeedbackPositive>;
}

export const ActionBarPrimitiveFeedbackPositive = forwardRef<
  ActionBarPrimitiveFeedbackPositive.Element,
  ActionBarPrimitiveFeedbackPositive.Props
>(({ onClick, disabled, ...props }, forwardedRef) => {
  const isSubmitted = useAuiState(
    (s) => s.message.metadata.submittedFeedback?.type === "positive",
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
