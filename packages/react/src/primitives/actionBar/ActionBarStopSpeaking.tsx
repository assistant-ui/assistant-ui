"use client";

import { forwardRef } from "react";
import { useActionBarStopSpeaking } from "../../primitive-hooks/actionBar/useActionBarStopSpeaking";
import { ActionButtonProps } from "../../utils/createActionButton";
import { useEscapeKeydown } from "@radix-ui/react-use-escape-keydown";
import { Primitive } from "@radix-ui/react-primitive";
import { composeEventHandlers } from "@radix-ui/primitive";

export namespace ActionBarPrimitiveStopSpeaking {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarStopSpeaking>;
}

export const ActionBarPrimitiveStopSpeaking = forwardRef<
  ActionBarPrimitiveStopSpeaking.Element,
  ActionBarPrimitiveStopSpeaking.Props
>((props, ref) => {
  const callback = useActionBarStopSpeaking();

  // TODO this stops working if the user is not hovering over an older message
  useEscapeKeydown((e) => {
    if (callback) {
      e.preventDefault();
      callback();
    }
  });

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
