import { useMessageContext } from "../utils/context/useMessageContext";

export const useCopyMessage = ({ copiedDuration = 3000 }) => {
  const { useMessage, useComposer } = useMessageContext();

  const isEditing = useComposer((s) => s.isEditing);
  if (isEditing) return null;

  return () => {
    const { message, setIsCopied } = useMessage.getState();

    // TODO image/ui support
    if (message.content[0]?.type !== "text")
      throw new Error("Copying is only supported for text-only messages");

    navigator.clipboard.writeText(message.content[0].text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), copiedDuration);
  };
};
