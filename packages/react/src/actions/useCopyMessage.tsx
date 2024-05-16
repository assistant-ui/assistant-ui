import { useMessageContext } from "../utils/context/MessageContext";

export const useCopyMessage = ({ copiedDuration = 3000 }) => {
  const context = useMessageContext("ActionBar.Copy", (s) => {
    const {
      editState: { isEditing },
      message: { content },
      setIsCopied,
    } = s;
    if (isEditing) return null;
    return { content, setIsCopied };
  });

  if (!context) return null;

  const { content, setIsCopied } = context;
  return () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), copiedDuration);
  };
};
