"use client";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarEdit = createActionButton(
  (message, __, [, setIsEditing]) => {
    setIsEditing(message.content);
  },
  (_, __, [isEditing]) => isEditing === false,
);
