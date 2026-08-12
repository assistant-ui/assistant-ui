import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";
import { handleThreadListAction } from "./handleThreadListAction";

export const useThreadListNew = () => {
  const aui = useAui();

  const switchToNewThread = useCallback(() => {
    return handleThreadListAction("create", () =>
      aui.threads.switchToNewThread(),
    );
  }, [aui]);

  return { switchToNewThread };
};
