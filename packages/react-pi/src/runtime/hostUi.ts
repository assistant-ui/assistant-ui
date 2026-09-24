/**
 * Host-UI helpers — the browser-side half of Pi's human-in-the-loop surface.
 *
 * Pi has no built-in approval system; the only gate is an extension/tool calling
 * `ctx.ui.confirm / select / input / editor`. Each blocking call surfaces as a
 * `PiHostUiRequest`. This module is pure and browser-safe:
 *
 * - `splitHostUiRequests` partitions pending requests into **tool-associated**
 *   (carry a `toolCallId` the supervisor stamped under single-tool causality
 *   and an approval can answer them → projected as the tool call's `approval`)
 *   and **free-standing** (no `toolCallId`, or no approval that can answer them
 *   → the always-works side channel, `usePiHostUiRequests`).
 *   The browser never *infers* `toolCallId`; it only honors what the supervisor
 *   set (the supervisor never stamps it while multiple tools run).
 * - The `responseFor*` helpers map a UI answer back onto the verified Pi
 *   response semantics (`extensions/types.d.ts`):
 *     confirm  → boolean   (cancel/timeout = false = deny; no "cancelled" channel)
 *     select / input / editor → string | undefined  (undefined = dismissed)
 *
 * Browser-safe; imports no `@earendil-works/pi-*` packages.
 */

import type {
  RespondToToolApprovalOptions,
  ToolCallMessagePart,
} from "@assistant-ui/react";
import type { PiHostUiRequest, PiHostUiResponse } from "../types";

export interface SplitHostUiRequests {
  /** Requests the supervisor correlated to a single executing tool that an
   * approval can answer, keyed by `toolCallId`. Projected onto the tool-call
   * part as its approval. */
  toolAssociated: Map<string, PiHostUiRequest>;
  /** Everything else — rendered through the side channel. */
  freeStanding: PiHostUiRequest[];
}

export const splitHostUiRequests = (
  requests: readonly PiHostUiRequest[],
): SplitHostUiRequests => {
  const toolAssociated = new Map<string, PiHostUiRequest>();
  const freeStanding: PiHostUiRequest[] = [];

  for (const request of requests) {
    if (request.toolCallId !== undefined && approvalForRequest(request)) {
      // If two requests ever claim the same toolCallId, the first wins; the
      // supervisor's single-tool causality rule should prevent this.
      if (!toolAssociated.has(request.toolCallId)) {
        toolAssociated.set(request.toolCallId, request);
      } else {
        freeStanding.push(request);
      }
    } else {
      freeStanding.push(request);
    }
  }

  return { toolAssociated, freeStanding };
};

/** A `confirm` request maps to a boolean. Cancel = `approved: false` = deny
 * (Pi collapses cancel/timeout into `false`). */
export const responseForApproval = (
  requestId: string,
  approved: boolean,
): PiHostUiResponse => ({ requestId, confirmed: approved });

/** A tool-associated request as the tool call's approval: `confirm` asks for a
 * decision, `select` for one of its options (option ids are indexes), and
 * `input`/`editor` for a text answer. A request the approval cannot answer (a
 * `select` without choices, or a kind this client does not know) has none and
 * stays on the side channel. The question kinds are projected dismissible
 * because Pi resolves a cancelled request with `undefined`. */
export const approvalForRequest = (
  request: PiHostUiRequest,
): ToolCallMessagePart["approval"] => {
  switch (request.kind) {
    case "confirm":
      return { id: request.id, prompt: `${request.title}\n${request.message}` };
    case "select":
      if (request.options.length === 0) return undefined;
      return {
        id: request.id,
        prompt: request.title,
        display: "select",
        dismissible: true,
        options: request.options.map((label, index) => ({
          id: String(index),
          kind: `_${index}`,
          label,
        })),
      };
    case "input":
    case "editor":
      return {
        id: request.id,
        prompt: request.title,
        display: "text",
        dismissible: true,
      };
  }
};

/** Maps an answer to the approval a tool-associated request projects as onto
 * the Pi response. A refusal dismisses a `select`/`input`/`editor` request; any
 * other answer has to carry the option or text the request asked for. */
export const responseForToolApproval = (
  request: PiHostUiRequest,
  response: RespondToToolApprovalOptions,
): PiHostUiResponse => {
  if (request.kind === "confirm") {
    return responseForApproval(request.id, response.approved);
  }
  if (!response.approved) return { requestId: request.id, dismissed: true };

  const value =
    request.kind === "select"
      ? request.options.find((_, index) => String(index) === response.optionId)
      : response.text;
  if (value === undefined) {
    throw new Error(
      `Pi ${request.kind} request "${request.id}" was not answered with ${
        request.kind === "select" ? "one of its options" : "text"
      }`,
    );
  }
  return { requestId: request.id, value };
};

/** Shape the UI may hand back when resolving a `select`/`input`/`editor`
 * request by value: a bare string, or an object carrying a value / a dismissal. */
export type PiInterruptAnswer =
  | string
  | { value?: string | null; dismissed?: boolean }
  | null
  | undefined;

const readAnswerValue = (answer: PiInterruptAnswer): string | undefined => {
  if (typeof answer === "string") return answer;
  if (answer != null && typeof answer === "object") {
    if (answer.dismissed) return undefined;
    if (typeof answer.value === "string") return answer.value;
  }
  return undefined;
};

/** `select`/`input`/`editor` map to `string | undefined`. A concrete string is a
 * chosen value; anything else (null/undefined/`{dismissed}`) resolves the
 * request as dismissed-without-value. */
export const responseForInterrupt = (
  requestId: string,
  answer: PiInterruptAnswer,
): PiHostUiResponse => {
  const value = readAnswerValue(answer);
  return value !== undefined
    ? { requestId, value }
    : { requestId, dismissed: true };
};

/** Generic answer → response, dispatching on the request kind. Used by the side
 * channel where a single handler answers any pending request. */
export const responseForRequest = (
  request: PiHostUiRequest,
  answer: boolean | PiInterruptAnswer,
): PiHostUiResponse => {
  if (request.kind === "confirm") {
    return responseForApproval(request.id, answer === true);
  }
  return responseForInterrupt(request.id, answer as PiInterruptAnswer);
};
