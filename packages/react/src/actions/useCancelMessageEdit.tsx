import { useMessageContext } from "../utils/context/MessageContext";

export const useCancelMessageEdit = () => {
  const context = useMessageContext("EditBar.Cancel", (s) => {
    const {
      editState: { isEditing },
      setEditState,
    } = s;
    if (!isEditing) return null;
    return { setEditState };
  });

  if (!context) return null;

  const { setEditState } = context;
  return () => {
    setEditState({ isEditing: false });
  };
};
