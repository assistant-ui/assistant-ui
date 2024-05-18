import { useMessageContext } from "../utils/context/MessageContext";

export const useBeginMessageEdit = () => {
  const { useMessage, useComposer } = useMessageContext();

  // TODO compose into one hook call
  const isUser = useMessage((s) => s.message.role === "user");
  const isEditing = useComposer((s) => s.isEditing);

  if (!isUser || isEditing) return null;

  return () => {
    const { edit } = useComposer.getState();
    edit();
  };
};
