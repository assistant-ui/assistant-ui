import { currentPlan, type Checkout } from "@/lib/checkout/protocol";

export type SetupStageId =
  | "order"
  | "connect"
  | "plan"
  | "build"
  | "verify"
  | "complete";

export const setupStageForPhase = (phase: Checkout.Status): SetupStageId => {
  switch (phase) {
    case "waiting":
      return "connect";
    case "planning":
      return "plan";
    case "installing":
      return "build";
    case "done":
    case "cancelled":
      return "complete";
  }
};

export function setupStages(
  state: Checkout.State | undefined,
  ordered: boolean,
) {
  const complete = state?.status === "done";
  const cancelled = state?.status === "cancelled";
  const connected = state !== undefined && state.agent.lastSeenAt !== null;
  const planned =
    state !== undefined && currentPlan(state)?.status === "approved";
  const current =
    cancelled || complete
      ? -1
      : !ordered
        ? 0
        : !connected || state?.status === "waiting"
          ? 1
          : planned
            ? 3
            : 2;
  const milestones = [
    {
      id: "order" as const,
      label: "Order",
      activeLabel: "Ordering",
      completedLabel: "Ordered",
      done: ordered,
    },
    {
      id: "connect" as const,
      label: "Connect agent",
      activeLabel: "Connecting agent",
      completedLabel: "Agent connected",
      done: connected,
    },
    {
      id: "plan" as const,
      label: "Plan",
      activeLabel: "Planning",
      completedLabel: "Plan approved",
      done: planned,
    },
    {
      id: "build" as const,
      label: "Build",
      activeLabel: "Building",
      completedLabel: "Built",
      done: complete,
    },
    {
      id: "verify" as const,
      label: "Test and Approve",
      activeLabel: "Testing and Approving",
      completedLabel: "Tested & Approved",
      done: false,
    },
    {
      id: "complete" as const,
      label: "Complete",
      activeLabel: "Completing",
      completedLabel: "Complete",
      done: complete,
    },
  ];

  return milestones.map((milestone, index) => ({
    id: milestone.id,
    label: milestone.done
      ? milestone.completedLabel
      : index === current
        ? milestone.activeLabel
        : milestone.label,
    active: index === current,
    done: milestone.done,
    unrecorded: milestone.id === "verify" && complete,
  }));
}
