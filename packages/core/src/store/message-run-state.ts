import type { ThreadMessage } from "../types/message";

/**
 * Where a stored reply's run stands when another tab or session drove it:
 * `in-progress` while that run still heartbeats, `stale` once it stopped
 * before writing anything (only a client before v0.3.35 stores such a
 * reply). Undefined for every other message, including a reply whose run
 * stopped after it wrote content: that one is an ordinary error with
 * `error.code` `run_stale`, answered again with Regenerate.
 */
export type MessageRunState = "stale" | "in-progress";

const RUN_STATES: Readonly<Record<string, MessageRunState>> = {
  run_stale: "stale",
  run_in_progress: "in-progress",
};

const isEmptyReply = (message: Pick<ThreadMessage, "content">) =>
  message.content.every(
    (part) =>
      (part.type === "text" || part.type === "reasoning") &&
      part.text.trim() === "",
  );

export const getMessageRunState = (
  message: Pick<ThreadMessage, "role" | "status" | "content">,
): MessageRunState | undefined => {
  if (message.role !== "assistant") return undefined;
  const status = message.status;
  if (status?.type !== "incomplete" || status.reason !== "error") return;
  const error = status.error;
  if (typeof error !== "object" || error === null || Array.isArray(error))
    return;
  const code = (error as { code?: unknown }).code;
  const state = typeof code === "string" ? RUN_STATES[code] : undefined;
  return state === "stale" && !isEmptyReply(message) ? undefined : state;
};
