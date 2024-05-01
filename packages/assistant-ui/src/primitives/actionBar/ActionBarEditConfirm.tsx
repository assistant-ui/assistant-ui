"use client";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarEditConfirm = createActionButton(
  (message, chat, [editValue, setIsEditing]) => {
    if (editValue !== false) {
      chat.editAt(message, {
        ...message,
        id: undefined,
        content: editValue,
      });
    }

    setIsEditing(false);
  },
  (_, __, [isEditing]) => isEditing !== false,
);
