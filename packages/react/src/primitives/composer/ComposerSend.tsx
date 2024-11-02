"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useComposerSend } from "../../primitive-hooks/composer/useComposerSend";

export namespace ComposerPrimitiveSend {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useComposerSend>;
}

export const ComposerPrimitiveSend = createActionButton(
  "ComposerPrimitive.Send",
  useComposerSend,
);
