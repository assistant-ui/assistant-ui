import { useCallback } from "react";
import { useThreadContext } from "../../context";

export const useThreadScrollToBottom = () => {
  const { useComposer, useViewport } = useThreadContext();

  const isAtBottom = useViewport((s) => s.isAtBottom);

  const handleScrollToBottom = useCallback(() => {
    useViewport.getState().scrollToBottom();
    useComposer.getState().focus();
  }, [useViewport, useComposer]);

  if (isAtBottom) return null;
  return handleScrollToBottom;
};
