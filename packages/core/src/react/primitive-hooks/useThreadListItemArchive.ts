import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";

export const useThreadListItemArchive = () => {
  const aui = useAui();

  const archive = useCallback(() => {
    void aui.threadListItem.archive().catch(() => {});
  }, [aui]);

  return { archive };
};
