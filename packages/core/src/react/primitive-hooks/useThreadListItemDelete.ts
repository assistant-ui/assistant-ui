import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";
import { handleThreadListAction } from "./handleThreadListAction";

export const useThreadListItemDelete = () => {
  const aui = useAui();

  const deleteThread = useCallback(() => {
    return handleThreadListAction("delete", () => aui.threadListItem.delete());
  }, [aui]);

  return { delete: deleteThread };
};
