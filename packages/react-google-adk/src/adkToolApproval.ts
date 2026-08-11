import type { ToolCallMessagePart } from "@assistant-ui/core";
import type { RespondToToolApprovalOptions } from "@assistant-ui/core";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { v4 as uuidv4 } from "uuid";
import type { AdkMessage, AdkToolConfirmation } from "./types";

export type AdkToolApproval = NonNullable<ToolCallMessagePart["approval"]>;

const ADK_REQUEST_CONFIRMATION = "adk_request_confirmation";

const EMPTY_APPROVALS: ReadonlyMap<string, AdkToolApproval> = new Map();

const readConfirmed = (content: unknown): boolean | undefined => {
  if (typeof content !== "string") return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const confirmed = (parsed as { confirmed?: unknown }).confirmed;
  return typeof confirmed === "boolean" ? confirmed : undefined;
};

/**
 * Projects ADK tool confirmations onto core's approval gate, keyed by the tool
 * call id the confirmation is answered with.
 *
 * A confirmation answered by an `adk_request_confirmation` reply settles to
 * that reply's decision. A confirmation whose call already carries some other
 * result settles as `cancelled`: the gate is closed, but nothing in the
 * transcript records which way the user decided.
 */
export const projectAdkToolApprovals = (
  messages: readonly AdkMessage[],
  confirmations: readonly AdkToolConfirmation[],
): ReadonlyMap<string, AdkToolApproval> => {
  if (confirmations.length === 0) return EMPTY_APPROVALS;

  const confirmationReplies = new Map<string, AdkMessage & { type: "tool" }>();
  const otherReplies = new Set<string>();
  for (const message of messages) {
    if (message?.type !== "tool") continue;
    const toolCallId = message.tool_call_id;
    if (typeof toolCallId !== "string" || toolCallId === "") continue;
    if (message.name === ADK_REQUEST_CONFIRMATION) {
      confirmationReplies.set(toolCallId, message);
    } else {
      otherReplies.add(toolCallId);
    }
  }

  const approvals = new Map<string, AdkToolApproval>();
  for (const confirmation of confirmations) {
    const id = confirmation?.toolCallId;
    if (typeof id !== "string" || id === "") continue;

    const reply = confirmationReplies.get(id);
    if (reply !== undefined) {
      const confirmed = readConfirmed(reply.content);
      approvals.set(
        id,
        confirmed === undefined
          ? { id, resolution: "cancelled" }
          : { id, approved: confirmed },
      );
      continue;
    }

    if (otherReplies.has(id)) {
      approvals.set(id, { id, resolution: "cancelled" });
      continue;
    }

    approvals.set(
      id,
      confirmation.confirmed === true ? { id, approved: true } : { id },
    );
  }
  return approvals;
};

/**
 * Identity of a projection's decision state, so a converter closure is rebuilt
 * only when an approval appears, settles, or disappears.
 */
export const adkToolApprovalsKey = (
  approvals: ReadonlyMap<string, AdkToolApproval>,
): string =>
  [...approvals.values()]
    .map((a) => `${a.id}:${a.approved ?? ""}:${a.resolution ?? ""}`)
    .join(",");

export const toAdkConfirmationReply = (
  toolCallId: string,
  confirmed: boolean,
  payload?: ReadonlyJSONValue,
): AdkMessage & { type: "tool" } => ({
  id: uuidv4(),
  type: "tool",
  tool_call_id: toolCallId,
  name: ADK_REQUEST_CONFIRMATION,
  content: JSON.stringify({
    confirmed,
    ...(payload != null && { payload }),
  }),
  status: "success",
});

/**
 * Maps a core approval decision onto the ADK confirmation reply. ADK
 * confirmations are a plain confirm/reject pair, so no option or reason from
 * core has a field to land in.
 */
export const toAdkToolConfirmationReply = (
  { approvalId, approved }: RespondToToolApprovalOptions,
  approvals: ReadonlyMap<string, AdkToolApproval>,
): AdkMessage & { type: "tool" } => {
  const approval = approvals.get(approvalId);
  if (
    approval === undefined ||
    approval.approved !== undefined ||
    approval.resolution !== undefined
  )
    throw new Error(
      `No pending ADK tool confirmation for approval id "${approvalId}"`,
    );

  return toAdkConfirmationReply(approvalId, approved);
};
