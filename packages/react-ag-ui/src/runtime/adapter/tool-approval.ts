import { buildResumeArray } from "@ag-ui/client";
import type {
  RespondToToolApprovalOptions,
  ThreadAssistantMessagePart,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import type { AgUiInterrupt, AgUiResumeEntry } from "../types";

type ToolApproval = NonNullable<ToolCallMessagePart["approval"]>;

const EMPTY_APPROVALS: ReadonlyMap<string, ToolApproval> = new Map();

/**
 * Keywords that cannot reject a payload this seam emits, given the value checks
 * below. Deciding a schema by any wider rule means evaluating JSON Schema, so
 * an unlisted keyword — `properties`, `additionalProperties`, `allOf`, `$ref` —
 * makes the gate bespoke without being interpreted.
 */
const SEAM_SAFE_KEYWORDS = new Set([
  "$schema",
  "$id",
  "title",
  "description",
  "type",
  "required",
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const acceptsObject = (type: unknown) =>
  type === undefined ||
  type === "object" ||
  (Array.isArray(type) &&
    type.every((entry) => typeof entry === "string") &&
    type.includes("object"));

/**
 * The seam sends `{ approved }` and may add `reason`, so it may answer a
 * `responseSchema` only where acceptance of those exact payloads is established
 * by construction. AG-UI answers a resume payload its schema rejects with
 * `RunError`, and the host can always build the exact payload through the
 * bespoke interrupt hooks, so an undecidable schema is left to them. Only an
 * absent schema and a plain object of well-formed allowed keywords establish
 * that: a boolean schema (`false` rejects every payload), a malformed one, and
 * a keyword whose value is not the shape it interprets are all left bespoke.
 */
const isSeamAnswerable = (schema: unknown) => {
  if (schema === undefined) return true;
  if (!isPlainObject(schema)) return false;
  if (!Object.keys(schema).every((key) => SEAM_SAFE_KEYWORDS.has(key)))
    return false;
  if (!acceptsObject(schema["type"])) return false;
  const required = schema["required"];
  return (
    required === undefined ||
    (Array.isArray(required) && required.every((field) => field === "approved"))
  );
};

const isGate = (
  interrupt: AgUiInterrupt,
): interrupt is AgUiInterrupt & { toolCallId: string } =>
  interrupt.reason === "tool_call" &&
  !!interrupt.id &&
  !!interrupt.toolCallId &&
  isSeamAnswerable(interrupt.responseSchema);

const isPending = (approval: ToolCallMessagePart["approval"]) =>
  !!approval && approval.approved === undefined && !approval.resolution;

/**
 * AG-UI binds a decision to a tool call with `reason: "tool_call"`;
 * `confirmation` is a free-standing yes/no and `input_required` wants structured
 * input, so both stay on the bespoke interrupt hooks, as does a `tool_call`
 * whose `responseSchema` asks for more than this seam can send. A batch mixing a
 * gate with any other interrupt projects nothing: AG-UI resumes with one
 * response per open interrupt, so a half-owned batch cannot be completed from
 * either side alone.
 */
export const projectAgUiToolApprovals = (
  interrupts: readonly AgUiInterrupt[] | undefined,
): ReadonlyMap<string, ToolApproval> => {
  if (!interrupts?.length || !interrupts.every(isGate)) return EMPTY_APPROVALS;
  return new Map(
    interrupts.map((interrupt) => [interrupt.toolCallId, { id: interrupt.id }]),
  );
};

/**
 * Records a decision on the gated tool call. The decision is held on the part
 * until every gate in the batch is answered, because AG-UI resumes a run with
 * one response per open interrupt rather than one response per gate. A chosen
 * `optionId` is not recorded: the projection exposes an approval without
 * options, and core rejects an `optionId` absent from them, so no option can
 * reach this seam.
 */
export const withToolApprovalDecision = (
  content: readonly ThreadAssistantMessagePart[],
  { approvalId, approved, reason }: RespondToToolApprovalOptions,
): readonly ThreadAssistantMessagePart[] => {
  let changed = false;
  const next = content.map((part) => {
    if (part.type !== "tool-call") return part;
    const approval = part.approval;
    if (approval?.id !== approvalId || !isPending(approval)) return part;
    changed = true;
    return {
      ...part,
      approval: {
        ...approval,
        approved,
        ...(reason !== undefined && { reason }),
      },
    };
  });
  return changed ? next : content;
};

/**
 * Maps the recorded decisions onto AG-UI resume entries, or `null` while the
 * batch is incomplete. A denial is a resolved response carrying
 * `approved: false`, not a cancellation: `cancelled` means the user abandoned
 * the interrupt without meaningful input and carries no payload, which would
 * drop the denial reason on the wire.
 */
export const buildToolApprovalResume = (
  content: readonly ThreadAssistantMessagePart[],
  interrupts: readonly AgUiInterrupt[],
): AgUiResumeEntry[] | null => {
  const open = new Set(interrupts.map((interrupt) => interrupt.id));
  const responses: Record<string, { status: "resolved"; payload: unknown }> =
    {};
  for (const part of content) {
    if (part.type !== "tool-call") continue;
    const approval = part.approval;
    if (!approval || approval.approved === undefined) continue;
    if (!open.has(approval.id)) continue;
    responses[approval.id] = {
      status: "resolved",
      payload: {
        approved: approval.approved,
        ...(approval.reason !== undefined && { reason: approval.reason }),
      },
    };
  }
  if (interrupts.some((interrupt) => !(interrupt.id in responses))) return null;
  // The schema is dropped rather than cast: AG-UI's own interrupt type cannot
  // express a boolean schema, and `buildResumeArray` reads only the ids.
  return buildResumeArray(
    interrupts.map(({ responseSchema: _schema, ...interrupt }) => interrupt),
    responses,
  );
};

const settle = (
  approval: ToolApproval,
  entry: AgUiResumeEntry,
): ToolApproval | undefined => {
  // A decision this gate recorded locally but never sent is dropped rather than
  // displayed beside the settlement it contradicts: a submitted entry carries
  // the whole outcome, so no field of an earlier one may survive it.
  const {
    approved: _approved,
    reason: _reason,
    resolution: _resolution,
    ...rest
  } = approval;
  if (entry.status === "cancelled") {
    return { ...rest, resolution: "cancelled" };
  }
  const payload = entry.payload;
  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as { approved?: unknown }).approved !== "boolean"
  ) {
    // The entry settles the gate with no decision. Nothing is fabricated, but a
    // decision recorded locally is still dropped: the payload that went out
    // carried none, so displaying one would show what was never sent.
    return approval.approved === undefined &&
      approval.reason === undefined &&
      approval.resolution === undefined
      ? undefined
      : rest;
  }
  const { approved, reason } = payload as {
    approved: boolean;
    reason?: unknown;
  };
  return {
    ...rest,
    approved,
    ...(typeof reason === "string" && { reason }),
  };
};

/**
 * Settles every gate the submitted resume array names, so the displayed outcome
 * cannot contradict the wire. A decision recorded locally is not exempt: a gate
 * approved while the batch waited on its sibling is still cancelled when
 * `steerAway` submits a cancellation for it. A gate is shown as cancelled only
 * where its own entry is cancelled; a resolved entry supplies the decision it
 * carries, and one that carries none settles the gate with no decision rather
 * than fabricating one or keeping an unsent local decision beside it.
 *
 * A settlement always overrides an earlier one, in either direction. A resolved
 * settlement leaves no state a locally recorded decision does not also leave —
 * core's `resolution` covers only `cancelled` and `expired` — so honoring the
 * first settlement instead would mean treating an unsent local decision as
 * terminal, which is exactly what the cancellation case must override.
 */
export const withSettledToolApprovals = (
  content: readonly ThreadAssistantMessagePart[],
  resume: readonly AgUiResumeEntry[],
): readonly ThreadAssistantMessagePart[] => {
  if (resume.length === 0) return content;
  const byId = new Map(resume.map((entry) => [entry.interruptId, entry]));
  let changed = false;
  const next = content.map((part) => {
    if (part.type !== "tool-call") return part;
    const approval = part.approval;
    if (!approval) return part;
    const entry = byId.get(approval.id);
    if (!entry) return part;
    const settled = settle(approval, entry);
    if (!settled) return part;
    changed = true;
    return { ...part, approval: settled };
  });
  return changed ? next : content;
};
