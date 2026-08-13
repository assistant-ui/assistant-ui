import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";

export const useThreadListItemTrigger = () => {
  const aui = useAui();

  const switchTo = useCallback(() => {
    return aui.threadListItem.switchTo();
  }, [aui]);

  return { switchTo };
};
