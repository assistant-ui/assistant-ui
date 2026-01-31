export type ToolUILifecycleState =
  | "created"
  | "resolved"
  | "mounting"
  | "active"
  | "updating"
  | "closing"
  | "closed";

const VALID_TRANSITIONS: Record<
  ToolUILifecycleState,
  readonly ToolUILifecycleState[]
> = {
  created: ["resolved"],
  resolved: ["mounting"],
  mounting: ["active"],
  active: ["updating", "closing"],
  updating: ["active"],
  closing: ["closed"],
  closed: [],
};

export function assertValidToolUILifecycleTransition(
  from: ToolUILifecycleState,
  to: ToolUILifecycleState,
): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid Tool UI lifecycle transition: ${from} to ${to}`);
  }
}
