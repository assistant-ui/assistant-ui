"use client";

import { useActionBarReload } from "../../primitive-hooks/actionBar/useActionBarReload";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarReload = createActionButton(
  "ActionBarReload",
  useActionBarReload,
);
