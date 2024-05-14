"use client";
import { useMessageContext } from "../utils/context/MessageContext";

export const useCopyMessage = ({ copiedDuration = 3000 }) => {
  const [messageContent, setIsCopied] = useMessageContext(
    "ActionBar.Copy",
    (s) => [s.message.content, s.setIsCopied],
  );

  return () => {
    navigator.clipboard.writeText(messageContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), copiedDuration);
  };
};
