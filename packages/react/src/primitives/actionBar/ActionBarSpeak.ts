"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useActionBarSpeak as useActionBarSpeakBehavior } from "@assistant-ui/core/react";

const useActionBarSpeak = () => {
  const { disabled, speak } = useActionBarSpeakBehavior();
  if (disabled) return null;
  return speak;
};

export namespace ActionBarPrimitiveSpeak {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarSpeak>;
}

export const ActionBarPrimitiveSpeak = createActionButton(
  "ActionBarPrimitive.Speak",
  useActionBarSpeak,
);
