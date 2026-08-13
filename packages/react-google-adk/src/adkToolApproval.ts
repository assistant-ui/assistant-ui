import type {
  RespondToToolApprovalOptions,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { v4 as uuidv4 } from "uuid";
import type { AdkMessage } from "./types";

export type AdkToolApproval = NonNullable<ToolCallMessagePart["approval"]>;

export const ADK_REQUEST_CONFIRMATION = "adk_request_confirmation";

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/**
 * ADK reads a confirmation reply either directly as `{confirmed}` or through
 * its client wrapper, a lone `response` key holding the JSON text. It rejects a
 * tool whose confirmation is not explicitly truthy, so a readable reply that is
 * not `confirmed: true` is a denial. A reply it cannot read raises instead of
 * denying, leaving the gate answerable, so that projects as undecided rather
 * than settling it and blocking the retry.
 */
const readConfirmed = (content: unknown): boolean | undefined => {
  if (typeof content !== "string") return undefined;
  const response = parseJson(content);
  if (typeof response !== "object" || response === null) return undefined;

  const record = response as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 1 && keys[0] === "response") {
    const wrapped = record.response;
    if (typeof wrapped !== "string") return undefined;
    const inner = parseJson(wrapped);
    if (typeof inner !== "object" || inner === null) return undefined;
    return (inner as { confirmed?: unknown }).confirmed === true;
  }

  return record.confirmed === true;
};

/**
 * ADK's confirmation processor parses every function response in an event
 * before running any tool, so one unreadable reply aborts the event and none of
 * its siblings execute. The accumulator mints a tool message id of
 * `<eventId>:<partIndex>` per response, so that prefix is the batch ADK either
 * runs whole or not at all; a locally minted reply carries a bare uuid and is
 * its own batch.
 */
const sourceEventOf = (toolMessageId: string): string =>
  toolMessageId.replace(/:\d+$/, "");

/**
 * ADK builds the confirmation request around the call it gates, carrying that
 * call verbatim in `originalFunctionCall`.
 */
const gatedCallIdOf = (args: unknown): string | undefined => {
  if (typeof args !== "object" || args === null) return undefined;
  const original = (args as { originalFunctionCall?: unknown })
    .originalFunctionCall;
  if (typeof original !== "object" || original === null) return undefined;
  const id = (original as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
};

export type AdkToolApprovalProjection = {
  approvals: ReadonlyMap<string, AdkToolApproval>;
  /**
   * Identity of the decision state. Core re-converts a cached message object
   * only when the converter callback changes, so the callback is rebuilt when
   * this key moves rather than on every render.
   */
  key: string;
};

/**
 * ADK requests a confirmation by emitting a synthetic `adk_request_confirmation`
 * tool call carrying a fresh id, and resumes only when a reply quotes that id.
 * The gated tool's own id is never answerable, so every approval carries the
 * synthetic id — but ADK yields the gated call to the client first, in its own
 * event, so both calls sit result-less in the transcript and both would render
 * an approval control. The gated call is therefore mapped to the same approval
 * rather than left bare, which would let it answer by writing a tool result the
 * agent never produced.
 */
export const projectAdkToolApprovals = (
  messages: readonly AdkMessage[],
): AdkToolApprovalProjection => {
  const batches = new Map<
    string,
    { readable: boolean; entries: [string, boolean | undefined][] }
  >();
  for (const message of messages) {
    if (message.type !== "tool") continue;
    if (message.name !== ADK_REQUEST_CONFIRMATION) continue;
    const key = sourceEventOf(message.id);
    let batch = batches.get(key);
    if (batch === undefined) {
      batch = { readable: true, entries: [] };
      batches.set(key, batch);
    }
    const confirmed = readConfirmed(message.content);
    if (confirmed === undefined) batch.readable = false;
    batch.entries.push([message.tool_call_id, confirmed]);
  }

  const replies = new Map<string, boolean>();
  for (const batch of batches.values()) {
    for (const [toolCallId, confirmed] of batch.entries) {
      if (batch.readable && confirmed !== undefined)
        replies.set(toolCallId, confirmed);
      else replies.delete(toolCallId);
    }
  }

  const approvals = new Map<string, AdkToolApproval>();
  for (const message of messages) {
    if (message.type !== "ai") continue;
    for (const call of message.tool_calls ?? []) {
      if (call.name !== ADK_REQUEST_CONFIRMATION) continue;
      const approved = replies.get(call.id);
      const approval: AdkToolApproval = {
        id: call.id,
        ...(approved !== undefined && { approved }),
      };
      approvals.set(call.id, approval);
      // ADK yields the gated call in its own event before the confirmation is
      // requested, so that call is also in the transcript, result-less, and
      // inherits the message's `requires-action` status. Left ungated it
      // renders a second approval control with no approval behind it, which
      // answers by writing a tool result the agent never produced. The same
      // approval carries the synthetic id, so answering either one replies to
      // the gate ADK is actually waiting on.
      const gatedId = gatedCallIdOf(call.args);
      if (gatedId !== undefined) approvals.set(gatedId, approval);
    }
  }

  return {
    approvals,
    key: approvals.size === 0 ? "" : JSON.stringify([...approvals]),
  };
};

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
 * ADK confirmations are a plain confirm/reject pair, so no option or reason
 * from core has a field to land in. An id that is not an open gate would send a
 * reply ADK silently ignores, so it throws instead.
 */
export const toAdkToolConfirmationReply = (
  { approvalId, approved }: RespondToToolApprovalOptions,
  approvals: ReadonlyMap<string, AdkToolApproval>,
): AdkMessage & { type: "tool" } => {
  const approval = approvals.get(approvalId);
  if (approval === undefined || approval.approved !== undefined)
    throw new Error(
      `No pending ADK tool confirmation for approval id "${approvalId}"`,
    );

  return toAdkConfirmationReply(approvalId, approved);
};
