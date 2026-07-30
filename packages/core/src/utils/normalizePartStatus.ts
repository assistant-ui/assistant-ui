import type {
  MessagePartStatus,
  MessagePartStreamStatus,
  ThreadAssistantMessagePart,
  ThreadUserMessagePart,
} from "../types/message";

export const COMPLETE_STATUS: MessagePartStatus = Object.freeze({
  type: "complete",
});
export const RUNNING_STATUS: MessagePartStatus = Object.freeze({
  type: "running",
});
type IncompleteMessagePartStatus = Extract<
  MessagePartStreamStatus,
  { readonly type: "incomplete" }
>;
const INCOMPLETE_STATUSES: Readonly<
  Record<IncompleteMessagePartStatus["reason"], IncompleteMessagePartStatus>
> = Object.freeze({
  cancelled: Object.freeze({ type: "incomplete", reason: "cancelled" }),
  length: Object.freeze({ type: "incomplete", reason: "length" }),
  "content-filter": Object.freeze({
    type: "incomplete",
    reason: "content-filter",
  }),
  other: Object.freeze({ type: "incomplete", reason: "other" }),
  error: Object.freeze({ type: "incomplete", reason: "error" }),
});

export const normalizePartStatus = (
  part: ThreadUserMessagePart | ThreadAssistantMessagePart,
): MessagePartStatus | undefined => {
  const status = (part as { readonly status?: unknown }).status;
  if (!status || typeof status !== "object") return undefined;

  const { type } = status as { readonly type?: unknown };
  if (type === "running") return RUNNING_STATUS;
  if (type === "complete") return COMPLETE_STATUS;
  if (type !== "incomplete") return undefined;

  const { reason } = status as {
    readonly reason?: unknown;
  };
  const normalizedReason: IncompleteMessagePartStatus["reason"] =
    reason === "cancelled" ||
    reason === "length" ||
    reason === "content-filter" ||
    reason === "other" ||
    reason === "error"
      ? reason
      : "other";

  return INCOMPLETE_STATUSES[normalizedReason];
};
