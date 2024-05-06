"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarEdit = createActionButton(() => {
  const [editState, messageContent, setEditState] = useMessageContext(
    "ActionBar.Edit",
    (s) => [s.editState, s.message.content, s.setEditState],
  );
  return {
    disabled: editState.isEditing,
    onClick: () => setEditState({ isEditing: true, value: messageContent }),
  };
});
