import { useCallback, useSyncExternalStore } from "react";
import { useAuiState } from "@assistant-ui/store";
import {
  getThreadReplyState,
  subscribeThreadReplyState,
  type ThreadReplyState,
} from "../../store/thread-reply-state";

/**
 * Where the reply to the thread's last message stands when that message is
 * the user's and this tab is not running it: `in-progress` while another tab
 * or session is generating it, `interrupted` once nothing is (show Resume).
 * Undefined otherwise, and for runtimes that do not report runs; Assistant
 * Cloud does.
 */
export const useThreadReplyState = (): ThreadReplyState | undefined => {
  const threadItemId = useAuiState((s) => s.optional.threadListItem?.id);
  const subscribe = useCallback(
    (listener: () => void) => subscribeThreadReplyState(threadItemId, listener),
    [threadItemId],
  );
  const read = () => getThreadReplyState(threadItemId);
  return useSyncExternalStore(subscribe, read, read);
};
