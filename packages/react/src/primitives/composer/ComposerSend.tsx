"use client";

import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useComposerSend } from "../../primitive-hooks";

export type ComposerPrimitiveSendProps = ActionButtonProps<
  typeof useComposerSend
>;

export const ComposerPrimitiveSend = createActionButton(
  "ComposerPrimitive.Send",
  useComposerSend,
);
