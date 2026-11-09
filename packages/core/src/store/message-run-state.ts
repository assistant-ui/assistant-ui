import type { ThreadMessage } from "../types/message";

/**
 * Where a stored message's run stands when another tab or session drove it:
 * `in_progress` while that run still heartbeats, `stale` once it stopped
 * before finishing. Undefined for every other message.
 */
export type MessageRunState = "stale" | "in_progress";

const RUN_STATES: Readonly<Record<string, MessageRunState>> = {
  run_stale: "stale",
  run_in_progress: "in_progress",
};

export const getMessageRunState = (
  message: Pick<ThreadMessage, "role" | "status">,
): MessageRunState | undefined => {
  if (message.role !== "assistant") return undefined;
  const status = message.status;
  if (status?.type !== "incomplete" || status.reason !== "error") return;
  const error = status.error;
  if (typeof error !== "object" || error === null || Array.isArray(error))
    return;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? RUN_STATES[code] : undefined;
};
