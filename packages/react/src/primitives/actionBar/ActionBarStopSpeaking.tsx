"use client";

import { forwardRef } from "react";
import type { ActionButtonProps } from "../../utils/createActionButton";
import { Primitive } from "../../utils/Primitive";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useActionBarStopSpeaking as useActionBarStopSpeakingBehavior } from "@assistant-ui/core/react";

const useActionBarStopSpeaking = () => {
  const { disabled, stopSpeaking } = useActionBarStopSpeakingBehavior();
  if (disabled) return null;
  return stopSpeaking;
};

export namespace ActionBarPrimitiveStopSpeaking {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarStopSpeaking>;
}

export const ActionBarPrimitiveStopSpeaking = forwardRef<
  ActionBarPrimitiveStopSpeaking.Element,
  ActionBarPrimitiveStopSpeaking.Props
>((props, ref) => {
  const callback = useActionBarStopSpeaking();

  return (
    <Primitive.button
      type="button"
      disabled={!callback}
      {...props}
      ref={ref}
      onClick={composeEventHandlers(props.onClick, () => {
        callback?.();
      })}
    />
  );
});

ActionBarPrimitiveStopSpeaking.displayName = "ActionBarPrimitive.StopSpeaking";
