import { useLatestRef } from "@assistant-ui/core/react/internal";
import { useReplaySafeEffect } from "@assistant-ui/store/internal";

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

  useReplaySafeEffect(() => {
    if (!enabled || sessionTitle === undefined) return;
    if (DEFAULT_SESSION_TITLE.test(sessionTitle)) return;
    if (sessionTitle === latest.current.threadListTitle) return;
    void latest.current.reload();
  }, [enabled, sessionTitle, latest]);
};
