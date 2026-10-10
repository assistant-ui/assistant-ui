import { useLatestRef } from "@assistant-ui/core/react/internal";
import { useEffect, useRef } from "react";
import { isDefaultSessionTitle } from "./openCodeThreadListAdapter";

export const useOpenCodeThreadListTitleSync = (
  sessionTitle: string | undefined,
  threadListTitle: string | undefined,
  generateTitle: () => void,
  enabled: boolean,
) => {
  const latest = useLatestRef({ threadListTitle, generateTitle });
  const requestedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      !enabled ||
      sessionTitle === undefined ||
      isDefaultSessionTitle(sessionTitle) ||
      sessionTitle === latest.current.threadListTitle
    ) {
      requestedFor.current = undefined;
      return;
    }
    if (requestedFor.current === sessionTitle) return;
    requestedFor.current = sessionTitle;
    latest.current.generateTitle();
  }, [enabled, sessionTitle, latest]);
};
