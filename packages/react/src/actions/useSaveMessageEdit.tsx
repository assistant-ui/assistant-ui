import { useMessageContext } from "../utils/context/MessageContext";
import { useThreadContext } from "../utils/context/ThreadContext";

export const useSaveMessageEdit = () => {
  const chat = useThreadContext("EditBar.Save", (s) => s.chat);
  const context = useMessageContext("EditBar.Save", (s) => {
    const { message, editState, setEditState } = s;

    if (!editState.isEditing) return null;
    return { message, content: editState.value, setEditState };
  });

  if (!context) return null;

  const { message, content, setEditState } = context;
  return () => {
    chat.editAt(message, {
      ...message,
      id: undefined as unknown as string, // remove id to create a new message
      content,
    });

    setEditState({ isEditing: false });
  };
};
