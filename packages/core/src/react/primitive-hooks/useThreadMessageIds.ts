import { useRef } from "react";
import { useAuiState } from "@assistant-ui/store";

const useThreadMessageIds = (): readonly string[] => {
  const messages = useAuiState((s) => s.thread.messages);
  const prevIdsRef = useRef<readonly string[]>([]);

  const ids = messages.map((m) => m.id);
  const prev = prevIdsRef.current;
  if (prev.length !== ids.length || prev.some((id, i) => id !== ids[i])) {
    prevIdsRef.current = ids;
  }

  return prevIdsRef.current;
};

/**
 * Returns the ids of the messages in the current thread, in order.
 *
 * The returned array keeps a stable identity across content-only updates (e.g.
 * streaming), changing reference only when the id sequence itself changes. Pair
 * with `ThreadPrimitive.Unstable_MessageById` to drive a virtualized or custom
 * message list.
 *
 * @deprecated Unstable / Experimental - may change in any release.
 */
export const unstable_useThreadMessageIds = useThreadMessageIds;
