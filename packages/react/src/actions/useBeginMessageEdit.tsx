import { useMessageContext } from "../utils/context/MessageContext";

export const useBeginMessageEdit = () => {
  const context = useMessageContext("ActionBar.Edit", (s) => {
    const {
      message: { content },
      editState: { isEditing },
      setEditState,
    } = s;
    if (isEditing) return null;
    return { content, setEditState };
  });

  if (!context) return null;

  const { content, setEditState } = context;
  return () => {
    setEditState({ isEditing: true, value: content });
  };
};
