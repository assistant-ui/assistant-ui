"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { createActionButton } from "../../utils/createActionButton";

export const EditBarSave = createActionButton(() => {
  const chat = useThreadContext("EditBar.Save", (s) => s.chat);
  const [editState, message, setEditState] = useMessageContext(
    "EditBar.Save",
    (s) => [s.editState, s.message, s.setEditState],
  );

  return {
    disabled: !editState.isEditing,
    onClick: () => {
      if (!editState.isEditing) return;

      chat.editAt(message, {
        ...message,
        id: undefined,
        content: editState.value,
      });

      setEditState({ isEditing: false });
    },
  };
});
