import { useCallback } from "react";
import { useThreadContext } from "../../context";

export const useThreadScrollToBottom = () => {
  const { useViewport } = useThreadContext();

  const isAtBottom = useViewport((s) => s.isAtBottom);

  const handleScrollToBottom = useCallback(() => {
    const { scrollToBottom } = useViewport.getState();
    scrollToBottom();
  }, [useViewport]);

  if (isAtBottom) return null;
  return handleScrollToBottom;
};
