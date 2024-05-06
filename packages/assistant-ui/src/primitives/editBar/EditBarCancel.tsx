"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { createActionButton } from "../../utils/createActionButton";

export const EditBarCancel = createActionButton(() => {
  const [isEditing, setEditState] = useMessageContext("EditBar.Cancel", (s) => [
    s.editState.isEditing,
    s.setEditState,
  ]);
  return {
    disabled: !isEditing,
    onClick: () => {
      setEditState({ isEditing: false });
    },
  };
});
