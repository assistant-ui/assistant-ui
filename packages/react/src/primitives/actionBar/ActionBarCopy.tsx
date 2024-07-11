"use client";

import { useActionBarCopy } from "../../primitive-hooks/actionBar/useActionBarCopy";
import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

export type ActionBarPrimitiveCopyProps = ActionButtonProps<
  typeof useActionBarCopy
>;

export const ActionBarPrimitiveCopy = createActionButton(
  "ActionBarPrimitive.Copy",
  useActionBarCopy,
  ["copiedDuration"],
);
