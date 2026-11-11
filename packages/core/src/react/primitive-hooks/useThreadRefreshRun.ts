import { useCallback, useState } from "react";
import { useAui } from "@assistant-ui/store";
import { refreshCloudRun } from "../runtimes/cloud/runLeases";
import { useThreadReplyState } from "./useThreadReplyState";

/** Re-reads a thread whose reply another tab or session is generating. */
export const useThreadRefreshRun = () => {
  const aui = useAui();
  const replyState = useThreadReplyState();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    void refreshCloudRun(aui.threadListItem.getState().id)
      .catch((error: unknown) => {
        console.warn("[assistant-ui] Refreshing the run failed:", error);
      })
      .finally(() => setIsRefreshing(false));
  }, [aui]);

  return {
    refresh,
    disabled: replyState !== "in-progress" || isRefreshing,
    isRefreshing,
  };
};
