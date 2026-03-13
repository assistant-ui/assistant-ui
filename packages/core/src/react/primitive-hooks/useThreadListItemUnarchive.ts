import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";

export const useThreadListItemUnarchive = () => {
  const aui = useAui();

  const unarchive = useCallback(() => {
    aui.threadListItem().unarchive();
  }, [aui]);

  return { unarchive };
};
