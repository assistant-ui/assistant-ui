"use client";
import { useMessageContext } from "../utils/context/MessageContext";

export const useCancelMessageEdit = () => {
  const [isEditing, setEditState] = useMessageContext("EditBar.Cancel", (s) => [
    s.editState.isEditing,
    s.setEditState,
  ]);

  if (!isEditing) return null;
  return () => {
    setEditState({ isEditing: false });
  };
};
