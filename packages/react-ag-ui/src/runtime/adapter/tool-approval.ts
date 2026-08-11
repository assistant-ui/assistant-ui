import type {
  RespondToToolApprovalOptions,
  ThreadAssistantMessagePart,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import type { AgUiInterrupt, AgUiResumeEntry } from "../types";

export type AgUiToolApproval = NonNullable<ToolCallMessagePart["approval"]>;

const CONFIRMATION_REASON = "confirmation";

const EMPTY_APPROVALS: ReadonlyMap<string, AgUiToolApproval> = new Map();

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value !== "";

/**
 * An interrupt is a tool approval gate when it asks for a confirmation and
 * names the tool call it gates. Every other reason (`input_required`, a
 * provider-specific reason, a confirmation with no tool call) stays on the
 * bespoke interrupt hooks.
 */
export const isToolApprovalInterrupt = (
  interrupt: AgUiInterrupt | undefined | null,
): interrupt is AgUiInterrupt & { toolCallId: string } =>
  !!interrupt &&
  interrupt.reason === CONFIRMATION_REASON &&
  isNonEmptyString(interrupt.id) &&
  isNonEmptyString(interrupt.toolCallId);

/**
 * Projects the open confirmation interrupts onto core's approval gate, keyed
 * by the tool call each one gates. The gate carries the interrupt's id, which
 * is what a resume entry is addressed to.
 */
export const projectAgUiToolApprovals = (
  interrupts: readonly AgUiInterrupt[] | undefined,
): ReadonlyMap<string, AgUiToolApproval> => {
  if (!interrupts?.length) return EMPTY_APPROVALS;

  const approvals = new Map<string, AgUiToolApproval>();
  for (const interrupt of interrupts) {
    if (!isToolApprovalInterrupt(interrupt)) continue;
    approvals.set(interrupt.toolCallId, { id: interrupt.id });
  }
  return approvals.size === 0 ? EMPTY_APPROVALS : approvals;
};

export const findToolApprovalInterrupt = (
  interrupts: readonly AgUiInterrupt[],
  approvalId: string,
): (AgUiInterrupt & { toolCallId: string }) | undefined =>
  interrupts.find(
    (interrupt): interrupt is AgUiInterrupt & { toolCallId: string } =>
      isToolApprovalInterrupt(interrupt) && interrupt.id === approvalId,
  );

const isPending = (approval: AgUiToolApproval | undefined): boolean =>
  !!approval && approval.approved === undefined && !approval.resolution;

/**
 * Records a decision on the gated tool call. The decision is held on the part
 * until every interrupt in the batch is answered, because AG-UI resumes a run
 * with one response per open interrupt rather than one response per gate.
 * Returns the same array when nothing matched.
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
 * Closes the gates that are still open, for a batch that settled without a
 * decision reaching the part: the interrupts were answered through the bespoke
 * hooks, or discarded by `steerAway`.
 */
export const withClosedToolApprovals = (
  content: readonly ThreadAssistantMessagePart[],
): readonly ThreadAssistantMessagePart[] => {
  let changed = false;
  const next = content.map((part) => {
    if (part.type !== "tool-call" || !isPending(part.approval)) return part;
    changed = true;
    return {
      ...part,
      approval: { ...part.approval!, resolution: "cancelled" as const },
    };
  });
  return changed ? next : content;
};

/**
 * Maps the decisions recorded on the parts onto AG-UI resume entries, or
 * `null` while the batch is incomplete. `resolved` and `cancelled` are the only
 * outcomes AG-UI's resume vocabulary can express, so an approval resumes the
 * run and a denial cancels the interrupt; a denial reason has no field to land
 * in and stays on the part.
 */
export const collectToolApprovalResume = (
  content: readonly ThreadAssistantMessagePart[],
  interrupts: readonly AgUiInterrupt[],
): AgUiResumeEntry[] | null => {
  const decisions = new Map<string, boolean>();
  for (const part of content) {
    if (part.type !== "tool-call") continue;
    const approval = part.approval;
    if (!approval || approval.approved === undefined) continue;
    decisions.set(approval.id, approval.approved);
  }

  const resume: AgUiResumeEntry[] = [];
  for (const interrupt of interrupts) {
    if (!isToolApprovalInterrupt(interrupt)) return null;
    const approved = decisions.get(interrupt.id);
    if (approved === undefined) return null;
    resume.push({
      interruptId: interrupt.id,
      status: approved ? "resolved" : "cancelled",
    });
  }
  return resume;
};
