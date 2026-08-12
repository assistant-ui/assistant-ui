import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";
import { handleThreadListAction } from "./handleThreadListAction";

export const useThreadListItemUnarchive = () => {
  const aui = useAui();

  const unarchive = useCallback(() => {
    return handleThreadListAction("unarchive", () =>
      aui.threadListItem.unarchive(),
    );
  }, [aui]);

  return { unarchive };
};
