"use client";

import { useActionBarEdit } from "../../primitive-hooks/actionBar/useActionBarEdit";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarEdit = createActionButton(
  "ActionBarEdit",
  useActionBarEdit,
);
