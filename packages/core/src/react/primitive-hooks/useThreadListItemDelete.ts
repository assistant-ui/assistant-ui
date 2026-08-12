import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";

export const useThreadListItemDelete = () => {
  const aui = useAui();

  const deleteThread = useCallback(() => {
    void aui.threadListItem.delete().catch(() => {});
  }, [aui]);

  return { delete: deleteThread };
};
