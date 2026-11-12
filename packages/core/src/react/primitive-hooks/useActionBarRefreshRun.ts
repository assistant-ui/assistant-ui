import { useCallback, useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { actionBarRefreshRunDisabled } from "../../store/primitive-predicates";
import { refreshCloudRun } from "../runtimes/cloud/runLeases";

export const useActionBarRefreshRun = () => {
  const aui = useAui();
  const disabled = useAuiState(actionBarRefreshRunDisabled);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    void refreshCloudRun(aui.threadListItem.getState().id)
      .catch((error: unknown) => {
        console.warn("[assistant-ui] Refreshing the run failed:", error);
      })
      .finally(() => setIsRefreshing(false));
  }, [aui]);

  return { refresh, disabled: disabled || isRefreshing, isRefreshing };
};
