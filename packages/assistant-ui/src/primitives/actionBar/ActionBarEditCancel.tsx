"use client";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarEditCancel = createActionButton(
  (_, __, [, setIsEditing]) => {
    setIsEditing(false);
  },
  (_, __, [isEditing]) => isEditing !== false,
);
