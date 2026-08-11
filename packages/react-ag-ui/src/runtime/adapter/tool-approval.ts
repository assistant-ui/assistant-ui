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
 * The seam always sends `approved` and may add `reason` or `optionId`, so it can
 * only satisfy an object schema that requires nothing else. AG-UI validates a
 * resume payload against `responseSchema` and answers a mismatch with
 * `RunError`, so a schema demanding more — a required audit field, a payload
 * that is not an object, a closed schema without an `approved` property — is
 * left to the bespoke interrupt hooks, where the host builds the exact payload.
 */
const isSeamAnswerable = (schema: Record<string, unknown> | undefined) => {
  if (schema === undefined) return true;
  const { type, required, properties, additionalProperties } = schema;
  if (type !== undefined && type !== "object") return false;
  if (required !== undefined) {
    if (!Array.isArray(required)) return false;
    if (!required.every((field) => field === "approved")) return false;
  }
  if (additionalProperties === false) {
    return (
      typeof properties === "object" &&
      properties !== null &&
      "approved" in properties
    );
  }
  return true;
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
 * one response per open interrupt rather than one response per gate.
 */
export const withToolApprovalDecision = (
  content: readonly ThreadAssistantMessagePart[],
  { approvalId, approved, optionId, reason }: RespondToToolApprovalOptions,
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
        ...(optionId !== undefined && { optionId }),
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
        ...(approval.optionId !== undefined && { optionId: approval.optionId }),
        ...(approval.reason !== undefined && { reason: approval.reason }),
      },
    };
  }
  if (interrupts.some((interrupt) => !(interrupt.id in responses))) return null;
  return buildResumeArray([...interrupts], responses);
};

const settle = (
  approval: ToolApproval,
  entry: AgUiResumeEntry,
): ToolApproval | undefined => {
  // A decision this gate recorded locally but never sent is dropped rather than
  // displayed beside the settlement it contradicts: `resolution` is core's
  // terminal non-decision state, and a resolved entry carries the whole
  // decision, so stale fields the submitted payload omits must not survive it.
  const {
    approved: _approved,
    reason: _reason,
    optionId: _optionId,
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
    return undefined;
  }
  const { approved, optionId, reason } = payload as {
    approved: boolean;
    optionId?: unknown;
    reason?: unknown;
  };
  return {
    ...rest,
    approved,
    ...(typeof optionId === "string" && { optionId }),
    ...(typeof reason === "string" && { reason }),
  };
};

/**
 * Settles every gate the submitted resume array names, so the displayed outcome
 * cannot contradict the wire. A decision recorded locally is not exempt: a gate
 * approved while the batch waited on its sibling is still cancelled when
 * `steerAway` submits a cancellation for it. A gate is shown as cancelled only
 * where its own entry is cancelled; a resolved entry supplies the decision it
 * carries, and one that carries none is left alone rather than fabricated.
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
    if (!approval || approval.resolution) return part;
    const entry = byId.get(approval.id);
    if (!entry) return part;
    const settled = settle(approval, entry);
    if (!settled) return part;
    changed = true;
    return { ...part, approval: settled };
  });
  return changed ? next : content;
};
