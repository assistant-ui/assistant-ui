/**
 * Host-UI helpers — the browser-side half of Pi's human-in-the-loop surface.
 *
 * Pi has no built-in approval system; the only gate is an extension/tool calling
 * `ctx.ui.confirm / select / input / editor`. Each blocking call surfaces as a
 * `PiHostUiRequest`. This module is pure and browser-safe:
 *
 * - `splitHostUiRequests` partitions pending requests into **tool-associated**
 *   (carry a `toolCallId` the supervisor stamped under single-tool causality →
 *   projected as native `approval`/`interrupt`) and **free-standing** (no
 *   `toolCallId` → the always-works side channel, `usePiHostUiRequests`).
 *   The browser never *infers* `toolCallId`; it only honors what the supervisor
 *   set (the supervisor never stamps it while multiple tools run).
 * - The `responseFor*` helpers map a UI answer back onto the verified Pi
 *   response semantics (`extensions/types.d.ts`):
 *     confirm  → boolean   (cancel/timeout = false = deny; no "cancelled" channel)
 *     select / input / editor → string | undefined  (undefined = dismissed)
 *
 * Browser-safe; imports no `@earendil-works/pi-*` packages.
 */

import type { PiHostUiRequest, PiHostUiResponse } from "../types";

export interface SplitHostUiRequests {
  /** Requests the supervisor correlated to a single executing tool, keyed by
   * `toolCallId`. Projected onto the tool-call part as approval/interrupt. */
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
    if (request.toolCallId !== undefined) {
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

/** A `confirm` request maps to a boolean. assistant-ui's native approval answer
 * (`{ approvalId, approved }`) lands here. Cancel = `approved: false` = deny
 * (Pi collapses cancel/timeout into `false`). */
export const responseForApproval = (
  requestId: string,
  approved: boolean,
): PiHostUiResponse => ({ requestId, confirmed: approved });

/** Shape the UI may hand back when resolving a `select`/`input`/`editor`
 * interrupt: a bare string value, or an object carrying a value / a dismissal. */
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
 * interrupt as dismissed-without-value. */
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
