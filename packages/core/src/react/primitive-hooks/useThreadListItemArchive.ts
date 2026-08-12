import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";
import { handleThreadListAction } from "./handleThreadListAction";

export const useThreadListItemArchive = () => {
  const aui = useAui();

  const archive = useCallback(() => {
    return handleThreadListAction("archive", () =>
      aui.threadListItem.archive(),
    );
  }, [aui]);

  return { archive };
};
