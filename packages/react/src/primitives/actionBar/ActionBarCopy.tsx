"use client";

import { useActionBarCopy } from "../../primitive-hooks/actionBar/useActionBarCopy";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarCopy = createActionButton(
  "ActionBarCopy",
  useActionBarCopy,
);
