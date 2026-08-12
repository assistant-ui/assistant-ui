import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";
import { handleThreadListAction } from "./handleThreadListAction";

export const useThreadListItemTrigger = () => {
  const aui = useAui();

  const switchTo = useCallback(() => {
    return handleThreadListAction("switch", () =>
      aui.threadListItem.switchTo(),
    );
  }, [aui]);

  return { switchTo };
};
