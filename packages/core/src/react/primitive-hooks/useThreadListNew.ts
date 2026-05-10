import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";

export const useThreadListNew = () => {
  const aui = useAui();

  const switchToNewThread = useCallback(() => {
    aui.threads().switchToNewThread();
  }, [aui]);

  return { switchToNewThread };
};
