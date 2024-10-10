"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useComposerSend } from "../../primitive-hooks";

/**
 * @deprecated Use `ComposerPrimitive.Send.Props` instead. This will be removed in 0.6.
 */
export type ComposerPrimitiveSendProps = ComposerPrimitiveSend.Props;

export namespace ComposerPrimitiveSend {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerSend>;
}

export const ComposerPrimitiveSend = createActionButton(
  "ComposerPrimitive.Send",
  useComposerSend
);
