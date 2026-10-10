import { useLatestRef } from "@assistant-ui/core/react/internal";
import { useEffect, useRef } from "react";

// OpenCode's `Session.isDefaultTitle` format, which a session carries until OpenCode titles it on its first prompt.
const DEFAULT_SESSION_TITLE =
  /^(New session - |Child session - )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const useOpenCodeThreadListTitleSync = (
  sessionTitle: string | undefined,
  threadListTitle: string | undefined,
  reload: () => Promise<void>,
  enabled: boolean,
) => {
  const latest = useLatestRef({ threadListTitle, reload });
  const reloadedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      !enabled ||
      sessionTitle === undefined ||
      DEFAULT_SESSION_TITLE.test(sessionTitle) ||
      sessionTitle === latest.current.threadListTitle
    ) {
      reloadedFor.current = undefined;
      return;
    }
    if (reloadedFor.current === sessionTitle) return;
    reloadedFor.current = sessionTitle;
    void latest.current.reload();
  }, [enabled, sessionTitle, latest]);
};
