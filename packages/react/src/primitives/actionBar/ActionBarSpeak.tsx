"use client";

import { useActionBarSpeak } from "../../primitive-hooks/actionBar/useActionBarSpeak";
import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export type ActionBarPrimitiveSpeakProps = ActionButtonProps<
  typeof useActionBarSpeak
>;

export const ActionBarPrimitiveSpeak = createActionButton(
  "ActionBarPrimitive.Speak",
  useActionBarSpeak,
);
