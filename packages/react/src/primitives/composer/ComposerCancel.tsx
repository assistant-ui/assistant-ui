"use client";

import { createActionButton } from "../../utils/createActionButton";
import { useComposerCancel } from "../../primitive-hooks/composer/useComposerCancel";

export const ComposerCancel = createActionButton(
  "ComposerCancel",
  useComposerCancel,
);
