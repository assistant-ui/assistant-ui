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

type AdkConfirmationRead = {
  /**
   * False only where ADK raises reading the reply, which aborts every function
   * response in the same event rather than denying this one.
   */
  readable: boolean;
  /** Undefined where ADK records no confirmation and the gate stays open. */
  confirmed: boolean | undefined;
};

/**
 * The value the transport puts on `functionResponse.response`: the reply
 * content parsed, or the raw text where it is not JSON.
 */
const wireResponseOf = (content: string): unknown => {
  const parsed = parseJson(content);
  return parsed === undefined ? content : parsed;
};

/**
 * Mirrors ADK's own reading of a confirmation reply, whose three outcomes the
 * gate has to distinguish. A falsy response records nothing, so the gate stays
 * open and its siblings are untouched. Otherwise ADK either unwraps its client
 * wrapper — a lone `response` key whose value it parses as JSON text — or reads
 * `confirmed` off the response directly, and resumes the tool unconfirmed
 * (a denial) for anything that is not explicitly `true`; a bare string, number,
 * or array is such a denial, not an unreadable reply. Only where that reading
 * raises is the reply unreadable, and the raise is uncaught in ADK, so the
 * whole event it belongs to is abandoned.
 */
const readConfirmation = (content: unknown): AdkConfirmationRead => {
  if (typeof content !== "string")
    return { readable: false, confirmed: undefined };
  const response = wireResponseOf(content);
  try {
    if (!response) return { readable: true, confirmed: undefined };
    const record = response as Record<string, unknown>;
    const decide = (value: unknown) =>
      typeof value === "object" &&
      value !== null &&
      (value as { confirmed?: unknown }).confirmed === true;
    // `in` raises on a primitive response, as ADK's own wrapper test does.
    if (Object.keys(record).length === 1 && "response" in record) {
      const inner = parseJson(String(record.response));
      // ADK parses the wrapped text without a `try`, so it raises here.
      if (inner === undefined) return { readable: false, confirmed: undefined };
      if (!inner) return { readable: true, confirmed: undefined };
      return { readable: true, confirmed: decide(inner) };
    }
    return { readable: true, confirmed: decide(record) };
  } catch {
    return { readable: false, confirmed: undefined };
  }
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
 * call verbatim in `originalFunctionCall` — spelled `original_function_call` by
 * ADK Python, which the accumulator reads the same way.
 */
const gatedCallIdOf = (args: unknown): string | undefined => {
  if (typeof args !== "object" || args === null) return undefined;
  const record = args as {
    originalFunctionCall?: unknown;
    original_function_call?: unknown;
  };
  const original = record.originalFunctionCall ?? record.original_function_call;
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
    const { readable, confirmed } = readConfirmation(message.content);
    if (!readable) batch.readable = false;
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
