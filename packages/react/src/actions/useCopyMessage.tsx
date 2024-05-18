import { useMessageContext } from "../utils/context/MessageContext";

export const useCopyMessage = ({ copiedDuration = 3000 }) => {
  const { useMessage, useComposer } = useMessageContext();

  const isEditing = useComposer((s) => s.isEditing);
  if (isEditing) return null;

  return () => {
    const {
      message: { content },
      setIsCopied,
    } = useMessage.getState();

    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), copiedDuration);
  };
};
