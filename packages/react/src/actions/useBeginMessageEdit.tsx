"use client";
import { useMessageContext } from "../utils/context/MessageContext";

export const useBeginMessageEdit = () => {
  const [editState, messageContent, setEditState] = useMessageContext(
    "ActionBar.Edit",
    (s) => [s.editState, s.message.content, s.setEditState],
  );

  if (editState.isEditing) return null;
  return () => {
    setEditState({ isEditing: true, value: messageContent });
  };
};
