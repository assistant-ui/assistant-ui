import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";

export const useThreadListItemArchive = () => {
  const aui = useAui();

  const archive = useCallback(() => {
    return aui.threadListItem.archive();
  }, [aui]);

  return { archive };
};
