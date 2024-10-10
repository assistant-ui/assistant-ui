"use client";

import { useActionBarSpeak } from "../../primitive-hooks/actionBar/useActionBarSpeak";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

/**
 * @deprecated Use `ActionBarPrimitive.Speak.Props` instead. This will be removed in 0.6.
 */
export type ActionBarPrimitiveSpeakProps = ActionBarPrimitiveSpeak.Props;

export namespace ActionBarPrimitiveSpeak {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarSpeak>;
}

export const ActionBarPrimitiveSpeak = createActionButton(
  "ActionBarPrimitive.Speak",
  useActionBarSpeak,
);
